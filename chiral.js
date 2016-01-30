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
  var lastPerimeter;
  var thisPerimeter;
  var lastAngularSum;
  var thisAngularSum;
  var sumX = 0;
  var sumY = 0;

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

  function angleFromCentroid(point) {
    return Math.atan2(
      point.y - thisCentroidY,
      point.x - thisCentroidX);
  }

  function comparePoints(m, n) {
    return angleFromMean(m) - angleFromMean(n);
  }

  function polyRecalc() {
    var i;
    points.sort(comparePoints);
    var limit = points.length - 1;

    var x0, y0, x1, y1;
    function loadxy(point0, point1) {
      x0 = point0.x;
      y0 = point0.y;
      x1 = point1.x;
      y1 = point1.y;
    }

    loadxy(points[0], points[1]);
    var signedArea = x0*y1 - x1*y0;
    thisCentroidX = (x0 + x1)*signedArea;
    thisCentroidY = (y0 + y1)*signedArea;
    thisPerimeter = Math.sqrt(Math.abs(x0-x1)+Math.abs(y0-y1));
    function iterate() {
      var a = x0*y1 - x1*y0;
      signedArea += a;
      thisCentroidX += (x0 + x1)*a;
      thisCentroidY += (y0 + y1)*a;
      thisPerimeter += Math.sqrt(Math.abs(x0-x1)+Math.abs(y0-y1));
    }
    for (i = 1; i < limit; ++i) {
      loadxy(points[i], points[i+1]);
      iterate();
    }
    loadxy(points[limit], points[0]);
    iterate();

    signedArea *= 0.5;
    thisCentroidX /= (6.0*signedArea);
    thisCentroidY /= (6.0*signedArea);

    thisAngularSum = angleFromCentroid(points[0]);
    for (i = 1; i < points.length; ++i) {
      thisAngularSum += angleFromCentroid(points[i]);
    }
  }

  function insert(e) {
    var thisPoint = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY
    };
    sumX += thisPoint.x;
    sumY += thisPoint.y;
    if (points.length == 0) {
      points[0] = thisPoint;
      if (startListener) return startListener();
    } else if (points.length == 1) {
      points[1] = thisPoint;
      lastCentroidX = sumX / 2;
      lastCentroidY = sumY / 2;
      // for lines "perimeter" is the square length
      lastPerimeter = Math.abs(thisPoint.x - points[0].x) +
        Math.abs(thisPoint.y - points[0].y);
    } else {
      points[points.length] = thisPoint;
      polyRecalc();
      lastPerimeter = thisPerimeter;
      lastCentroidX = thisCentroidX;
      lastCentroidY = thisCentroidY;
      lastAngularSum = thisAngularSum;
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
      // for lines "perimeter" is the square length
      thisPerimeter = Math.abs(thisX - otherPoint.x) +
        Math.abs(thisY - otherPoint.y);

      transform = {
        translateX: thisCentroidX - lastCentroidX,
        translateY: thisCentroidY - lastCentroidY,
        scale: Math.sqrt(thisPerimeter / lastPerimeter),
        rotate: thisAngle - lastAngle
      };

      thisPoint.x = thisX;
      thisPoint.y = thisY;
      lastCentroidX = thisCentroidX;
      lastCentroidY = thisCentroidY;
      lastPerimeter = thisPerimeter;
      return transformListener(transform);
    } else {
      thisPoint = points[thisPointIndex];
      var lastX = thisPoint.x;
      var lastY = thisPoint.y;

      thisPoint.x = thisX;
      thisPoint.y = thisY;
      sumX += thisX - lastX;
      sumY += thisY - lastY;
      polyRecalc();

      transform = {
        translateX: thisCentroidX - lastCentroidX,
        translateY: thisCentroidY - lastCentroidY,
        scale: thisPerimeter / lastPerimeter,
        rotate: thisAngularSum - lastAngularSum
      };

      lastCentroidX = thisCentroidX;
      lastCentroidY = thisCentroidY;
      lastPerimeter = thisPerimeter;
      lastAngularSum = thisAngularSum;
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
      lastPerimeter = thisPerimeter;
      lastAngularSum = thisAngularSum;
    } else if (points.length == 2) {
      lastCentroidX = sumX / 2;
      lastCentroidY = sumY / 2;
      // for lines "perimeter" is the square length
      lastPerimeter = Math.abs(points[0].x - points[1].x) +
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
