// Oncoprinter adds the following to the given DOM element el:
// - an SVG oncoprint
// - an SVG mutation type legend *below* the oncoprint
// - an SVG sample type legend to the *right* of the oncoprint
//   (if the data includes multiple sample types)
// - a div that includes the coverage of the oncoprint
// - a div that includes a sorting interface to modify the oncoprint

function oncoprinter(el, M, sample2ty, coverage, styling, sampleTypes){
    // Parse the mutation matrix into shorter variable handles
    var genes = Object.keys(M)
    , samples = Object.keys(sample2ty).slice()
    , m = samples.length
    , n = genes.length;

    // Parse the styles into shorter variable handles
    var style              = styling.global
    , oncoStyle            = styling.oncoprint
    , sampleType2color     = style.colorSchemes.sampleType || {}
    , width                = oncoStyle.width
    , colorSampleTypes     = oncoStyle.colorSampleTypes
    , coocurringColor      = oncoStyle.coocurringColor
    , exclusiveColor       = oncoStyle.exclusiveColor
    , labelWidth           = oncoStyle.labelWidth
    , labelHeight          = oncoStyle.labelHeight
    , boxMargin            = oncoStyle.boxMargin
    , mutationLegendHeight = oncoStyle.mutationLegendHeight
    , geneHeight           = oncoStyle.geneHeight
    , minBoxWidth          = oncoStyle.minBoxWidth
    , sampleStroke         = oncoStyle.sampleStroke
    , animationSpeed       = oncoStyle.animationSpeed;

    // Determine how many cancer types are in the data (if not provided)
    tys = sampleTypes || [];
    for (var i = 0; i < samples.length; i++){
        if (tys.indexOf(sample2ty[samples[i]]) == -1)
            tys.push(sample2ty[samples[i]]);
    }
    tys.sort();

    // Create a sampleType -> color map if it wasn't provided
    var tysWithColor = tys.filter(function(t){ return t in sampleType2color; }).length;
    if (tysWithColor == 0){
        var colors = d3.scale.category20()
        , sampleType2color = {};
        for (var i = 0; i < tys.length; i++)
            sampleType2color[tys[i]] = colors(i);
    }

    // Default parameters for the images to be drawn
    var multiCancer = tys.length > 1 && colorSampleTypes
    , cancerLegendWidth = multiCancer ? 100 : 0
    , cancerTyLegendHeight = multiCancer ? (tys.length + 1) * 15 : 0
    , width = width - cancerLegendWidth
    , height = genes.length * geneHeight + boxMargin
    , tickWidth
    , samplesPerCol;
    
    // Map each gene to the samples they're mutated in
    var gene2cases = {};
    for (i = 0; i < genes.length; i++){
        gene2cases[genes[i]] = Object.keys(M[genes[i]]);
    }

    /**** Parse and sort the mutation data ****/    
    // Sort genes by mutation frequency and create a map of genes to their order
    var gene2index = {};
    genes.sort(function(g1, g2){
        return d3.descending(gene2cases[g1].length, gene2cases[g2].length);
    });

    for (i = 0; i < genes.length; i++) gene2index[genes[i]] = i;

    // Find the index of the gene with highest mutation frequency in each sample
    var sample2gene_index = {};
    for ( i = 0; i < samples.length; i++ ){
        var s = samples[i]
        , gene_indices = genes.map(function(g){
            return gene2cases[g].indexOf(s) != -1 ? gene2index[g] : -1;
        });
        sample2gene_index[s] = d3.min(gene_indices.filter(function(i){ return i != -1; }));
    }

    // Order in which to sort the mutation types
    var mutTyOrder = { inactive_snv: 0, snv: 1, amp: 2, del: 3 };

    // Constants that correspond to the different sorting functions
    var SAMPLE_TY = 0
    , SAMPLE_NAME = 1
    , MUTATION_TY = 2
    , EXCLUSIVITY = 3
    , GENE_FREQ   = 4
    , sortFnName = {};

    // Short descriptions of the different sorting functions
    sortFnName[SAMPLE_TY]   = "Sample type"
    sortFnName[SAMPLE_NAME] = "Sample name";
    sortFnName[MUTATION_TY] = "Mutation type";
    sortFnName[EXCLUSIVITY] = "Exclusivity";
    sortFnName[GENE_FREQ]   = "Gene frequency";

    // Comparison operators for pairs of samples
    function gene_frequency_sort(s1, s2){
        // Sort by the first gene in which the sample is mutated
        return d3.ascending(sample2gene_index[s1], sample2gene_index[s2]);
    }

    function exclusivity_sort(s1, s2){
        // Sort by the exclusivity of mutations in the samples
        return d3.ascending(sample2exclusivity[s1], sample2exclusivity[s2]);
    }

    function mutation_ty_sort(s1, s2){ // Sort by the type of mutation
        var mut_ty1 = M[genes[sample2gene_index[s1]]][s1][0]
        , mut_ty2 = M[genes[sample2gene_index[s2]]][s2][0];
        return d3.ascending(mutTyOrder[mut_ty1], mutTyOrder[mut_ty2]);
    }

    
    function sample_name_sort(s1, s2){ // Sort by sample name
        return d3.ascending(s1, s2);
    }

    
    function sample_ty_sort(s1, s2){ // Sort by the sample type
        return d3.ascending(sample2ty[s1], sample2ty[s2]);
    }

    // Create a map of the sort constants to the functions they represent
    var sortFns = {};
    sortFns[SAMPLE_TY]   = sample_ty_sort;
    sortFns[SAMPLE_NAME] = sample_name_sort;
    sortFns[MUTATION_TY] = mutation_ty_sort;
    sortFns[EXCLUSIVITY] = exclusivity_sort;
    sortFns[GENE_FREQ]   = gene_frequency_sort;

    // Sort sample *indices* using the given sortOrder of sorting functions
    function sort_samples(sortOrder){
        return d3.range(0, samples.length).sort(function(i, j){
            var s1 = samples[i]
            , s2 = samples[j]
            , result;
            for (k = 0; k < sortOrder.length; k++){
                result =  sortFns[sortOrder[k]](s1, s2);
                if (result != 0) return result;
            }
            return result;
        });
    }

    // Parse the mutation data and sort the samples using a default sort order
    var sampleMutations = create_oncoprint_data( M, gene2cases, genes, samples, sample2ty )
    , sampleSortOrder = [ GENE_FREQ, SAMPLE_TY, EXCLUSIVITY, MUTATION_TY, SAMPLE_NAME ]
    , sample2exclusivity = compute_mutation_exclusivity(gene2cases, genes, samples)
    , sortedSamplesIndices = sort_samples(sampleSortOrder);
    console.log(sampleMutations);
    // Create a mapping of samples to the index on which they should be drawn
    var sample2index = {};
    for ( var i = 0; i < samples.length; i++ )
        sample2index[sortedSamplesIndices[i]] = i;

    /**** Construct the SVG ****/
    // Scales for the height/width of rows/columns
    var x = d3.scale.linear()
        .domain([0, m])
        .range([labelWidth + boxMargin, width - boxMargin]);

    // Zoom behavior
    // - minBoxWidth is the size of the a tick when zoomed all the way in
    var zoom = d3.behavior.zoom()
        .x(x)
        .scaleExtent([1, Math.round( minBoxWidth * m / width)])
        .on("zoom", function(){ renderOncoprint(); });

    var svg = el.append("svg")
        .attr("id", "oncoprint")
        .attr("width",  width )
        .attr("height", height + labelHeight)
        .attr("xmlns", "http://www.w3.org/2000/svg") // so SVG is openable
        .call(zoom);

    // Offset the image placement using the margins
    var fig = svg.append("g")
        .attr("transform", "translate(" + boxMargin + "," + boxMargin + ")");

    // Append the rectangle that will serve as the background of the ticks
    fig.append("rect")
        .style("fill", style.bgColor)
        .attr("width", width - labelWidth - boxMargin)
        .attr("height", height)
        .attr("transform", "translate(" + (labelWidth + boxMargin) + "," + labelHeight + ")");

    // Add groups that include sample labels and each sample's mutations
    var g = fig.append("svg:g").attr("id", "oncoprint");
    var matrix = g.selectAll(".sample")
        .data(sampleMutations).enter()
            .append("svg:g")
            .attr("class", "sample")
            .attr("id", function(s){ return s.name; });

    // Add the ticks in each sample that represent its mutations
    var ticks = matrix.append("g")
        .attr("transform", "translate(0," + labelHeight + ")");

    ticks.selectAll(".tick")
        .data(function(d){ return d.genes }).enter()
        .append("rect")
        .attr("class", "tick")
        .attr("fill", function(d){
            if (!multiCancer){
                if (d.fus && !d.snv) // Hsin-Ta: Fusion
                    return style.bgColor;
                else
                    return d.cooccurring ? coocurringColor : exclusiveColor;
            }
            else{
                if (d.fus && !d.snv) // Hsin-Ta: Fusion
                    return style.bgColor;
                else
                    return sampleType2color[d.cancer];
            }
        });

    // Add stripes to inactivating mutations
    ticks.selectAll(".inactivating")
        .data(function(d){ return d.genes; })
        .enter()
            .append("rect")
            .filter(function(d){ return d.inactivating})
            .attr("class", "inactivating")
            .style("fill", style.blockColorStrongest)
            .attr("width", tickWidth)
            .attr("height", geneHeight/4)
            .style("stroke-width", 0)

     // Hsin-Ta: Add trangle-up for fusion/rearragnemanet/splice site
    ticks.selectAll(".fus")
        .data(function(d){ return d.genes; })
        .enter()            
            .append("svg:path")
            .filter(function(d){ return d.fus})
            .attr("class", "fusion")
            .attr("d", d3.svg.symbol().type('triangle-up').size(8))
            .style("stroke-opacity", 0)            
            .style("fill", function(d){
                if (multiCancer)
                    return sampleType2color[d.cancer];
                else
                    return d.cooccurring ? coocurringColor : exclusiveColor;
            });

    // Add sample names and line separators between samples
    matrix.append("text")
        .attr("fill", style.blockColorMedium)
        .attr("text-anchor", "start")
        .text(function(s){ return s.name; });

    // Add the row (gene) labels
    var geneLabels = fig.selectAll(".geneLabels")
        .data(genes)
        .enter()
        .append("svg:g")
        .attr("class", "geneLabel")
        .attr("transform", function(d, i){
            return "translate(0 , " + (labelHeight + gene2index[d] * geneHeight) +  ")"
        });

    geneLabels.append("text")
        .attr("class", "gene-name")
        .attr("font-size", 14)
        .attr("text-anchor", "end")
        .attr("transform", function(d, i){
            return "translate(" + labelWidth + "," + (geneHeight - boxMargin) + ")"
        })
        .text(function(g){ return g + " (" + gene2cases[g].length + ")"; });
    
    // Add horizontal lines to separate rows (genes)
    fig.selectAll(".horizontal-line")
        .data(genes).enter()
        .append("line")
        .attr("x2", width - labelWidth)
        .attr("transform", function(d, i){
            return "translate(" + (labelWidth + boxMargin) + "," + (labelHeight + i*geneHeight) + ")"
        })
        .style("stroke", "#fff");

    // Main function for moving sample names and ticks into place depending on zoom level
    function renderOncoprint(){
        // Identify ticks/samples that are visible from the viewport
        var activeTicks = matrix.filter(function(d, i){
                return x(sample2index[i]) >= (labelWidth + boxMargin) && x(sample2index[i]) <= width;
            });
        activeTicks.style("fill-opacity", 1);

        // Recalculate tick width based on the number of samples in the viewport
        var numVisible  = activeTicks[0].length
        , printWidth    = width - labelWidth - boxMargin;
        samplesPerCol = 1;

        while (samplesPerCol * printWidth / numVisible < 4) samplesPerCol += 1;
        tickWidth = printWidth / numVisible;

        // Fade inactive ticks -- those out of the viewport
        var inactiveTicks = matrix.filter(function(d, i){
                return x(sample2index[i]) < (labelWidth + boxMargin) || x(sample2index[i]) > width;
            });
        inactiveTicks.style("fill-opacity", 0.25).style("stroke-opacity", 1);

        // Moving the small ticks of the inactivating to the right place
        matrix.selectAll(".inactivating")
            .filter(function(d){ return d.inactivating; })
            .attr("width", tickWidth)
            .attr("y", function(d, i){
                return ((gene2index[d.gene] ? gene2index[d.gene]: 0) + 0.375) * geneHeight;
            });

        // Hsin-Ta: Fusion
        matrix.selectAll(".fusion")
            .filter(function(d){ return d.fus; })                   
            .attr("transform", function(d){return "translate(" +tickWidth/2 + "," + (((gene2index[d.gene] ? gene2index[d.gene]: 0)) * geneHeight + geneHeight/2) + "), rotate(90), scale("+ tickWidth/6+")"});

        // Move 
        matrix.attr("transform", function(d, i){ return "translate(" + x(sample2index[i]) +  ")"; })

        // Update the text size of the sample names depending on the zoom level (tickWidth)
        matrix.selectAll("text")
            .style("font-size", (tickWidth < 8) ? tickWidth : 8)
            .attr("transform", "translate(" + (tickWidth/2) + "," + labelHeight + "), rotate(-90)");

        // Move the ticks to the right places
        ticks.selectAll(".tick")
            .attr("width", tickWidth)
            .attr("height", function(d){ return d.del || d.amp ? geneHeight/2 : geneHeight })
            .attr("y", function(d, i){
                var index = (gene2index[d.gene] ? gene2index[d.gene]: 0)
                , delOffset = d.del ? geneHeight / 2 : 0;
                return index * geneHeight + delOffset;
            });

        // Update sample width legend appropriately
        d3.select("rect#sampleWidthRect")
            .attr("width", samplesPerCol * tickWidth - (2*sampleStroke));
        
        var sampleStr = samplesPerCol == 1 ? "sample" : "samples";
        d3.select("text#sampleWidthText")
            .attr("x", left + tickWidth + 5)
            .text(samplesPerCol + " " + sampleStr);

        /****  Add sample lines ****/
        // First remove the old sample lines
        svg.selectAll(".vert-line").remove();

        // Compute the indices of samples that are visible, and filter the indices
        // by the number of samples per column
        var activeIndices = matrix.data().map(function(d, i){ return i; })
            .filter(function(i){
                return x(i) >= (labelWidth + boxMargin) && x(i) <= width;
            }).filter(function(d, i){
                return i % samplesPerCol == 0;
            });

        svg.selectAll(".vert-line")
            .data(activeIndices).enter()
            .append("line")
            .attr("x1", -height)
            .attr("y1", boxMargin)
            .attr("y2", boxMargin)
            .attr("class", "vert-line")
            .attr("transform", function(i){
                return "translate(" + x(i) + "," + (labelHeight + boxMargin) +  ")rotate(-90)";
            })
            .style("stroke", "#fff")
            .style("stroke-width", sampleStroke);

    }        

    /**** Add coverage ****/
    // Right floating coverage string
    var coverage_span = el.append("span")
        .style("float", "right")
        .style("margin-right", cancerLegendWidth - legendMarginLeft + "px");

    coverage_span.append("b").text("Coverage: ");
    coverage_span.append("span").text(coverage);

    /**** Add legend ****/
    // Legend declarations
    var mutationRectWidth = 10
    , legend_font_size = 11
    , left = mutationRectWidth/2;

    // Add legend SVG
    var mutationLegend = el.append("svg")
        .attr("id", "mutation-legend")
        .attr("height", mutationLegendHeight)
        .attr("width", width)
        .style("margin-left", labelWidth + boxMargin)
        .append("g")
            .style("font-size", legend_font_size);

    // If the data contains multiple cancer types, then mutations are colored by
    // cancer type, so the exclusive/co-occurring cells won't be shown.
    // The cancer type legend will float to the right of the oncoprint.
    if (!multiCancer){   
        // Exclusive ticks
        mutationLegend.append("rect")
            .attr("x", left)
            .attr("height", geneHeight)
            .attr("width", mutationRectWidth)
            .style("fill", exclusiveColor)

        mutationLegend.append("text")
            .attr("x", mutationRectWidth + 10)
            .attr("y", 3*geneHeight/4)
            .style("fill", "#000")
            .text("Exclusive");

        left += mutationRectWidth + 10 + 65;

        // Co-occurring ticks
        mutationLegend.append("rect")
            .attr("x", left)
            .attr("height", geneHeight)
            .attr("width", mutationRectWidth)
            .style("fill", coocurringColor)

        mutationLegend.append("text")
            .attr("x", left + mutationRectWidth + 10)
            .attr("y", 3*geneHeight/4)
            .style("fill", "#000")
            .text("Co-occurring");

        left += mutationRectWidth + 10 + 85;
    }
    else{
        // Cancer type legend
        var legendBoxSize = 15
        , legendMarginLeft = 10
        , cancerLegend = el.insert("svg", "svg")
            .attr("id", "sample-type-legend")
            .attr("width", cancerLegendWidth - legendMarginLeft)
            .attr("height", cancerTyLegendHeight)
            .style("float", "right")
            .style("margin-top", labelHeight + boxMargin)
            .style("margin-left", legendMarginLeft)
            .style("margin-bottom", 10)
            .style("font-size", 10);

        cancerLegend.append("text")
            .attr("x", 2)
            .attr("y", 10)
            .style("font-weight", "bold")
            .text("Sample types")

        var cancerTys = cancerLegend.selectAll(".cancer-legend")
            .data(tys).enter()
            .append("g")
            .attr("transform", function(ty, i){
                return "translate(2, " + ((i+1) * legendBoxSize) + ")";
            });

        cancerTys.append("rect")
            .attr("width",  legendBoxSize)
            .attr("height", legendBoxSize)
            .style("fill", function(ty){ return sampleType2color[ty]; });

        cancerTys.append("text")
            .attr("dy", legendBoxSize - 3)
            .attr("dx", 20)
            .text(function(ty){ return ty; })
    }

    // SNVs (full ticks)
    mutationLegend.append("rect")
        .attr("x", left)
        .attr("height", geneHeight)
        .attr("width", mutationRectWidth)
        .style("fill", style.blockColorMedium)
    
    mutationLegend.append("text")
        .attr("x", left + mutationRectWidth + 10)
        .attr("y", 3*geneHeight/4)
        .style("fill", "#000")
        .text("SNV");

    left += mutationRectWidth + 10 + 10 + 25;

    // Inactivating SNVs (striped full ticks)
    mutationLegend.append("rect")
        .attr("x", left)
        .attr("height", geneHeight)
        .attr("width", mutationRectWidth)
        .style("fill", style.blockColorMedium)

    mutationLegend.append("rect")
        .attr("x", left)
        .attr("y", 3*geneHeight/8)
        .attr("height", geneHeight/4)
        .attr("width", mutationRectWidth)
        .style("fill", "#000000");

    mutationLegend.append("text")
        .attr("x", left + mutationRectWidth + 10)
        .attr("y", 3*geneHeight/4)
        .style("fill", "#000")
        .text("Inactivating");

    left += mutationRectWidth + 10 + 75;

    // Deletions (down ticks)
    mutationLegend.append("rect")
        .attr("x", left)
        .attr("y", geneHeight/2)
        .attr("height", geneHeight/2)
        .attr("width", mutationRectWidth)
        .style("fill", style.blockColorMedium)

    mutationLegend.append("text")
        .attr("x", left + mutationRectWidth + 5)
        .attr("y", 3*geneHeight/4)
        .style("fill", "#000")
        .text("Deletion");

    left += mutationRectWidth + 10 + 55;

    // Amplifications (up ticks)
    mutationLegend.append("rect")
        .attr("x", left)
        .attr("height", geneHeight/2)
        .attr("width", mutationRectWidth)
        .style("fill", style.blockColorMedium)

    mutationLegend.append("text")
        .attr("x", left + mutationRectWidth + 10)
        .attr("y", 3*geneHeight/4)
        .style("fill", "#000")
        .text("Amplification");

    left += mutationRectWidth + 10 + 75;

    // Hsin-Ta: Fusion legend
    mutationLegend.append("path")
        .attr("d", d3.svg.symbol().type('triangle-up').size(30))
        .attr("transform", "translate(" + (left + mutationRectWidth) + "," + 3*geneHeight/8 + "), rotate(90)")
        .style("stroke", style.bgColor)
        .style("fill", style.blockColorMedium);

    // Hsin-Ta: Fusion legend
    mutationLegend.append("text")
        .attr("x", left + mutationRectWidth + 10)
        .attr("y", 3*geneHeight/4)
        .style("fill", "#000")
        .text("Fusion/Rearrangement/Splice Variant");
                
    left += mutationRectWidth + 10 + 220; 
    
    // Samples/box (the width/locations are set in renderOncoprint())
    mutationLegend.append("rect")
        .attr("x", left)
        .attr("id", "sampleWidthRect")
        .attr("height", geneHeight)
        .style("fill", style.blockColorMedium);

    mutationLegend.append("text")
        .attr("id", "sampleWidthText")
        .attr("y", 3*geneHeight/4)
        .style("fill", "#000");


    /**** Add sample sorting for the oncoprint ****/
    // Container to hold the sorting interface
    var sampleSort = el.append("div")
        .attr("id", "sample-sorting-interface")
        .style("margin-left", labelWidth + "px")
        .style("font-size", 12 + "px");

    var interfaceLink = sampleSort.append("a")
        .style("font-weight", "bold")
        .text("Sort oncoprint by: ")
        .on("click", function(){
            // If the sorting interface is visible, hide it and flip the arrow
            if ($("ul#sample-sort-list").is(":visible")){
                $("ul#sample-sort-list").slideUp();
                $("span#interface-status").attr("class", "glyphicon glyphicon-chevron-up")
           }
           else{
                $("ul#sample-sort-list").slideDown();
                $("span#interface-status").attr("class", "glyphicon glyphicon-chevron-down")
           }
        });

    interfaceLink.append("span")
        .attr("id", "interface-status")
        .attr("class", "glyphicon glyphicon-chevron-up");
    
    var sortFnsContainer = sampleSort.append("ul")
        .attr("id", "sample-sort-list")
        .style("padding-left", "10px")
        .style("display", "none");

    // reorder uses the given sample sort parameters to resort the samples, and
    // then moves them to their new locations
    function reorder(sampleSortOrder) {
        // Re-sort the samples and update the index
        var sortedSamplesIndices = sort_samples(sampleSortOrder);
        for ( var i = 0; i < samples.length; i++ )
            sample2index[sortedSamplesIndices[i]] = i;

        // Perform the transition: move elements in the order of where they will end up on the x-axis
        var t = svg.transition().duration(animationSpeed);
        
        t.selectAll(".sample")
            .delay(function(d, i) { return x(sample2index[i]); })
            .attr("transform", function(d, i) {
                return "translate(" + x(sample2index[i]) + ",0)";
            })

        // Update the sample sorting interface
        sample_sorter_interface();
    }

    // Shift items in the sample sort order list based on whether the user
    // pressed up/down. Then calls reorder to update the oncoprint
    function update_sample_order(n, move){
        var newSampleSortOrder = sampleSortOrder
        , i = sampleSortOrder.indexOf(n)
        , j = i - move;
        if (j != -1 && j < sampleSortOrder.length){
            newSampleSortOrder[i] = newSampleSortOrder[j];
            newSampleSortOrder[j] = n;
        }
        reorder( newSampleSortOrder );

    }

    // Lists the sample sorting functions in the current order being used,
    // along with arrows so the user can modify the order
    function sample_sorter_interface(){
        // Remove the old sample sorting interface
        sortFnsContainer.selectAll("*").remove();

        // Append a list of the way the oncoprint is sorted
        var sortFns = sortFnsContainer.selectAll(".sort-fn")
            .data(sampleSortOrder).enter()
            .append("li")
                .style("list-style-type", "none")
                .style("margin-bottom", "5px");
        
        // Down and up arrows to change the precedence of the different sorting operators
        sortFns.append("span")
            .attr("class", "glyphicon glyphicon-arrow-down")
            .on("click", function(d, i){ update_sample_order(d, -1); });

        sortFns.append("span")
            .attr("class", "glyphicon glyphicon-arrow-up")
            .on("click", function(d, i){ update_sample_order(d, 1); });

        // Add a short description of what the each sort parameter is
        sortFns.append("span").text(function(d){ return " " + sortFnName[d]; })  
    }

    // Go!
    renderOncoprint();
    sample_sorter_interface();

}

// Create a dictionary of samples to whether they are exclusively
// mutated in the given subnetwork
function compute_mutation_exclusivity(gene2cases, genes, samples){
    var sample2exclusivity = {};
    for (var i = 0; i < samples.length; i++){
        // For a given sample, its mutated genes are all genes g
        // where the sample is in gene2cases[g]
        var mutatedGenes = genes.map(function(g){
                return gene2cases[g].indexOf( samples[i] );
            }).filter(function(n){ return n != -1; });
        sample2exclusivity[samples[i]] = mutatedGenes.length;
    }
    return sample2exclusivity;
}

// Parse the mutation data into a simple, sample-centric dictionary
// sample -> { name, genes, cancer, cooccurring }
// where genes is a list of mutations
// gene   -> { amp, del, inactive_snv, snv, g, cancer, cooccurring }
function create_oncoprint_data( M, gene2cases, genes, samples, sample2ty ){
    var sampleMutations = [];
    for (i = 0; i < samples.length; i++){
        var s = samples[i]
        , mutations = { name: s, genes: [], cancer: sample2ty[s] };
        // Record all mutated genes for the given sample
        for (j = 0; j < genes.length; j++){
            var g = genes[j]
            , mut = {gene: g, cancer: sample2ty[s] };

            // Record all mutation types that the current gene has in the current sample
            if (gene2cases[g].indexOf( s ) != -1){
                mut.amp = M[g][s].indexOf("amp") != -1;
                mut.del = M[g][s].indexOf("del") != -1;
                mut.fus = M[g][s].indexOf("fus") != -1; // Hsin-Ta: Fusion type
                mut.inactivating = M[g][s].indexOf("inactive_snv") != -1;
                mut.snv = M[g][s].indexOf("snv") != -1 || mut.inactivating;
                mutations.genes.push( mut );
            }
        }
        // Determine if the mutations in the given sample are co-occurring
        mutations.cooccurring = mutations.genes.length > 1;
        mutations.genes.forEach(function(d){
            d.cooccurring = mutations.cooccurring;            
        })
        sampleMutations.push( mutations );
    }

    return sampleMutations;
}
