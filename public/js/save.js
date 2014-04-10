// Generalized post code to handle SVG download for each visualization
function saveSVG(divContainerId, saveFileName) {
  // harvest the SVG from the subnetwork
  var svg = null,
      name = '';

  // Switch statement hack to change SVG search based on viz
  if (saveFileName == 'subnetwork.svg') {
    svg = d3.select('div#'+divContainerId).select('#figure').node();
  } else if (saveFileName == 'mutation-matrix.svg') {
    svg = d3.select('div#'+divContainerId).select('svg#mutation-matrix').node();
  } else if (saveFileName == 'transcript-annotation.svg') {
    console.log()
    svg = d3.selectAll('div#'+divContainerId).selectAll('svg')[0][0];
  } else {
    svg = d3.select('div#'+divContainerId).select('#figure').node();
  }

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

// error message box
var checkMessage = d3.select('div#saveErrMsgContainer')
      .append('p')
          .style('background', 'rgb(242, 222, 222)')
          .style('border', '1px solid rgb(205, 174, 179)')
          .style('border-radius', '4px')
          .style('display', 'none')
          .style('padding', '5px')
          .text('Error: No visualizations selected.');

// event handlers that send and listen for POST requests
$('#downloadLink').click(function() {
  var saveCheckboxes = d3.selectAll('ul#saveOptList li label input');

  var saveResponses = saveCheckboxes[0],
      CNA_VIZ = 0,
      MUT_MTX = 1,
      SUB_NET = 2,
      TRN_ANT = 3;

  var saveAtLeastOne = saveResponses[CNA_VIZ].checked == true
      || saveResponses[TRN_ANT].checked == true
      || saveResponses[SUB_NET].checked == true
      || saveResponses[MUT_MTX].checked == true;

  if (saveAtLeastOne == false) {
    checkMessage.style('display', 'block');
    return;
  } else {
    checkMessage.style('display', 'none');
  }

  if (saveResponses[CNA_VIZ].checked == true) {
    // TODO implement
    //saveSVG('cna-viz', 'cna.svg');
  }
  if (saveResponses[TRN_ANT].checked == true) {
    saveSVG('transcript-plot', 'transcript-annotation.svg');
  }
  if (saveResponses[SUB_NET].checked == true) {
    saveSVG('subnetwork', 'subnetwork.svg');
  }
  if (saveResponses[MUT_MTX].checked == true) {
    saveSVG('mutation-matrix', 'mutation-matrix.svg');
  }
});