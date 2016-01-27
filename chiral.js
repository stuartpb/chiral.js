function chiral(opts) {
  var transformListener, startListener, endListener;
  if (typeof opts == 'function') {
    transformListener = opts;
  } else {
    transformListener = opts.transform;
    startListener = opts.down;
    endListener = opts.up;
  }

  var points = [];

  var lastAverageX;
  var lastAverageY;
  var thisAverageX;
  var thisAverageY;
  var allButAverageX;
  var allButAverageY;

  function findPointId(id) {
    for (var i = 0; i < points.length; ++i) {
      if (points[i].id === id) {
        return i;
      }
    }
    return null;
  }

  function listener(e) {
    var thisPointIndex;
    var thisPoint;
    var lastX, lastY;
    var i, point;
    switch (e.type) {
      case 'pointerdown':
      // TODO: allow pointers to be added on enter, or move via config
        points.push({
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY
        });
        lastAverageX = lastAverageY = 0;
        for (i = 0; i < points.length; ++i) {
          point = points[i];
          lastAverageX += point.x;
          lastAverageY += point.y;
        }
        lastAverageX /= points.length;
        lastAverageY /= points.length;
        break;
      case 'pointermove':
        // if this is a drag
        if (e.buttons & 1) {
          thisPointIndex = findPointId(e.pointerId);
          if (thisPointIndex !== null) {
            thisAverageX = thisAverageY =
              allButAverageX = allButAverageY = 0;
            for (i = 0; i < points.length; ++i) {
              point = points[i];
              if (i == thisPointIndex) {
                thisPoint = point;
                lastX = thisPoint.x;
                lastY = thisPoint.y;
                thisPoint.x = e.clientX;
                thisPoint.y = e.clientY;
              } else {
                allButAverageX += point.x;
                allButAverageY += point.y;
              }
              thisAverageX += point.x;
              thisAverageY += point.y;
            }
            thisAverageX /= points.length;
            thisAverageY /= points.length;
            var transform = {
              translateX: thisAverageX - lastAverageX,
              translateY: thisAverageY - lastAverageY,
              scale: 1,
              rotate: 0
            };
            if (points.length > 1) {
              allButAverageX /= points.length - 1;
              allButAverageY /= points.length - 1;
              transform.scale =
                (Math.abs(thisPoint.x - allButAverageX) +
                  Math.abs(thisPoint.y - allButAverageY)) /
                (Math.abs(lastX - allButAverageX) +
                  Math.abs(lastY - allButAverageY));
              transform.rotate =
                Math.atan2(allButAverageX - lastX,
                  allButAverageY - lastY) -
                Math.atan2(allButAverageX - thisPoint.x,
                  allButAverageY - thisPoint.y);
            }
            lastAverageX = thisAverageX;
            lastAverageY = thisAverageY;
            return transformListener(transform);
          }
        }
        break;
      case 'pointerup':
      case 'pointercancel':
      case 'pointerleave':
        thisPointIndex = findPointId(e.pointerId);
        if (thisPointIndex !== null) {
          points.splice(thisPointIndex, 1);
          if (points.length > 0) {
            lastAverageX = lastAverageY = 0;
            for (i = 0; i < points.length; ++i) {
              point = points[i];
              lastAverageX += point.x;
              lastAverageY += point.y;
            }
            lastAverageX /= points.length;
            lastAverageY /= points.length;
          }
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
