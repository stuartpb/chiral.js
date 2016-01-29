function chiral(opts) {
  "use strict";
  var transformListener, startListener, endListener;
  if (typeof opts == 'function') {
    transformListener = opts;
  } else {
    transformListener = opts.transform;
    startListener = opts.down;
    endListener = opts.up;
  }

  var points = [];

  var lastCentroidX;
  var lastCentroidY;
  var thisCentroidX;
  var thisCentroidY;
  var lastArea;
  var thisArea;

  function findPointId(id) {
    for (var i = 0; i < points.length; ++i) {
      if (points[i].id === id) {
        return i;
      }
    }
    return null;
  }

  function angleFromFirstPoint(point) {
    return Math.atan2(
      point.y - points[0].y, point.x - points[0].x) + Math.PI;
  }

  function polyInsert(thisPoint) {
    var limit = points.length - 1;
    var inserted = false;
    var thisAngle;
    if (thisPoint.y < points[0].y ||
      (thisPoint.y == points[0].y && thisPoint.x < points[0].x)) {

      points.unshift(thisPoint);
      inserted = true;
    } else {
      thisAngle = angleFromFirstPoint(thisPoint);
    }
    var point0 = points[0];
    var point1 = points[1];
    var x0, y0, x1, y1;
    function shortxy() {
      x0 = point0.x;
      y0 = point0.y;
      x1 = point1.x;
      y1 = point1.y;
    }
    function iterate() {
      var a = x0*y1 - x1*y0;
      lastArea += a;
      lastCentroidX += (x0 + x1)*a;
      lastCentroidY += (y0 + y1)*a;
    }
    shortxy();
    lastArea = x0*y1 - x1*y0;
    lastCentroidX = (x0 + x1)*lastArea;
    lastCentroidY = (y0 + y1)*lastArea;
    for (var i = 1; i < limit; ++i) {
      point0 = points[i];
      if (!inserted) {
        var nextAngle = angleFromFirstPoint(point0);
        if (thisAngle < nextAngle ||
          thisAngle == nextAngle && thisPoint.y < point0.y) {

          point1 = point0;
          point0 = thisPoint;
          points.splice(i, 0, thisPoint);
          inserted = true;
          ++limit;
        } else {
          point1 = points[i+1];
        }
      } else {
        point1 = points[i+1];
      }

      shortxy();
      iterate();
    }
    if (!inserted) {
      points[++limit] = thisPoint;
    }
    point0 = points[limit];
    point1 = points[0];
    shortxy();
    iterate();
    lastArea *= 0.5;
    lastCentroidX /= (6.0*lastArea);
    lastCentroidY /= (6.0*lastArea);
  }

  function insert(e) {
    var thisPoint = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY
    };
    if (points.length == 0) {
      points[0] = thisPoint;
    } else if (points.length == 1) {
      if (thisPoint.y < points[0].y ||
        thisPoint.y == points[0].y && thisPoint.x < points[0].x) {

        points[1] = points[0];
        points[0] = thisPoint;
      } else {
        points[1] = thisPoint;
      }

      lastCentroidX = (points[0].x + points[1].x) / 2;
      lastCentroidY = (points[1].y + points[0].y) / 2;
      // for lines "area" is the square length
      lastArea = Math.abs(points[1].x - points[0].x) +
        (points[1].y - points[0].y); // y can't be negative because of sort
    } else {
      return polyInsert(thisPoint);
    }
  }

  function polyAdjust(thisPointIndex, thisX, thisY) {
    var i;
    var moving = true;
    var thisPoint = points[thisPointIndex];
    var lastX = thisPoint.x;
    var lastY = thisPoint.y;
    thisPoint.x = thisX;
    thisPoint.y = thisY;
    var lastAngle = Math.atan2(
      lastY - lastCentroidY, lastX - lastCentroidX);
    var thisAngle, otherAngle;
    if (thisY < points[0].y ||
      (thisY == points[0].y && thisX < points[0].x)) {
        for (i = 0; i < thisPointIndex; --i) {
          points[i] = points[i+1];
        }
        points[0] = thisPoint;
        moving = false;
    } else {
      thisAngle = angleFromFirstPoint(thisPoint);
      //TODO: figure this out
      for (i = thisPointIndex; i > 0 && moving; --i) {
        points[i] = points[i-1];
      }
      points[i] = thisPoint;
    }

    thisAngle = Math.atan2(
      thisY - thisCentroidY, thisX - thisCentroidX);

    var transform = {
      translateX: thisCentroidX - lastCentroidX,
      translateY: thisCentroidY - lastCentroidY,
      scale: Math.sqrt(thisArea / lastArea),
      rotate: thisAngle - lastAngle // TODO: divide?
    };

    thisPoint.x = thisX;
    thisPoint.y = thisY;
    lastCentroidX = thisCentroidX;
    lastCentroidY = thisCentroidY;
    lastArea = thisArea;
    return transformListener(transform);
  }

  function adjust(e, thisPointIndex) {
    var thisX = e.clientX;
    var thisY = e.clientY;
    var thisPoint;
    var transform;

    if (points.length == 1) {
      thisPoint = points[0];
      transform = {
        translateX: thisX - thisPoint.x,
        translateY: thisY - thisPoint.y,
        scale: 1,
        rotate: 0
      };
      thisPoint.x = thisX;
      thisPoint.y = thisY;
      return transformListener(transform);
    } else if (points.length == 2) {
      thisPoint = points[thisPointIndex];
      var otherPoint;
      if (thisPointIndex == 1) {
        otherPoint = points[0];
        if (thisY < otherPoint.y ||
          thisY == otherPoint.y && thisX < otherPoint.x) {

          points[1] = otherPoint;
          points[0] = thisPoint;
        }
      } else {
        otherPoint = points[1];
      }

      var lastAngle = Math.atan2(
        thisPoint.y - otherPoint.y, thisPoint.x - otherPoint.x);
      var thisAngle = Math.atan2(
        thisY - otherPoint.y, thisX - otherPoint.x);

      thisCentroidX = (thisX + otherPoint.x) / 2;
      thisCentroidY = (thisY + otherPoint.y) / 2;
      thisArea = Math.abs(thisX - otherPoint.x) +
        Math.abs(thisY - otherPoint.y);

      transform = {
        translateX: thisCentroidX - lastCentroidX,
        translateY: thisCentroidY - lastCentroidY,
        scale: Math.sqrt(thisArea / lastArea),
        rotate: thisAngle - lastAngle
      };

      thisPoint.x = thisX;
      thisPoint.y = thisY;
      lastCentroidX = thisCentroidX;
      lastCentroidY = thisCentroidY;
      lastArea = thisArea;
      return transformListener(transform);
    } else {
      return polyAdjust(thisPointIndex, thisX, thisY);
    }
  }

  function polyRecalcLast() {
    var limit = points.length - 1;
    var point0 = points[0];
    var point1 = points[1];
    var x0, y0, x1, y1;
    function shortxy() {
      x0 = point0.x;
      y0 = point0.y;
      x1 = point1.x;
      y1 = point1.y;
    }
    function iterate() {
      var a = x0*y1 - x1*y0;
      lastArea += a;
      lastCentroidX += (x0 + x1)*a;
      lastCentroidY += (y0 + y1)*a;
    }
    shortxy();
    lastArea = x0*y1 - x1*y0;
    lastCentroidX = (x0 + x1)*lastArea;
    lastCentroidY = (y0 + y1)*lastArea;
    for (var i = 1; i < limit; ++i) {
      point0 = points[i];
      point1 = points[i+1];
      shortxy();
      iterate();
    }
    point0 = points[limit];
    point1 = points[0];
    shortxy();
    iterate();
    lastArea *= 0.5;
    lastCentroidX /= (6.0*lastArea);
    lastCentroidY /= (6.0*lastArea);
  }

  function remove(index) {
    points.splice(index, 1);
    if (points.length > 2) {
      return polyRecalcLast();
    } else if (points.length == 2) {
      lastCentroidX = Math.abs(points[1].x - points[0].x);
      lastCentroidY = points[1].y - points[0].y; // can't be negative, sorted
    }
  }

  function listener(e) {
    var thisPointIndex;
    switch (e.type) {
      case 'pointerdown':
      // TODO: allow pointers to be added on enter, or move via config
        return insert(e);

      case 'pointermove':
        // if this is a drag
        if (e.buttons & 1) {
          thisPointIndex = findPointId(e.pointerId);
          if (thisPointIndex !== null) {
            return adjust(e, thisPointIndex);
          }
        }
        break;
      case 'pointerup':
      case 'pointercancel':
      case 'pointerleave':
        thisPointIndex = findPointId(e.pointerId);
        if (thisPointIndex !== null) {
          return remove(thisPointIndex);
        }
        break;
    }
  }

  listener.attach = function attachChiralListener(target) {
    target.addEventListener('pointerdown', listener);
    //target.addEventListener('pointerenter', listener);
    target.addEventListener('pointermove', listener);
    target.addEventListener('pointerup', listener);
    target.addEventListener('pointercancel', listener);
    target.addEventListener('pointerleave', listener);
  };
  listener.remove = function removeChiralListener(target) {
    target.removeEventListener('pointerdown', listener);
    //target.removeEventListener('pointerenter', listener);
    target.removeEventListener('pointermove', listener);
    target.removeEventListener('pointerup', listener);
    target.removeEventListener('pointercancel', listener);
    target.removeEventListener('pointerleave', listener);
  };
  return listener;
}
