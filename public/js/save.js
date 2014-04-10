////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
//
// CONVENIENCE FUNCTIONS FOR IMAGE DOWNLOAD
//

var SAVEJS_CONST = {
  CNA_VIZ: 0,
  MUT_MTX: 1,
  SUB_NET: 2,
  TRN_ANT: 3
};

var SAVEJS_FNAMES = {
  CNA_VIZ: 'cna.svg',
  MUT_MTX: 'mutation-matrix.svg',
  SUB_NET: 'subnetwork.svg',
  TRN_ANT: 'transcript-annotation.svg'
}

// error message box
var checkMessage = d3.select('div#saveErrMsgContainer')
      .append('p')
          .style('background', 'rgb(242, 222, 222)')
          .style('border', '1px solid rgb(205, 174, 179)')
          .style('border-radius', '4px')
          .style('display', 'none')
          .style('padding', '5px')
          .text('Error: No visualizations selected.');


// Download any selected visualizations using a given save function. Creates error prompt if no
//    visualizations are selected in the tool.
//
// saveFn (function variable) - function that takes a visualization ID and save file name as input
function downloadVisualizations(saveFn) {
  var saveCheckboxes = d3.selectAll('ul#saveOptList li label input')[0];

  var vizSelected = saveCheckboxes[SAVEJS_CONST.CNA_VIZ].checked == true
      || saveCheckboxes[SAVEJS_CONST.TRN_ANT].checked == true
      || saveCheckboxes[SAVEJS_CONST.SUB_NET].checked == true
      || saveCheckboxes[SAVEJS_CONST.MUT_MTX].checked == true;

  if (vizSelected == false) {
    checkMessage.style('display', 'block');
    return;
  } else {
    checkMessage.style('display', 'none');
  }

  if (saveCheckboxes[SAVEJS_CONST.CNA_VIZ].checked == true) {
    saveFn('cna-browser', SAVEJS_FNAMES.CNA_VIZ);
  }
  if (saveCheckboxes[SAVEJS_CONST.TRN_ANT].checked == true) {
    saveFn('transcript-plot', SAVEJS_FNAMES.TRN_ANT);
  }
  if (saveCheckboxes[SAVEJS_CONST.SUB_NET].checked == true) {
    saveFn('subnetwork', SAVEJS_FNAMES.SUB_NET);
  }
  if (saveCheckboxes[SAVEJS_CONST.MUT_MTX].checked == true) {
    saveFn('mutation-matrix', SAVEJS_FNAMES.MUT_MTX);
  }
}


// Grab an SVG based on the save file name from the tool. RETURNs the d3 svg object
//
// saveFileName (string) - one of SAVEJS_FNAMES
function grabSVG(saveFileName) {
  var svg = null;
  if (saveFileName == SAVEJS_FNAMES.SUB_NET) {
    svg = d3.select('div#'+divContainerId+' #figure');
  } else if (saveFileName == SAVEJS_FNAMES.MUT_MTX) {
    svg = d3.select('div#'+divContainerId+' svg#mutation-matrix');
  } else if (saveFileName == SAVEJS_FNAMES.TRN_ANT) {
    svg = d3.select('div#'+divContainerId+' svg');
  } else if (saveFileName == SAVEJS_FNAMES.CNA_VIZ) {
    svg = d3.select('div#'+divContainerId+' svg#'+divContainerId);
  } else {
    svg = d3.select('div#'+divContainerId).select('svg#figure');
  }

  svg.attr('xmlns', 'http://www.w3.org/2000/svg');

  return svg;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
//
// SVG DOWNLOAD CODE
//

// Generalized post code to handle SVG download for each visualization
var saveSVG = function(divContainerId, saveFileName) {
  // harvest the SVG from the tool
  var svg = grabSVG(saveFileName).node();

  // send out the post request
  $.post('/saveSVG', {'html': svg.outerHTML, 'fileName': name})
    .done(function(svgStr) {
      // When the post has returned, create a link in the browser to download the SVG
      // Store the data and create a download link
      var url = window.URL.createObjectURL(new Blob([svgStr], { "type" : "text\/xml" }));
      var a = d3.select("body")
          .append('a')
          .attr("download", saveFileName)
          .attr("href", url)
          .style("display", "none");

      // Activate the download through a click event
      a.node().click();

      // Garbage collection
      setTimeout(function() {
        window.URL.revokeObjectURL(url);
      }, 10);
    });
}

// When the "Download SVG" link is clicked, download the visualizations
$('#downloadLink').click(function() {
  downloadVisualizations(saveSVG);
});


////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
//
// PNG DOWNLOAD CODE
//

// Generalized post code to handle PNG download for each visualization
var savePNG = function(divContainerId, saveFileName) {
  var svg = grabSVG(saveFileName).node();
}

// When the "Download PNG" link is clicked, download the visualizations
$('#downloadLinkPNG').click(function() {
  console.log('clicky');
});