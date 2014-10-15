// Functions for saving user interaction data
// For use in user studies

var loggingEnabled = false,
    lastSentTime,
    MAGI_sessionLogStart,
    MAGI_interactionsLog = [],
    MAGI_resizes = {
      documentSize: [],
      windowSize: [],
      vizSizes: [],
      vizLocations: []
    };

$('#magi-loggingReadMore').click(function(e) {
  e.preventDefault();
  var isVisible = 'visible' == $('#magi-loggingReadMoreDiv').css('visibility'),
      visibleState = isVisible ? 'hidden' : 'visible',
      displayState = isVisible ? 'none' : 'block';

  $('#magi-loggingReadMoreDiv').css('visibility', visibleState);
  $('#magi-loggingReadMoreDiv').css('display', displayState);

});

$('#magiConsentViewToggle').change(function() {
  console.log('toggle');
})

$(document).keydown(function(e) {
  if(e.ctrlKey || e.metaKey) {
    extendLogEvents();
  }
});

$(document).mousemove(function(e) {
  addToLog(e, 'm');
  if(e.pageX <= 0 || e.pageY <= 0) {
    extendLogEvents();
  }
});

$(document).click(function(e) {
  addToLog(e, 'c');
});

$(document).scroll(function(e) {
  addToLog(e, 's');
});
$(document).on('mousewheel', function(e) {
  var evt = e.originalEvent,
      velocity = evt.detail || evt.wheelDelta,
      logText = velocity >= 0 ? 'w+'+velocity : 'w'+velocity;

  addToLog(e, logText);
});


$(window).resize(function() {
  resizeEvent();
});
$('#instructions').on('shown.bs.collapse', function() {
  resizeEvent();
});
$('#hideControlPanel').click(function(e) {
  resizeEvent();
});

$('#datasets li').click(function(e) {
  addToLog(e,'f'); // filter
});
$('#downloadLink').click(function(e) {
  addToLog(e, 'sSVG');
});
$('#downloadLinkPNG').click(function(e) {
  addToLog(e, 'sPNG');
});
$('#annotation-form #inputs #submit').click(function(e) {
  addToLog(e, 'a');
});

$('.downvote').click(function(e) {
  addToLog(e, 'd');
});
$('.upvote').click(function(e) {
  addToLog(e, 'u');
});

$('div.m2-tooltip').click(function() {
  console.log('clickkk');
});


$().ready(function () {
  lastSentTime = Date.now();
  MAGI_sessionLogStart = Date.now();
  // Does the server enable logging?
  $.post('/userGaveConsent')
    .done(function(res) {
      loggingEnabled = res;

      if(loggingEnabled) startLog();
    });

});


function resizeEvent() {
  var s = getSizes();
  MAGI_resizes.documentSize.push(s.documentSize);
  MAGI_resizes.windowSize.push(s.windowSize);
  MAGI_resizes.vizSizes.push(s.vizSizes);
  MAGI_resizes.vizLocations.push(s.vizLocations);
}

function getSizes() {
  var time = Date.now();
  var documentSize = {width:$(document).width(), height:$(document).height()},
      windowSize = {width:$(window).width(), height:$(window).height()},
      vizSizes = {},
      vizLocs = {};

  // Get size and locations of visualizations
  vizSizes.mutmtx = {width:$('div#mutation-matrix').width(), height:$('div#mutation-matrix').height()};
  vizLocs.mutmtx = $('div#mutation-matrix').offset();
  vizSizes.subnet = {width:$('div#subnetwork').width(), height:$('div#subnetwork').height()};
  vizLocs.subnet = $('div#subnetwork').offset();
  vizSizes.trnant = {width:$('div#transcript-plot').width(), height:$('div#transcript-plot').height()};
  vizLocs.trnant = $('div#transcript-plot').offset();
  vizSizes.cnaviz = {width:$('div#cna-browser').width(), height:$('div#cna-browser').height()};
  vizLocs.cnaviz = $('div#cna-browser').offset();
  vizSizes.heatmp = {width:$('div#heatmap').width(), height:$('div#heatmap').height()};
  vizLocs.heatmp = $('div#heatmap').offset();

  vizSizes.controls = {width: $('#control-panel').width(), height:$('#control-panel').height()};
  vizLocs.controls = $('#control-panel').offset();

  documentSize.time = time;
  windowSize.time = time;
  vizSizes.time = time;
  vizLocs.time = time;

  return {
    documentSize:documentSize,
    windowSize:windowSize,
    vizSizes:vizSizes,
    vizLocations:vizLocs
  };
}

function startLog() {
  if(!loggingEnabled) return;
  var sizes = getSizes(),
      documentSize = sizes.documentSize,
      windowSize = sizes.windowSize,
      vizSizes = sizes.vizSizes,
      vizLocations = sizes.vizLocations;

  // Get query information from address bar
  var pathTkns = window.location.search.split('&'),
      genes = pathTkns[0].replace('?genes=','').split('%2C'),
      datasets = pathTkns[1].replace('datasets=','').split('%2C'),
      showDuplicates = pathTkns[2].replace('showDuplicates=','');

  var log = {
    sessionId: MAGI_sessionLogStart,
    documentSize: documentSize,
    windowSize: windowSize,
    vizSizes: vizSizes,
    vizLocations: vizLocations,
    genes: genes,
    datasets: datasets,
    showDuplicates: showDuplicates
  };

  $.post('/startLog', log);
}
function extendLogEvents() {
  if(!loggingEnabled) return;

  // Don't do anything if a request was just sent
  var now = Date.now();
  if (now - lastSentTime < 1000){
    return;
  }
  lastSentTime = now; // update sent time to reflect this call

  var log = {};
  log.sessionId = MAGI_sessionLogStart;
  log.log = MAGI_interactionsLog;
  log.documentSize = MAGI_resizes.documentSize;
  log.windowSize = MAGI_resizes.windowSize;
  log.vizSizes = MAGI_resizes.vizSizes;
  log.vizLocations = MAGI_resizes.vizLocations;
  $.post('/extendLog', log);
  MAGI_interactionsLog = [];
}

function addToLog(e, event) {
  if(!loggingEnabled) return;
  var x = e.pageX,
      y = e.pageY,
      time = Date.now();
  MAGI_interactionsLog.push({x:x, y:y, t:time, e:event});

  // Send the log if it's above a certain length
  // 5000 entries takes roughly 90 seconds of constant mouse events
  if( MAGI_interactionsLog.length > 5000) {
    extendLogEvents();
  }
}
