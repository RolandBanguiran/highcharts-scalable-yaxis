/**
 * Highcharts plugin for manually scaling Y-Axis range.
 *
 * Author: Roland Banguiran
 * Email: banguiran@gmail.com
 *
 * Usage: Set scalable:false in the yAxis options to disable.
 * Default: true
 */

// JSLint options:
/*global Highcharts, document */

(function (H) {
  'use strict';
  var addEvent = H.addEvent,
    each = H.each,
    doc = document,
    redrawDraggables = true;

  var setScalable = function (chart, yAxis) {
    var options = yAxis.options,
      scalable = options.scalable === undefined ? true : options.scalable,
      labels = options.labels,
      pointer = chart.pointer,
      labelGroupBBox,
      bBoxX,
      bBoxY,
      bBoxWidth,
      bBoxHeight,
      isDragging = false,
      downYValue;

    if (!yAxis.showAxis) {
      scalable = false;
    }

    if (scalable) {
      bBoxWidth = 40;
      bBoxHeight = chart.containerHeight - yAxis.top - yAxis.bottom;
      bBoxX = yAxis.opposite ? (labels.align === 'left' ? chart.containerWidth - yAxis.right : chart.containerWidth - yAxis.right) : (labels.align === 'left' ? yAxis.left : yAxis.left - bBoxWidth);
      bBoxY = yAxis.top;

      bBoxX += yAxis.offset;

      // Render an invisible bounding box around the y-axis label group
      // This is where we add mousedown event to start dragging
      labelGroupBBox = chart.renderer.rect(bBoxX, bBoxY, bBoxWidth, bBoxHeight)
        .attr({
          fill: '#fff',
          opacity: 0,
          zIndex: 8,
          class: 'scalable-draggable'
        })
        .css({
          cursor: 'ns-resize'
        })
        .add();

      labels.style.cursor = 'ns-resize';

      addEvent(labelGroupBBox.element, 'mousedown', function (e) {
        var downYPixels = pointer.normalize(e).chartY;

        downYValue = yAxis.toValue(downYPixels);
        isDragging = true;
        redrawDraggables = false;
      });

      addEvent(chart.container, 'mousemove', function (e) {
        if (isDragging) {
          doc.body.style.cursor = 'ns-resize';

          var dragYPixels = chart.pointer.normalize(e).chartY,
            dragYValue = yAxis.toValue(dragYPixels),
            extremes = yAxis.getExtremes(),

            userMin = extremes.userMin,
            userMax = extremes.userMax,
            dataMin = extremes.dataMin,
            dataMax = extremes.dataMax,

            min = userMin !== undefined ? userMin : dataMin,
            max = userMax !== undefined ? userMax : dataMax,

            newMin,
            newMax;

          // update max extreme only if dragged from upper portion
          // update min extreme only if dragged from lower portion
          if (downYValue > (dataMin + dataMax) / 2) {
            newMin = min;
            newMax = max - (dragYValue - downYValue);
            newMax = newMax > dataMax ? newMax : dataMax; // limit
          }
          else {
            newMin = min - (dragYValue - downYValue);
            newMin = newMin < dataMin ? newMin : dataMin; // limit
            newMax = max;
          }

          yAxis.setExtremes(newMin, newMax, true, false);
        }
      });

      addEvent(document, 'mouseup', function () {
        doc.body.style.cursor = 'default';
        isDragging = false;
        redrawDraggables = true;
      });

      // double-click to go back to default range
      addEvent(labelGroupBBox.element, 'dblclick', function () {
        var extremes = yAxis.getExtremes(),
          dataMin = extremes.dataMin,
          dataMax = extremes.dataMax;

        yAxis.setExtremes(dataMin, dataMax, true, false);
      });
    }
  };

  H.wrap(H.Chart.prototype, 'init', function (proceed) {
    // Run the original proceed method
    proceed.apply(this, Array.prototype.slice.call(arguments, 1));

    var chart = this, yAxis = chart.yAxis;

    each(yAxis, function (yAxis) {
      setScalable(chart, yAxis);
    });
  });

  H.wrap(H.Chart.prototype, 'redraw', function (proceed) {
    // Run the original proceed method
    proceed.apply(this, Array.prototype.slice.call(arguments, 1));

    if (!redrawDraggables) {
      var chart = this, yAxis = chart.yAxis;

      // Remove all previous draggables before redraw them with the correct
      // position.
      chart.renderTo.querySelectorAll('.scalable-draggable').forEach(function(a){
        a.remove();
      })

      each(yAxis, function (yAxis) {
        setScalable(chart, yAxis);
      });
    }
  });

}(Highcharts));
