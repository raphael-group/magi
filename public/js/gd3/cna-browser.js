

var browserW = 1200;
var browserH = 200;
var browserLeftW = 300;
var browserHeaderText = 150;
var browserRightAreaW = browserW - browserLeftW - 10; // -10 for scroll bar
var browserLeftAreaW = browserLeftW;
var browserLeftAreaH = browserH;
var browserSVG;

var geneBarW = browserRightAreaW;
var geneBarH = 75;
var geneBarSVG;

var highlighted_gene;
var browserViewW = browserRightAreaW;
var browserViewH = browserH - geneBarH;
var browserViewSVG;

var ids = {
 browserContainer: 'browserContainer',
 browserHeaderContainer: 'browserHeaderContainer',
 //browserInfoContainer: 'browserInfoContainer',
 browserLeftAreaContainer: 'browserLeftAreaContainer',
 browserLeftAreaGenes: 'browserLeftAreaGenes',
 browserLeftAreaHeader: 'browserLeftAreaHeader',
 browserRightAreaContainer: 'browserRightAreaContainer',
 browserViewContainer: 'browserViewContainer',
 container : 'cnas-svg',

 geneBarContainer: 'geneBarContainer',
 geneBarSVG: 'geneBarSVG',
 browserViewSVG: 'browserView',
 headerInfoContainer: 'headerInfoContainer',
 rangeInfoContainer: 'rangeInfoContainer',

 browserLeftAreaGenes: 'browserLeftAreaGenes'
}

var colors = {
 black: '#000000',
 deepTufts: '#1B75BB',
 grayMedium: '#CCCCCC',
 nearBlack: '#555555',
 segBlack: '#777777',
 nearWhite: '#EEEEEE',
 offBlack: '#2D2D2D',
 red: '#FF0000',
 smokeyWhite: '#E7E5E6',
 white: '#FFFFFF',
 yellow: '#FFCC33',
 darkred: '#B82E00',
 darkblue: '#003DF5'
}

var seg = {};
var sample2ty = {};
var region = {};
var geneJSON = null;
var segJSON = new Array();
var seg_label = {};
var cliqJSON = null;
var maxpeakJSON = new Array();
var cliqUniCNA = {};
var cliqUpCNA = {};
var cliqDownCNA = {};
var weightedSeg = {};
var patOrder = new Array();
var cliqColor = {};
var peakLabel = {};
var chrm = "";
var typeCNA = "";
var wSegY = new Array();
var tmpwSegY = 0;

var xDomainStart = 0;
var xDomainEnd = browserViewW;
var allmin = 0;
var allmax = 0;

function set_s2ty(in_sample2ty){
  sample2ty = in_sample2ty;
}
    
function cna_browser(el, in_sample2ty, selectedG, gene, cliq, in_seg, in_region, width){
  // Convert existing gene data into a JSON object
  seg = in_seg;
  region = in_region;
  sample2ty = in_sample2ty;
  
  geneJSON = gene.map(function(d) {
    return { 'x0':d[0], 'x1':d[1], 'label':d[2], 'selected':d[2]==selectedG ? 'true': 'false' };
  });

  cliqJSON = cliq.map(function(d) {
    return { 'x0':d[0], 'x1':d[1], 'color':d[2], 'label':d[3]};
  });
  
  for (var i = 0; i < cliq.length; i++){
    cliqColor[cliq[i][3]] = cliq[i][2];    
  }
  
  var segHCount = 0;
  
  for (var i = 0; i < seg.length; i++){
    segHCount+=7;
    for (var j = 0; j < seg[i]['seg'].length; j++){
      segJSON.push({'x0':seg[i]['seg'][j]['x0'], 'x1':seg[i]['seg'][j]['x1'], 'label': seg[i]['seg'][j]['label'], 'y': segHCount, 'pat': seg[i]['pat']});                
      seg_label[seg[i]['seg'][j]['label']] = {'x0':seg[i]['seg'][j]['x0'], 'x1':seg[i]['seg'][j]['x1'], 'y': segHCount};
      wSegY.unshift({});
    }
  }

  tmpwSegY = segHCount;
  segHCount += 23

  allmin = region[0];
  allmax = region[1]
  
  wSegY.push({'x0': allmin, 'x1':allmax, 'y':tmpwSegY});        


  typeCNA = region[3];
  chrm = region[2];
  
  for (var i=0; i<cliqJSON.length; i++){
    console.log(i);
    maxpeakJSON.unshift({});
    segJSON.unshift({});
    wSegY.unshift({});
  }

  function getShownCliq(dsrc, min, max) { // return cliques that are shown in the range
    var scliq = {}
    for (var i=0; i < dsrc.length; i++){
      if (!(dsrc[i].x0 > max || min > dsrc[i].x1)){        
        scliq[dsrc[i].label] = '1';
      }
    }
    return scliq;
  }
  browserW = width;
  //shownCliq = drawCliqData(cliqJSON, , maxpeakJSON); 
  shownCliq = getShownCliq(cliqJSON, allmin, allmax); 
  test = regenerate(shownCliq, cliqJSON, segJSON, allmin, allmax, maxpeakJSON);  
  browserH = test[2] + geneBarH;
  //browserH = 400;//regenerate(shownCliq, cliqJSON, segJSON, allmin, allmax, maxpeakJSON)[1];  

  browserRightAreaW = browserW - browserLeftW - 10; // -10 for scroll bar
  browserLeftAreaW = browserLeftW;
  browserLeftAreaH = browserH;

  geneBarW = browserRightAreaW;
  browserViewW = browserRightAreaW;
  browserViewH = browserH - geneBarH;

  var div_browserContainer = document.createElement('div'),
  //var div_browserContainer = el.append('div')
      div_browserHeaderContainer = document.createElement('div'),
      div_browserInfoContainer = document.createElement('div'),

      div_browserLeftAreaContainer = document.createElement('div'),
      div_browserRightAreaContainer = document.createElement('div'),
      div_browserViewContainer = document.createElement('div'),

      div_rangeInfoContainer = document.createElement('div'),
      div_geneBarContainer = document.createElement('div'),
      div_headerInfoContainer = document.createElement('div');


  div_browserContainer.setAttribute('id', ids.browserContainer);
  div_browserHeaderContainer.setAttribute('id', ids.browserHeaderContainer);
  //div_browserInfoContainer.setAttribute('id', ids.browserInfoContainer);
  div_browserLeftAreaContainer.setAttribute('id', ids.browserLeftAreaContainer);
  div_browserRightAreaContainer.setAttribute('id', ids.browserRightAreaContainer);
  div_browserViewContainer.setAttribute('id', ids.browserViewContainer);
  div_geneBarContainer.setAttribute('id', ids.geneBarContainer);
  div_headerInfoContainer.setAttribute('id', ids.headerInfoContainer);
  div_rangeInfoContainer.setAttribute('id', ids.rangeInfoContainer);

  div_browserContainer.appendChild(div_browserHeaderContainer);
  div_browserContainer.appendChild(div_browserInfoContainer);
  div_browserContainer.appendChild(div_browserLeftAreaContainer);
  div_browserContainer.appendChild(div_browserRightAreaContainer);
  div_browserHeaderContainer.appendChild(div_headerInfoContainer);
  div_browserHeaderContainer.appendChild(div_rangeInfoContainer);
  div_browserHeaderContainer.appendChild(div_geneBarContainer);
  
  
  var fullBrowserH = browserH+1,
      leftBrowserH = browserH - geneBarH;
  document.getElementById(ids.container).setAttribute("style", "height:"+fullBrowserH+"px");
  document.getElementById(ids.container).setAttribute("style", "width:"+browserW+"px");
  div_browserContainer.setAttribute("style", "width:" + browserW + "px");
  div_browserContainer.setAttribute("style", "height:" + fullBrowserH + "px");
  div_browserContainer.setAttribute("style", "float:left");
  div_browserRightAreaContainer.setAttribute("style", "width:" + browserRightAreaW + "px");
  div_browserRightAreaContainer.setAttribute("style", "height:" + leftBrowserH + "px");
  //div_browserLeftAreaContainer.setAttribute("style", "height:" + leftBrowserH + "px");

  document.getElementById(ids.container).appendChild(div_browserContainer);
  

  BrowserHeader();    
  BrowserInfo(el, browserH);
  //BrowserLeftArea();
  BrowserView('#' + ids.browserRightAreaContainer);
    
}

////////////////////////////////////////////////////////////////////////////
// Copy Number View
function BrowserHeader() {
  //d3.select('#'+ids.headerInfoContainer).append('h1')
  //  .text("BrunoBrowser");
  //var divHeader = document.getElementById(ids.headerInfoContainer);
  //divHeader.setAttribute("style","width:" + browserHeaderText + "px"); 
  d3.select('#'+ids.rangeInfoContainer);
    //.text("Selection");
  var divRange = document.getElementById(ids.rangeInfoContainer);
  divRange.setAttribute("style","width:" + 4*browserHeaderText + "px");  
  d3.select('#'+ids.rangeInfoContainer).text("Chromosome: "+ chrm + ", Start-End: " +allmin + "-" + allmax);
  GeneBar('#' + ids.browserHeaderContainer);
}

function BrowserInfo(el) {
  var mutationRectWidth = 10
    , legend_font_size = 11
    , left = browserW-100;

    // Add legend SVG
    var mutationLegend = el.append("svg")
        .attr("id", "mutation-legend")
        .attr("width", 200)
        .attr("height", browserH)
        .style("margin-right", 10)        
        .style("float", "left")
        
    mutationLegend.append("text")
        .attr("x", 10)
        .attr("y", 35)
        .style("fill", "#555")
        .style("font-size", legend_font_size)
        .text("Zoom in/out");
    mutationLegend.append("text")
        .attr("x", 10)
        .attr("y", 55)
        .style("fill", "#555")
        .style("font-size", legend_font_size)
        .text("Gene");
    mutationLegend.append("text")
        .attr("x", 10)
        .attr("y", 105)
        .style("fill", "#555")
        .style("font-size", legend_font_size)
        .text("Copy number aberrations");

    left += mutationRectWidth + 10 + 10 + 25;
}

////////////////////////////////////////////////////////////////////////////
// Copy Number View

function drawCliqData(dataSrc, minVal, maxVal, dataMax) {
  // Normalize a gene location value for positioning in the gene mark bars
  function normalize(d, min, max) {
    var norm = d3.scale.linear().domain([min, max]).range([0, browserViewW]);
    return norm(d);
  }
  function getShownCliq(dsrc, min, max) { // return cliques that are shown in the range
    var scliq = {}
    for (var i=0; i < dsrc.length; i++){
      if (!(dsrc[i].x0 > max || min > dsrc[i].x1)){        
        scliq[dsrc[i].label] = '1';
      }
    }
    return scliq;
  }

  //var maxSegYLoc = d3.max(segJSON, function(d) { return d.y; });  
  var shownCliq = getShownCliq(dataSrc, minVal, maxVal);

  /*
  browserViewSVG.selectAll('rect')
    .data(dataSrc)
    .enter().append('rect')
      .attr('fill', function (d) {return d.color;}) 
      .attr('x', function(d) {return normalize(d.x0, minVal, maxVal);})
      .attr('y', function(d) {return d.y;})
      .attr('width', function(d) {
          var w = normalize(d.x1, minVal, maxVal) - normalize(d.x0, minVal, maxVal);
          return w < 1 ? 1 : w;})
      .attr('height', maxSegYLoc)
      .attr('id', function (d) { return d.label; })
    .append('title')
      .text(function(d) { return d.label });
  */
  /*
  browserViewSVG.selectAll('rect')
    .data(dataMax)
    .enter().append('rect')
      .attr('fill', 'rgba(187,187,187, 0.5)')
      .attr('x', function(d) {return normalize(d.x0, minVal, maxVal);})
      .attr('y', function(d) {return d.y;})
      .attr('width', function(d) {
          var w = normalize(d.x1, minVal, maxVal) - normalize(d.x0, minVal, maxVal);
          return w < 1 ? 1 : w;})
      .attr('height', maxSegYLoc)
      .attr('id', function (d) { return d.label; })
    .append('title')
      .text(function(d) { return d.gene }); 
  */
  return shownCliq;
}


function BrowserView(divContainer) {
  function getShownCliq(dsrc, min, max) { // return cliques that are shown in the range
    var scliq = {}
    for (var i=0; i < dsrc.length; i++){
      if (!(dsrc[i].x0 > max || min > dsrc[i].x1)){        
        scliq[dsrc[i].label] = '1';
      }
    }
    return scliq;
  }
  //var maxSegXLoc = d3.max(segJSON, function(d) { return d.x1; });
  //var maxSegYLoc = d3.max(segJSON, function(d) { return d.y; });
  //var minSegXLoc = d3.min(segJSON, function(d) { return d.x0; });
  var maxSegXLoc = region[1];
  var minSegXLoc = region[0];
  shownCliq = getShownCliq(cliqJSON, minSegXLoc, maxSegXLoc); 
  test = regenerate(shownCliq, cliqJSON, segJSON, minSegXLoc, maxSegXLoc, maxpeakJSON);  
  var maxSegYLoc = test[2];

  browserViewSVG = createSvg('browserView', browserViewW, maxSegYLoc,//browserViewH, 
                              colors.white, divContainer);

  drawData(cliqJSON, segJSON, minSegXLoc, maxSegXLoc, maxpeakJSON, wSegY);  
}

Array.prototype.hasObject = (
	!Array.indexOf ? function (o){
		var l = this.length + 1;
		while (l -= 1){
			if (this[l - 1] === o){
				return true;
			}
		}
    	return false;
	  } : function (o){
		return (this.indexOf(o) !== -1);
	  });

function regenerate(scliq, dcliq, dseg, min, max, dmax){
  /*
  var tmp_weighted_seg_unq = new Array();
  var tmp_weighted_seg_up = new Array();
  var tmp_weighted_seg_down = new Array();
  seg_label = {};
  Object.keys(scliq).forEach(function(k){
    //console.log(k+"\n")
    cliqUniCNA[k].forEach(function (element) {
		tmp_weighted_seg_unq.push(element);
    })      
    cliqUpCNA[k].forEach(function (element) {
	  tmp_weighted_seg_up.push(element);
    })      
    cliqDownCNA[k].forEach(function (element) {
	  tmp_weighted_seg_down.push(element);
    })      
  });
  */  
  var newsegJSON = new Array()
  var newwSegY = new Array()
  var tmp_patOrder_inside = {};

  for (var i = 0; i < seg.length; i++){ // patient
    var hasop = 0;
    for (var j = 0; j < seg[i]['seg'].length; j++){
      
      if (!(min > seg[i]['seg'][j]['x1'] || max < seg[i]['seg'][j]['x0'])){ // inside selected region
        hasop = 1
      }
    }    
    if (hasop == 1){
      tmp_patOrder_inside[i] = '1'
    }
  }
  
  var segHCount = 0;
  var tmpwSegY = segHCount;
  //segHCount += 23

  Object.keys(tmp_patOrder_inside).forEach(function(i) {
    segHCount+=7;
    for (var j = 0; j < seg[i]['seg'].length; j++){
      newsegJSON.push({'x0':seg[i]['seg'][j]['x0'], 'x1':seg[i]['seg'][j]['x1'], 'label': seg[i]['seg'][j]['label'], 'y': segHCount, 'pat': seg[i]['pat']});   
      seg_label[seg[i]['seg'][j]['label']] = {'x0':seg[i]['seg'][j]['x0'], 'x1':seg[i]['seg'][j]['x1'], 'y': segHCount};
      newwSegY.unshift({});
    }
  })
    
  newwSegY.push({'x0': min, 'x1':max, 'y':tmpwSegY});  
  
  //for (var i=0;i<dcliq.length;i++){
    //newsegJSON.unshift({});
    //newwSegY.unshift({}); 
  //}
  
  return [newsegJSON, newwSegY, segHCount+7];
}

function drawData(dataCliq, dataSeg, minVal, maxVal, dataMax, dataSegY) {
  allmin = minVal;
  allmax = maxVal;
  browserViewSVG.selectAll('rect').remove();
  browserViewSVG.selectAll('path').remove();

  function getShownCliq(dsrc, min, max) { // return cliques that are shown in the range
    var scliq = {}
    for (var i=0; i < dsrc.length; i++){
      if (!(dsrc[i].x0 > max || min > dsrc[i].x1)){        
        scliq[dsrc[i].label] = '1';
      }
    }
    return scliq;
  }

  shownCliq = getShownCliq(dataCliq, minVal, maxVal); 
  //Object.keys(shownCliq).forEach(function(d){alert(d);});
  test = regenerate(shownCliq, dataCliq, dataSeg, minVal, maxVal, dataMax);  
  //shownSeg, shownSegY
  drawSegData(test[0], minVal, maxVal, test[1]);
  //console.log(seg[0]['seg'][0]['x0']);
  //BrowserLeftArea(minVal, maxVal, 1);
  //drawSegData(dataSeg, minVal, maxVal, dataSegY);
}

function drawSegData(dataSrc, minVal, maxVal, dataSegY) {
  // Normalize a gene location value for positioning in the gene mark bars
  function normalize(d, min, max) {
    var norm = d3.scale.linear().domain([min, max]).range([0, browserViewW]);
    return norm(d);
  }

  function setX(w){
    return w < 1? 1: w/2;
  }
  var Px = {}
  , Py = {};
  var rec2 = browserViewSVG.selectAll('rect')
    .data(dataSrc)
    .enter().append('rect')
      //.attr('fill', function (d) {return d.color;}) 
      .attr('fill', function(d){return coloring["cancer"][sample2ty[d.pat]]})
      //.attr('fill', blockColorLight)
      .attr('x', function(d, i) {Px[i] = setX(normalize(d.x1, minVal, maxVal)-normalize(d.x0, minVal, maxVal)); return normalize(d.x0, minVal, maxVal);})
      .attr('y', function(d, i) {Py[i] = d.y; return d.y;})
      .attr('width', function(d) {
          var w = normalize(d.x1, minVal, maxVal) - normalize(d.x0, minVal, maxVal);
          return w < 1 ? 1 : w;})
      .attr('height', 5)
      .attr('id', function (d) { return d.label; })
      //.append('title')
      //.text(function(d) { return d.pat });
  
  if (rec2.tooltip)
    rec2.tooltip(function(d, i) {
        var tip = d.pat +"<br/> subtype: "+sample2ty[d.pat]+ "<br/> start: " + d.x0 + "<br/> end:    " + d.x1;
        return {
            type: "tooltip",
            text: tip,
            detection: "shape",
            placement: "mouse", 
            gravity: "right",
            position: [0, 0],
            displacement: [3, 12],
            mousemove: false
        };
    });

  /*
  browserViewSVG.selectAll('rect')
    .data(dataSegY)
    .enter().append('rect')
    .attr('fill', colors.yellow)
    .attr('stroke', colors.yellow)
    .attr('x', function(d) { return normalize(d.x0, minVal, maxVal);})
    .attr('y', function(d) { return d.y+15;})
    .attr('width', function(d) {
          var w = normalize(d.x1, minVal, maxVal) - normalize(d.x0, minVal, maxVal);
          return w < 1 ? 1 : w;})
    .attr('height', 2)
    .attr('id', 'sep');  
  */

  /*browserViewSVG.selectAll('point')
    .data(dataSrc)
    .enter().append("path")
    .attr('class', 'point')
    .attr("d", d3.svg.symbol().type("triangle-up").size(function(d){return normalize_ar(minVal, maxVal);}))
    //.style('stroke', 'rgba(0,0,0,0.2)')
    .style('fill', 'rgba(0,0,0,0.3)')
    .attr("transform", function(d) { return "translate(" + (normalize(d.x0, minVal, maxVal)-2) + "," + (d.y+2) + ") rotate(-90)"; })
    .attr('id', function(d){return 'l'+d.label;});     
  browserViewSVG.selectAll('point')
    .data(dataSrc)  
    .enter().append("path")
    .attr('class', 'point')
    .attr("d", d3.svg.symbol().type("triangle-up").size(function(d){return normalize_ar(minVal, maxVal);}))
    //.style('stroke', 'rgba(0,0,0,0.2)')
    .style('fill', 'rgba(0,0,0,0.3)')
    .attr("transform", function(d) { return "translate(" + (normalize(d.x1, minVal, maxVal)+2) + "," + (d.y+2) + ") rotate(90)"; })
    .attr('id', function(d){return 'r'+d.label;});     
  */
}

////////////////////////////////////////////////////////////////////////////
// GeneBar

function GeneBar(divContainer) {
    var height = geneBarH,
        margin = {top: 5, right: 5, bottom: 5, left: 0},
        width  = geneBarW;
    
    var overviewH = 20,
        overviewW = geneBarW - margin.left - margin.right;
    
    var detailsH = 40,
        detailsW = geneBarW - margin.left - margin.right,
        detailsMargin = {top: overviewH + margin.top*2, left: margin.left, right: margin.right};

    var maxGeneXLoc = allmax; //d3.max(geneJSON, function (geneTuple) { return geneTuple.x1; });
    var minGeneXLoc = allmin; //d3.min(geneJSON, function (geneTuple) { return geneTuple.x0; });
    
    // Normalize a gene location value for positioning in the gene mark bars
    function normalize(d, min, max) {
        var norm = d3.scale.linear().domain([min, max]).range([0, width - margin.left - margin.right]);
        return norm(d);
    }
    
    var geneBarSVG = createSvg(ids.geneBarSVG, width, height, colors.NearBlack, divContainer);
    //geneBarSVG.setAttribute('id', ids.geneBarSVG);
    geneBarSVG.id = ids.geneBarSVG; 
    // Render details BG
    geneBarSVG.append('rect')
        .attr('fill', colors.white)
        .attr('height', detailsH)
		.attr('stroke', colors.nearWhite)
        .attr('width', detailsW)
        .attr('x', detailsMargin.left)
		.attr('y', detailsMargin.top);
    // Render overview BG
    geneBarSVG.append('rect')
        .attr('fill', colors.white)
        .attr('height', overviewH)
		.attr('stroke', colors.nearWhite)
        .attr('width', overviewW)
        .attr('x', margin.left)
		.attr('y', margin.top);
    
    var geneBarOverview = geneBarSVG.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .attr('id', ids.geneBarOverview),
        geneBarDetails = geneBarSVG.append('g')
            .attr('transform', 'translate(' + detailsMargin.left + ',' + detailsMargin.top + ')');

    var brush = d3.svg.brush()
            .on('brushstart', brushstart)
            .on('brush', brushmove)
            .on('brushend', brushend),
        area = d3.svg.area()
            .interpolate('monotone')
            .x0(function(d) { return 100; })
            .x1(function(d) { return 300; })
            .y0(height)
            .y1(function(d) { return 100; });
    var x = d3.scale.linear()
            .range([0, width]);
   
    var geneStripeColor = colors.nearBlack; 

    geneBarOverview.selectAll('rect')
        .data(geneJSON)
        .enter().append('rect')
        .attr('fill', function (d) {return d.selected === 'true' ? selectedColor : geneStripeColor;})
        //.attr('stroke', colors.smokeyWhite)
        .attr('x', function(d) {return normalize(d.x0, minGeneXLoc, maxGeneXLoc);})
        .attr('y', 0)
        .attr('width', function(d) {var w = normalize(d.x1, minGeneXLoc, maxGeneXLoc) - normalize(d.x0, minGeneXLoc, maxGeneXLoc);
                                    return w < 1 ? 1 : w;})
        .attr('height', overviewH)
        .attr('id', function (d) { return d.label; });
    
    geneBarOverview.append('g')
        .attr('class', 'brush')
        .call(d3.svg.brush().x(x)
        .on('brushstart', brushstart)
        .on('brush', brushmove)
        .on('brushend', brushend))
        .selectAll('rect')
        .attr('height', overviewH)
        .attr('fill', blockColorLight)
        .attr('stroke', blockColorStrong)
        .style('fill-opacity', .5);
    
    
    drawDetailsBar(geneJSON, minGeneXLoc, maxGeneXLoc);
    

    function drawDetailsBar(dataSrc, minVal, maxVal) {
        
        var Px = {};
        var rec = geneBarDetails.selectAll('rect')
        .data(dataSrc)
        .enter().append('rect')
        .attr('fill', function (d) {return d.selected === 'true' ? selectedColor : geneStripeColor;})
        .attr('x', function(d, i) {Px[i] = detailsMargin.left + normalize(d.x0, minVal, maxVal); return detailsMargin.left + normalize(d.x0, minVal, maxVal);})
        .attr('y', 0)
        .attr('width', function(d) {var w = normalize(d.x1, minVal, maxVal) - normalize(d.x0, minVal, maxVal);
                                    return w < 1 ? 1 : w;})
        .attr('height', detailsH)
        //.append('title').text(function(d) { return d.label;  })
        .attr('id', function (d) { return d.label; });
     

        if (rec.tooltip)
            rec.tooltip(function(d, i) {
                var tip = d.label;
                return {
                    type: "tooltip",
                    text: tip,
                    detection: "shape",
                    placement: "mouse",
                    gravity: "right",
                    position: [0, 0],
                    displacement: [3, 25],
                    mousemove: false
                };
            });

    }
    
    function brushstart() {
      geneBarOverview.classed('selecting', true);
    }
    
    function brushmove() {
      var s = d3.event.target.extent();
      geneBarOverview.classed('selected', function(d) { return s[0] <= d && d <= s[1]; });
      geneBarDetails.selectAll('rect').remove();
      if(s[0] == s[1]) { // If there is no selection (i.e., start or end brush)
        drawDetailsBar(geneJSON, minGeneXLoc, maxGeneXLoc);
        xDomainStart = minGeneXLoc;
        xDomainEnd = maxGeneXLoc;
        d3.select('#'+ids.rangeInfoContainer).text("Chromosome: "+ chrm + ", Start-End: " +xDomainStart + "-" + xDomainEnd);


        drawData(cliqJSON, segJSON, xDomainStart, xDomainEnd, maxpeakJSON, wSegY);

        //drawSegData(segJSON, xDomainStart, xDomainEnd);
      } else {
        var newData = geneJSON.filter(function(d) { return d.x0 <= minGeneXLoc+s[1]*(maxGeneXLoc-minGeneXLoc+1) && d.x1 >= minGeneXLoc+s[0]*(maxGeneXLoc-minGeneXLoc+1); });
        var maxNewX = d3.max(newData, function (geneTuple) { return geneTuple.x1; });
        var minNewX = d3.min(newData, function (geneTuple) { return geneTuple.x1; });
        xDomainStart = minNewX;
        xDomainEnd = maxNewX;
        d3.select('#'+ids.rangeInfoContainer).text("Chromosome: "+ chrm + ", Start-End: " +xDomainStart + "-" + xDomainEnd);
        //console.log(maxNewX);
        drawDetailsBar(newData, minNewX, maxNewX);
        drawData(cliqJSON, segJSON, minNewX, maxNewX, maxpeakJSON, wSegY);
        //drawSegData(segJSON, minNewX, maxNewX);
      }
    }
    
    function brushend() {
      geneBarOverview.classed('selecting', !d3.event.target.empty());
    }
}

////////////////////////////////////////////////////////////////////////////
// Left Bar
function ColorLuminance(hex, lum, op) {
  // validate hex string
  //hex = String(hex).replace(/[^0-9a-f]/gi, '');
  thex = hex.slice(5,-1).split(",");
  //alert(thex[0]);
  lum = lum || 0;
  // convert to decimal and change luminosity
  var rgb = "rgba(", c, i;
  //var rgb = "#", c, i;
  for (i = 0; i < 3; i++) {
    c = parseInt(thex[i]);
    //alert(c);
    //c2 = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
    c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255));
    //alert(c);
    //console.log(c2);
    thex[i] = c//("00"+c).substr(c.length);
  }  
  return rgb + thex[0] + "," + thex[1] + "," + thex[2] + ", " + op+")";
  //return rgb + thex[0] + thex[1] + thex[2];
}


function BrowserLeftArea() {

  function normalize(d, min, max) {
    var norm = d3.scale.linear().domain([min, max]).range([0, browserViewW]);
    return norm(d);
  }
  
  var div_genes = document.createElement('div');
  div_genes.setAttribute('id', ids.browserLeftAreaGenes);
  var genesH = browserH - geneBarH;
  div_genes.setAttribute('style', 'height:' + genesH + 'px');
  document.getElementById(ids.browserLeftAreaContainer).appendChild(div_genes);
  

  
  //d3.select('#'+ids.browserLeftAreaGenes).selectAll('div')
  //    .data(geneJSON)
  //    .enter().append('p')
  //    .attr('id', function(d) { return 'div_' + d.label; })
  //    .attr('class', 'geneListItem')
  //    .on('click', clickEvent)
  //    .text(function(d){return d.label;});
  // TODO (connor): make collapsable menubar s.t. buckets = target regions,
  //    contents = genes that intersect with that target region
  
}

////////////////////////////////////////////////////////////////////////////
// Utility Functions

function createSvg(c, width, height, bgColor) { // {string} className, width, height
	return d3.select('body').append('svg')
            .attr('class', c)
      		.attr('height', height)
            .attr('width', width)
    		.style('background', bgColor)
    		.style('display', "block")
    		.style('height', height)
    		.style('width', width);
}

function createSvg(c, width, height, bgColor, targetId) { // {string} className, width, height
	return d3.select(targetId).append('svg')
              .attr('class', c)
      		    .attr('height', height)
              .attr('width', width)
    	      	.style('background', bgColor)
    	      	.style('display', 'block')
    		      .style('height', height)
    	      	.style('width', width);
}