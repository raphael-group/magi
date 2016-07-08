// Logic for printing and saving figures
$(document).ready(function(){
  // Function to grab an SVG
  function grabSVG(selector){
    var svg = null;
    svg = d3.select('div#' + selector + ' svg');
    svg.attr('xmlns', 'http://www.w3.org/2000/svg');
    return svg.node();
  }

  // SAVE
  // Set up the save links
  var saveFigureForm = $('form#save-figure'),
      formatInput = $('form#save-figure input#format'),
      svgInput = $('form#save-figure input#svg');

  $('.save-figure-link').click(function(){
    // Extract this link's information
    var el = $(this),
        format = el.data('format'),
        selector = el.data('selector');
    // Extract the SVG
    // Submit POST request
    svgInput.val(grabSVG(selector).outerHTML);
    formatInput.val(format);
    saveFigureForm.submit();
  });

  // PRINT
  // adapted from https://svgopen.org/2010/papers/62-From_SVG_to_Canvas_and_Back/index.html#svg_to_canvas
  function importSVG(sourceSVG, targetCanvas) {
    var svg_xml = (new XMLSerializer()).serializeToString(sourceSVG);
    var ctx = targetCanvas.getContext('2d');

    // this is just a JavaScript (HTML) image
    var img = new Image();
    // https://developer.mozilla.org/en/DOM/window.btoa
    img.src = "data:image/svg+xml;base64," + btoa(svg_xml);

    img.onload = function() {
        // after this, Canvas’ origin-clean is DIRTY
        ctx.drawImage(img, 0, 0);
    }
    return img;
  }

  $('.print-figure-link').click(function(){
    // Extract this link's information
    var el = $(this),
        selector = el.data('selector');

    // Append
    var canvas = document.createElement('canvas'),
      img = importSVG(grabSVG(selector), canvas),
      w = window.open();

    w.document.body.appendChild(img);
    w.print(); //initiate print dialogue

  });
});
