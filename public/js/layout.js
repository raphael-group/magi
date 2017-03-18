// Draggable layout controls for the query page
$(document).ready(initResizableLayout);

function initResizableLayout() {
  $( ".panelResizable" ).resizable({
    handles: "e",
    stop: function() {
      var name = d3.select(this).attr("data-vis");
      VIEW_VIS_RENDER[name](); // see view.js
    }
  });

  console.log('hi');
}
