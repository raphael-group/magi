// Functions for saving user interaction data
// For use in user studies

var sessionLogStart;
var log;

$(document).mousemove(function(e) {
  //addToLogLog(e, 'move');
});
$(document).click(function(e) {
  //addToLogLog(e, 'click');
});
$(document).scroll(function(e) {
  addToLogLog(e, 'scroll');
})

function addToLogLog(e, event) {
  var x = e.pageX,
      y = e.pageY,
      time = Date.now();
  log.push({x:x, y:y, time:time, event:event});
}

$().ready(function () {
  log = [];
  sessionLogStart = Date.now();
});

$('#saveTest').click(function() {
  var end = Date.now(),
      start = sessionLogStart;

  var height = $(window).height(),
      width = $(window).width();

  console.log(log);

  $.post('/saveLog', {'test':1});
})

  // start: Number, // start session date
  // end: Number, // end session date
  // id: String,
  // height: Number, // height of app
  // width: Number, // width of app
  // log: Object,
  // genes: Array,
  // datasets: Array, // array of datasets: {name:'', uploaded:true/false}
  // annotations: Array // annotation id for each annotation created