// Functions for saving user interaction data
// For use in user studies

// sizeof gets a rough size of javascript objects
// https://gist.github.com/pgpbpadilla/10344038
(function () {
  var typeOfWindow = typeof window;

  function sizeof(object) {
    var objectList = [],
      stack = [ object ],
      bytes = 0,
      value,
      i;

    while (stack.length) {
      value = stack.pop();

      if (typeof value === 'boolean') {
        bytes += 4;
      } else if (typeof value === 'string') {
        bytes += value.length * 2;
      } else if (typeof value === 'number') {
        bytes += 8;
      } else if (typeof value === 'object'
          && objectList.indexOf(value) === -1) {
        objectList.push(value);

        for (i in value) {
          if (value.hasOwnProperty(i)) {
            stack.push(value[i]);
          }
        }
      }
    }
    return bytes;
  }

  // export function
  if ('undefined' !== typeOfWindow) { // export to window
    window.sizeof = sizeof;
  } else { // export to node
    module.exports = sizeof;
  }
}());

var LOGGING_SEND_LIMIT = 75;

var loggingEnabled = true,
    lastSentTime,
    MAGI_log = {};

MAGI_log.sessionLogStart;
MAGI_log.interactions = [];
MAGI_log.resizes = {
  documentSize: [],
  windowSize: [],
  vizSizes: [],
  vizLocations: []
};
MAGI_log.tooltips = [];

$('#magi-loggingReadMore').click(function(e) {
  e.preventDefault();
  var isVisible = 'visible' == $('#magi-loggingReadMoreDiv').css('visibility'),
      visibleState = isVisible ? 'hidden' : 'visible',
      displayState = isVisible ? 'none' : 'block';

  $('#magi-loggingReadMoreDiv').css('visibility', visibleState);
  $('#magi-loggingReadMoreDiv').css('display', displayState);

});

$('#magiConsentViewToggle').change(function() {
  var checked = $('#magiConsentViewToggle').is(':checked');
  loggingEnabled = checked;
});

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

  var target = e.target,
      parent = $(target).parent();

  resizeEvent();
});

$(document).scroll(function(e) {
  addToLog(e, 's');
});
$(document).on('mousewheel', function(e) {
  var evt = e.originalEvent,
      velocity = evt.detail || evt.wheelDelta,
      logText = velocity >= 0 ? 'w+'+velocity : 'w'+velocity;

  addToLog(e, 'w');
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




$().ready(function () {
  lastSentTime = Date.now();
  MAGI_log.sessionLogStart = Date.now();
  startLog();
});


function resizeEvent() {
  if(!loggingEnabled) return;
  var s = getSizes();

  MAGI_log.resizes.documentSize.push(s.documentSize);
  MAGI_log.resizes.windowSize.push(s.windowSize);
  MAGI_log.resizes.vizSizes.push(s.vizSizes);
  MAGI_log.resizes.vizLocations.push(s.vizLocations);

  // Send the log if it's above a certain length
  // If it's above 90Kb, send it
  if(sizeof(MAGI_log)/1024 > LOGGING_SEND_LIMIT) {
    extendLogEvents();
  }
}

function getSizes() {
  if(!loggingEnabled) return;
  var time = Date.now();
  var documentSize = {width:$(document).width(), height:$(document).height()},
      windowSize = {width:$(window).width(), height:$(window).height()},
      vizSizes = {},
      vizLocs = {};

  // Get size and locations of visualizations
  vizSizes.mutmtx = {width:$('div#aberrations').width(), height:$('div#aberrations').height()};
  vizLocs.mutmtx = $('div#aberrations').offset();
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
    sessionId: MAGI_log.sessionLogStart,//MAGI_sessionLogStart,
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
  log.sessionId = MAGI_log.sessionLogStart;
  log.log = MAGI_log.interactions;
  log.documentSize = MAGI_log.resizes.documentSize;
  log.tooltips = MAGI_log.tooltips;
  log.windowSize = MAGI_log.resizes.windowSize;
  log.vizSizes = MAGI_log.resizes.vizSizes;
  log.vizLocations = MAGI_log.resizes.vizLocations;

  console.log(sizeof(log));

  $.post('/extendLog', log);
  MAGI_log.interactions = [];
  MAGI_log.tooltips = [];
  MAGI_log.resizes = {
    documentSize: [],
    windowSize: [],
    vizSizes: [],
    vizLocations: []
  };
}

// Each log should be ~40 bytes
function addToLog(e, event) {
  if(!loggingEnabled) return;
  var x = e.pageX,
      y = e.pageY,
      time = Date.now();
  MAGI_log.interactions.push({x:x, y:y, t:time, e:event});

  trackTooltips(time);

  if(sizeof(MAGI_log)/1024 > LOGGING_SEND_LIMIT) {
    extendLogEvents();
  }
}

// Each tooltip should be ~56 bytes
function trackTooltips(time) {
  var tip = d3.selectAll('div.gd3-tooltip'),
      mutmtxhoverLegend = $('div.gd3-mutmtx-legend');

  var tipLog = {};
  tipLog.t = time;
  tipLog.tips = [];
  tip.each(function() {
    var tip = d3.select(this),
        tipOpacity = tip.style('opacity');

  if (tipOpacity != 0) ;
    var tipInfo = {};
    tipInfo.left = tip.style('left');
    tipInfo.top = tip.style('top');
    tipInfo.width = tip.style('width'),
    tipInfo.height = tip.style('height');
    tipLog.tips.push(tipInfo);
  });

  // Add hover legend if it exists
  if(mutmtxhoverLegend.length > 0) {
    var mhlWidth = mutmtxhoverLegend.width(),
          mhlHeight = mutmtxhoverLegend.height(),
          mhlOffset = mutmtxhoverLegend.offset();
      tipLog.tips.push({
        left: mhlOffset.left,
        top: mhlOffset.top,
        width: mhlWidth,
        height: mhlHeight
      });
  }

  MAGI_log.tooltips.push(tipLog);
}
