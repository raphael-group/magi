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

  function resizeEvent(){
    Object.keys(VIEW_VIS_RENDER).forEach(function(k) { VIEW_VIS_RENDER[k](); });
  }

  var refreshThrottle;
  window.onresize = function(){
    clearTimeout(refreshThrottle);
    refreshThrottle = setTimeout(resizeEvent, 100);
  };

  $( "#main-views" ).sortable({
    handle: '.sortableHandle'
  });
  $( "#main-views" ).disableSelection();
}
