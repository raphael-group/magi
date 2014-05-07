// Functions for saving user interaction data
// For use in user studies

var sessionLogStart,
    interactionsLog;

$(document).keydown(function(e) {
  if(e.ctrlKey || e.metaKey) {
    sendData();
  }
});

$(document).mousemove(function(e) {
  addToLog(e, 'm');
  if(e.pageX <= 0 || e.pageY <= 0) {
    sendData();
  }
});

$(document).click(function(e) {
  addToLog(e, 'c');
});

$(document).scroll(function(e) {
  addToLog(e, 's');
});

$().ready(function () {
  interactionsLog = [];
  sessionLogStart = Date.now();
});

function addToLog(e, event) {
  var x = e.pageX,
      y = e.pageY,
      time = Date.now();
  interactionsLog.push({x:x, y:y, t:time, e:event});
}

function sendData() {
  var end = Date.now(),
      start = sessionLogStart;

  var height = $(window).height(),
      width = $(window).width();

  var pathTkns = window.location.search.split('&'),
      genes = pathTkns[0].replace('?genes=','').split('%2C'),
      datasets = pathTkns[1].replace('datasets=','').split('%2C'),
      showDuplicates = pathTkns[2].replace('showDuplicates=','');

  var vizSizes = {};
  vizSizes.mutmtx = [$('div#mutation-matrix').width(), $('div#mutation-matrix').height()];
  vizSizes.subnet = [$('div#subnetwork').width(), $('div#subnetwork').height()];
  vizSizes.trnant = [$('div#transcript-plot').width(), $('div#transcript-plot').height()];
  vizSizes.cnaviz = [$('div#cna-browser').width(), $('div#cna-browser').height()];

  // TODO: log voting actions, log annotation generation
  var log = {
    datasets: datasets,
    end: end,
    genes: genes,
    height: height,
    log: JSON.stringify(interactionsLog),
    showDuplicates: showDuplicates,
    start: start,
    width: width,
    vizSizes: vizSizes
  };
  $.post('/saveLog', log);
}