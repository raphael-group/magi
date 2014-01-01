var mutSymbols = {"Nonsense_Mutation": 0, "Frame_Shift_Del": 1, "Frame_Shift_Ins": 1, "Missense_Mutation": 2,
                  "Splice_Site": 3, "In_Frame_Del": 4, "In_Frame_Ins": 4}
var inactivating = {"Nonsense_Mutation": true, "Frame_Shift_Del": true, "Frame_Shift_Ins": true, "Missense_Mutation": false,
                    "Splice_Site": true, "In_Frame_Del": false, "In_Frame_Ins": false}

function annotate_transcript(el, gene, mutations, proteinDomains, length, styling){
    // Parse styles into shorter variable handles
    var style          = styling.global
    , plotStyle        = styling.lolliplot
    , sampleType2color = style.colorSchemes.sampleType
    , margin           = plotStyle.margin
    , width            = plotStyle.width
    , height           = plotStyle.height - 2 * margin
    , genomeHeight     = plotStyle.genomeHeight
    , radius           = plotStyle.radius
    , resolution       = Math.floor(width / (radius*2));

    // Defining a scale to be used for the zoom functionality
    var start = 0
    , stop = length;

    var x = d3.scale.linear()
        .domain([start, stop])
        .range([margin, width - margin]);

    var sequenceScale = d3.scale.linear()
        .domain([start, stop])
        .range([0, length]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(5)
        .tickSize(0)
        .tickPadding(1.25);

    // Defining zoom behavior with D3's built-in zoom functionality
    var zoom = d3.behavior.zoom()
        .x(x)
        .scaleExtent([1, 100])
        .on("zoom", function(){ update_transcript(svg); });

    // Drawing the box to hold the lolliplot
    var svg = el.append("svg")
        .attr("class", "lollibox")
        .attr("id", gene + "-transcript")
        .attr("width", width)
        .attr("height", height + 2*margin)
        .call(zoom);

    // Add a background
    var background = svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("class", "background")
        .style("fill", style.bgColor);

    // The transcript
    var transcript = svg.append("rect")
        .attr("class", "transcript")
        .attr("y", height/2)
        .attr("x", x(start))
        .attr("width", x(stop)-x(start))
        .attr("height", genomeHeight - margin)
        .style("fill", style.blockColorLight);

    // This is the text for the actual protein sequence
    // var sequence = svg.selectAll("text")
    //     .data(sample["sequence"]).enter()
    //     .append("text")
    //     .text(function(d){ return d })
    //     .attr("y", height - genomeHeight*1.5)
    //     .style("fill-opacity", 0);

    // This is the text for the actual protein sequence
    // var sequence = svg.selectAll("text")
    //     .data(sample["sequence"]).enter()
    //     .append("text")
    //     .text(function(d){ return d })
    //     .attr("y", height - genomeHeight*1.5)
    //     .style("fill-opacity", 0);

    // This draws the actual xaxis
    var xaxis = svg.append("g")
        .attr("class", "xaxis")
        .attr("transform", "translate(5," + (height/2 + genomeHeight +2) + ")")
        .style("font-size", "12px")
        .style("fill", "#000")
        .call(xAxis);

    var gene_name = gene
    , data_set = mutations.slice();

    // These are the actual symbols that
    // we'll plot along the gene, that represent
    // a specific mutation
    var symbols = svg.selectAll(".symbols")
        .data(data_set).enter()
        .append("path")
        .attr("class", "symbols")
        .attr("d", d3.svg.symbol()
            .type(function(d, i){
                    // This references the dictionary we created before
                    // to create the appropriate shape
                    return d3.svg.symbolTypes[mutSymbols[d.ty]];
                })
                .size(radius*radius)
        )
        .style("stroke", function(d, i){ return sampleType2color[d.cancer]; })
        .style("fill", function(d, i){ return sampleType2color[d.cancer]; })
        .style("stroke-width", 2)
    
    // This draws all the appropriate domains
    // from the domain data
    var domainGroups = svg.selectAll(".domains")
        .data(proteinDomains.slice()).enter()
        .append("g")
        .attr("class", "domains")

    var domains = domainGroups.append("rect")
        .attr("id", function(d, i){ return "domain-" + i; })
        .attr("width", function(d, i){
            return x(d.end) - x(d.start);
        })
        .attr("height", genomeHeight + margin)
        .style("fill-opacity", .5)
        .style("fill", style.blockColorMedium);

    var domainLabels = domainGroups.append("text")
            .attr("id", function(d, i){ return "domain-label-" + i; })
            .attr("y", height/2 + 2.5*margin)
            .attr("text-anchor", "middle")
            .style("fill-opacity", 0)
            .style("fill", style.textColorStrongest)
            .text(function(d, i){  return d.name });

    domainGroups.on("mouseover", function(d, i){
            d3.select(this).selectAll("rect").style("fill", style.highlightColor)
            el.select("#domain-label-" + i).style("fill-opacity", 1)
        })
        .on("mouseout", function(d, i){
            d3.select(this).selectAll("rect").style("fill", style.blockColorMedium)
            el.select("#domain-label-" + i).style("fill-opacity", 0)
        });

    // This renders all the symbols, domains, rectangles,
    // and axes (rather, it tells them to update themselves)
    function update_transcript(){
        // Find the current scope of the zoom
        var curMin = d3.min( x.domain() )
        , curMax = d3.max( x.domain() )
        , curRes = Math.round( (curMax - curMin) /resolution );

        curRes = curRes ? curRes : 1;

        // This keeps track of how many mutations are
        // plotted at each spot, so that we can "stack" the
        // mutations on top of one another
        var topIndex = {}
        , bottomIndex = {}
        , Px = {}
        , Py = {};
        for (var i = Math.floor(curMin/curRes) - 5; i < Math.ceil(curMax/curRes) + 5; i++){
            topIndex[i] = 0;
            bottomIndex[i] = 0;
        }

        // We render all the glyphs in the selection "symbols"
        // We move them to their appropriate position and color them
        symbols.attr("transform", function(d, i){
                var indexDict = inactivating[d.ty] ? bottomIndex : topIndex
                , curIndex = Math.round(d.locus/curRes)
                , px = x(curIndex*curRes);

                if (inactivating[d.ty])
                  py = height/2 + (genomeHeight + indexDict[curIndex] * radius * 2 + 3 * margin + 10);
                else
                  py = height/2 - (indexDict[curIndex] * radius * 2 + 3 * margin + 5);
              
                indexDict[curIndex]++;
                
                // Store the x- and y-values for this symbol for later use constructing the tooltip
                Px[i] = px;
                Py[i] = py;

                return "translate(" + px + ", " + py + ")";
            })
            .style("fill", function(d){ return style.colorSchemes.sampleType[d.cancer]; })
            .style("stroke", function(d){ return style.colorSchemes.sampleType[d.cancer]; })
            .style("stroke-opacity", 1)
            .style("fill-opacity", 1)

        if (symbols.tooltip)
            symbols.tooltip(function(d, i) {
                var tip = d.sample + "<br/>" + d.ty.replace(/_/g, " ") + "<br/>" + d.locus + ": " + d.aao + ">" + d.aan;
                return {
                    type: "tooltip",
                    text: tip,
                    detection: "shape",
                    placement: "fixed",
                    gravity: "right",
                    position: [Px[i], Py[i]],
                    displacement: [3, -25],
                    mousemove: false
                };
            });


        // Everything outside the boundaries we ignore
        symbols.filter(function(d, i){  return !(curMin < d.locus && curMax > d.locus);  })
            .style("stroke-opacity", 0)
            .style("fill-opacity", 0);

        // updating the axis
        xaxis.call(xAxis);

        // updating the transcript
        transcript.attr("x", x(start)).attr("width", x(stop) - x(start));

        // updating the protein sequence
        // sequence.attr("x", function(d, i){ return x(sequenceScale(i)) })
        //     .style("fill-opacity", function(d, i){ return (cur_res < 5) ? 0.5 : 0 });

        // // updating the domains
        domains.attr("transform", function(d, i){
            return "translate(" + x(d.start) + "," + (height/2 - margin) + ")"
        });

        domains.attr("width", function(d, i){ return x(d.end) - x(d.start); });
        
        domainLabels.attr("x", function(d, i){
                // place the label in the center of whatever portion of the domain is shown
                var x1 = d3.max( [d.start, curMin] )
                ,   x2 = d3.min( [d.end, curMax] );
                return x(x1 + (x2-x1)/2);
            })
    }

    // Get the party started
    update_transcript();

}

// Draw a transcript legend using ONLY the mutation classes used for the given transcripts
function lolliplot_legend( el, gene2transcripts, styling ){
    // Declaration 
    // Parse styles into shorter variable handles
    var style         = styling.global
    , plotStyle       = styling.lolliplot
    , sampleType2color = style.colorSchemes.sampleType
    , margin          = plotStyle.margin
    , width           = plotStyle.width
    , symbolHeight    = plotStyle.legendSymbolHeight;

    // Extract cancer types and mutation classes
    var cancerTys = []
    , mutationTys = [];

    for ( var g in gene2transcripts ){
        for ( var T in gene2transcripts[g] ){
            for ( var i = 0; i < gene2transcripts[g][T].mutations.length; i++  ){
                var M = gene2transcripts[g][T].mutations[i];
                if (cancerTys.indexOf(M.cancer) == -1) cancerTys.push( M.cancer );
                if (mutationTys.indexOf(M.ty) == -1) mutationTys.push( M.ty );
            }
        }
    }
    var multiCancer = cancerTys.length > 1
    , numTys = mutationTys.length
    , numRows = Math.ceil(numTys/2);

    // Add the SVG
    var height = numRows * symbolHeight;
    var svg = el.append("svg")
        .attr("class", "legend")
        .style("width", width)
        .style("height", height + 2*margin)
        .attr("font-size", 10);

    var legend = svg.selectAll(".symbol-group")
        .data(mutationTys).enter()
        .append("g")
        .attr("transform", function(d, i){
            var x = (i % numRows) * width / numRows + 2 * margin;
            var y = Math.round(i/numTys) * symbolHeight + (Math.round(i/numTys)+2) * margin;
            return "translate(" + x + ", " + y + ")";
        });

    legend.append("path")
        .attr("class", "symbol")
        .attr("d", d3.svg.symbol()
            .type(function(d, i){ return d3.svg.symbolTypes[mutSymbols[d]]; })
            .size(2 * symbolHeight)
        )
        .style("stroke", function(d, i){
            return multiCancer ?  style.blockColorMedium : sampleType2color[cancerTys[0]];
        })
        .style("stroke-width", 2)
        .style("fill", function(d, i){
            return multiCancer ?  style.blockColorMedium : sampleType2color[cancerTys[0]];
        });

    legend.append("text")
        .attr("dx", 7)
        .attr("dy", 3)
        .text(function(d){ return d.replace(/_/g, " "); });

}

