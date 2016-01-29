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
  var sumX;
  var sumY;

  function findPointId(id) {
    for (var i = 0; i < points.length; ++i) {
      if (points[i].id === id) {
        return i;
      }
    }
    return null;
  }

  function angleFromMean(point) {
    return Math.atan2(
      point.y - sumY / points.length,
      point.x - sumX / points.length) + Math.PI;
  }

  function comparePoints(m, n) {
    return angleFromMean(m) - angleFromMean(n);
  }

  function polyRecalc() {
    points.sort(comparePoints);
    var limit = points.length - 1;

    var x0, y0, x1, y1;
    function loadxy(point0, point1) {
      x0 = point0.x;
      y0 = point0.y;
      x1 = point1.x;
      y1 = point1.y;
    }
    function iterate() {
      var a = x0*y1 - x1*y0;
      thisArea += a;
      thisCentroidX += (x0 + x1)*a;
      thisCentroidY += (y0 + y1)*a;
    }

    loadxy(points[0], points[1]);
    thisArea = x0*y1 - x1*y0;
    thisCentroidX = (x0 + x1)*thisArea;
    thisCentroidY = (y0 + y1)*thisArea;
    for (var i = 1; i < limit; ++i) {
      loadxy(points[i], points[i+1]);
      iterate();
    }
    loadxy(points[limit], points[0]);
    iterate();

    thisArea *= 0.5;
    thisCentroidX /= (6.0*thisArea);
    thisCentroidY /= (6.0*thisArea);
  }

  function insert(e) {
    var thisPoint = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY
    };
    sumX = thisPoint.x;
    sumY = thisPoint.y;
    if (points.length == 0) {
      points[0] = thisPoint;
      if (startListener) return startListener();
    } else if (points.length == 1) {
      points[1] = thisPoint;
      lastCentroidX = sumX / 2;
      lastCentroidY = sumY / 2;
      // for lines "area" is the square length
      lastArea = Math.abs(thisPoint.x - points[0].x) +
        Math.abs(thisPoint.y - points[0].y);
    } else {
      points[points.length] = thisPoint;
      polyRecalc();
      lastArea = thisArea;
      lastCentroidX = thisCentroidX;
      lastCentroidY = thisCentroidY;
    }
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
      var otherPoint = points[thisPointIndex?0:1];

      var lastAngle = Math.atan2(
        thisPoint.y - otherPoint.y, thisPoint.x - otherPoint.x);
      var thisAngle = Math.atan2(
        thisY - otherPoint.y, thisX - otherPoint.x);

      sumX += thisX - thisPoint.x;
      sumY += thisY - thisPoint.y;
      thisCentroidX = sumX / 2;
      thisCentroidY = sumY / 2;
      // for lines "area" is the square length
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
      thisPoint = points[thisPointIndex];
      var lastX = thisPoint.x;
      var lastY = thisPoint.y;
      lastAngle = Math.atan2(
        lastY - lastCentroidY, lastX - lastCentroidX);

      thisPoint.x = thisX;
      thisPoint.y = thisY;
      sumX += thisX - lastX;
      sumY += thisY - lastY;
      polyRecalc();
      thisAngle = Math.atan2(
        thisY - thisCentroidY, thisX - thisCentroidX);

      transform = {
        translateX: thisCentroidX - lastCentroidX,
        translateY: thisCentroidY - lastCentroidY,
        scale: Math.sqrt(thisArea / lastArea),
        rotate: (thisAngle - lastAngle) / (points.length*2)
      };

      lastCentroidX = thisCentroidX;
      lastCentroidY = thisCentroidY;
      lastArea = thisArea;
      return transformListener(transform);
    }
  }

  function remove(index) {
    sumX -= points[index].x;
    sumY -= points[index].y;
    points.splice(index, 1);
    if (points.length > 2) {
      polyRecalc();
      lastCentroidX = thisCentroidX;
      lastCentroidY = thisCentroidY;
      lastArea = thisArea;
    } else if (points.length == 2) {
      lastCentroidX = Math.abs(points[1].x - points[0].x);
      lastCentroidY = Math.abs(points[1].y - points[0].y);
      // for lines "area" is the square length
      lastArea = Math.abs(points[0].x - points[1].x) +
        Math.abs(points[0].y - points[1].y);
    } else if (points.length == 0) {
      if (endListener) return endListener();
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
