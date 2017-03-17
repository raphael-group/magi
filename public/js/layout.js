// Draggable layout controls for the query page
$(document).ready(initResizableLayout);

function initResizableLayout() {
  $( ".panelResizable" ).resizable({
    handles: "e",
    stop: function() { console.log('hi'); }
  });

  console.log('hi');
}
