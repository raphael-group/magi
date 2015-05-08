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
      } else if (typeof value === 'object' && objectList.indexOf(value) === -1){
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

var loggingEnabled = false,
    lastSentTime,
    MAGI_log = {};

MAGI_log.sessionLogStart = Date.now();
MAGI_log.interactions = [];
MAGI_log.resizes = {
  documentSize: [],
  windowSize: [],
  vizSizes: [],
  vizLocations: []
};
MAGI_log.tooltips = [];

$().ready(function () {
  $.get('/logEnabled', function(res, status) {
    if(status == "success" && res === true) {
      loggingEnabled = true;
      initLogging();
    } else {
      loggingEnabled = false;
    }
  });
});


function initLogging() {
  lastSentTime = Date.now();
  MAGI_log.sessionLogStart = Date.now();
  startLog();

  // append consent pane
  var consentPane = d3.select('#view').append('div').style({
    'border-top': '1px solid #eee',
    'margin-left': '20px',
    'margin-right': '200px',
    'margin-top': '100px',
    'min-width': '400px',
    'max-width': '600px',
    'padding-top': '15px'
  });
  consentPane.append('input')
      .attr('id', 'magiConsentViewToggle')
      .attr('type', 'checkbox')
      .style({ 'display': 'inline-block', 'margin-right': '5px' });
  consentPane.append('p')
      .style('color', 'rgb(200,200,200)')
      .style('display', 'inline-block')
      .html('I do not want to improve the development of MAGI by sending usage information. <a href="" id="magi-loggingReadMore" style="color:rgb(200,200,225)">(Read More)</a>');
  var consentPaneDesc = consentPane.append('div').attr('id', 'magi-loggingReadMoreDiv').append('blockquote');
  consentPaneDesc.append('p').text("We don't track identifying information and we anonymize queries. This means that our logs don't track your name or any other information about who you are, and the genes and datasets you look at are scrambled to respect research privacy. Logs are made up of anonymized query information and interaction information, like how visualizations are being used.".replace(/\n/g, ''));
  consentPaneDesc.append('p').text("Why collect this information? Cancer researchers are hard to observe in-lab due to how spread out geographically they are, which makes developing usable visualization software challenging. We use information about how you use the tool to understand how the tool is being used, to identify usability bottlenecks, and come up with new features.".replace(/\n/g, ''));

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
    var target = e.target;
    addToLog(e, 'm', target.id, target.tagName);
    if(e.pageX <= 0 || e.pageY <= 0) {
      extendLogEvents();
    }
  });

  $(document).click(function(e) {
    var target = e.target;
    addToLog(e, 'c', target.id, target.tagName);
    if(target.tagName == "a") {
      extendLogEvents();
    }

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
    vizSizes.subnet = {width:$('div#network').width(), height:$('div#network').height()};
    vizLocs.subnet = $('div#network').offset();
    vizSizes.trnant = {width:$('div#transcript').width(), height:$('div#transcript').height()};
    vizLocs.trnant = $('div#transcript').offset();
    vizSizes.cnaviz = {width:$('div#cnas').width(), height:$('div#cnas').height()};
    vizLocs.cnaviz = $('div#cnas').offset();
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

    genes = genes.map(function(g) {
      var hasher = new jsSHA(g, "TEXT"),
          hash = hasher.getHash("SHA-1", "HEX");
      return hash;
    });

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
  function addToLog(e, event, tagId, tagType) {
    if(!loggingEnabled) return;
    var x = e.pageX,
        y = e.pageY,
        time = Date.now();
    MAGI_log.interactions.push({x:x,
        y:y,
        t:time,
        e:event,
        id:tagId,
        tt: tagType
    });

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

    if (tipOpacity !== 0) ;
      var tipInfo = {};
      tipInfo.left = tip.style('left');
      tipInfo.top = tip.style('top');
      tipInfo.width = tip.style('width');
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
} // end initLogging
