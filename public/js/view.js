/* Master D3 controller for the view */

var user_id = user ? user._id : "";

// When the document is ready, draw the visualizations
// and then fade them in and the loading GIF out
$(document).ready(
  function(){

    var promise = view();
    promise.done(function(){
      d3.select("div#loading").style("display", "none");
      d3.select("div#view-page").transition().duration(1000).style("opacity", 1);
      d3.select("div#view-page").style("height", "auto");
    });
  }
);

// Share link button event handler
$('a#shareBtn').on('click', function(e) {
  $.post('/share', {url: window.location.search})
    .done(function(r) {
      $('div#shareLinkBox input').val(window.location.origin + '/view/' + r);
    });
  });

// Master function for
// * drawing the D3 visualizations
// * adding tooltips
// * adding annotations
// * controlling which datasets are visible

// Globals
var abbrToCancer = data.abbrToCancer,
  cancerToAbbr = {},
  linkViews = true;

Object.keys(abbrToCancer).forEach(function(k){ cancerToAbbr[abbrToCancer[k]] = k; });
cancers = Object.keys(cancerToAbbr);

function view(){
	// Set up promise
	var deferred = $.Deferred();
	
	// Hard-code the names of each element
	var aberrationsElement = "div#aberrations",
		networkElement = "div#network",
		transcriptElement = "div#transcript",
		transcriptSelectElement = "select#transcript-select",
		cnasElement = "div#cnas",
		cnasSelectElement = "select#cnas-select",
    // controlsElement = "div#control-panel div#controls",
    controlsElement = "div#controls",
		annotateInputElement = "div#annotation div#inputs",
		annotatedGeneElement = "div#annotation select#gene",
		interactionElement = "div#annotation select#interaction",
		interactorElement = "div#annotation select#interactor",
		cancerInputElement = "div#annotation div#cancers",
		cancerTypeaheadElement = "div#annotation div#cancers input#cancer-typeahead"
		annotationsElement = "div#annotation div#annotations",
		transcriptMutationElement = "div#annotation div#transcript-mutation",
		transcriptDomainElement = "div#annotation div#transcript-domain",
		transcriptPositionElement = "div#annotation div#transcript-position",
		commentElement = "div#annotation textarea#comment",
		submitElement = "div#annotation button#submit",
		heatmapElement = 'div#heatmap';

	// Select each element for easy access later
	var aberrations = d3.select(aberrationsElement),
		heatmap = d3.select(heatmapElement),
		network = d3.select(networkElement),
		transcript = d3.select(transcriptElement),
		transcriptSelect = d3.select(transcriptSelectElement),
		cnas = d3.select(cnasElement),
		cnasSelect = d3.select(cnasSelectElement),
		controls = d3.select(controlsElement),
		annotateInput = d3.select(annotateInputElement),
		annotatedGene = d3.select(annotatedGeneElement),
		interaction = d3.select(interactionElement),
		interactor = d3.select(interactorElement),
		cancerInput = d3.select(cancerInputElement),
		transcriptMutation = d3.select(transcriptMutationElement),
		transcirptDomain = d3.select(transcriptDomainElement),
		transcirptPosition = d3.select(transcriptDomainElement),
		annotation = d3.select(annotationsElement),
		submit = d3.select(submitElement);

	var elements = [ {name: "aberrations", el: aberrationsElement},
					 {name: "network", el: networkElement},
					 {name: "transcript", el: transcriptElement},
					 {name: "cnas", el: cnasElement},
					 {name: "heatmap", el: heatmapElement} ];


	// Functions for giving names from our abbreviations
	// for cancer types and mutations
	function cancerToName(c){
		if (cancerToAbbr[c]) return cancerToAbbr[c].toUpperCase();
	    else if (c=='null' || !c) return "Unknown";
		else return c.toUpperCase();
	}

	function mutationToName(m){
		m = m.toLowerCase();
		if (m == "snv") return "SNV";
		else if (m == "inactive_snv") return "Inactivating SNV";
		else if (m == "amp") return "Amplification";
		else if (m == "del") return "Deletion";
		else return m;
	}

	function mutationToClass(m){
		m = m.toLowerCase();
		if (m == "snv" || m == "inactive_snv") return "SNV";
		else if (m == "amp") return "Amplification";
		else if (m == "del") return "Deletion";
		else if (m == "expression") return "Expression";
		else if (m == "methylation") return "Methylation";
		else return "Other";
	}

	function pubmedLink(_id){
		if (_id.toLowerCase().slice(0, 3) == 'pmc'){
			return 'http://www.ncbi.nlm.nih.gov/pmc/articles/' + _id;
		} else{
			return 'http://www.ncbi.nlm.nih.gov/pubmed/' + _id;
		}
	}

	// Set up the styles for the four views
	var genes = data.genes,
		datasets = Object.keys(data.datasetColors);


	// Determine if we're showing duplicates
	if (showDuplicates == null) {
		showDuplicates = true; // TODO fix this hack
	}

	var defaultStyle = function(){
		var sty = { colorSchemes: { network: {} , sampleType: {} } };
		sty.colorSchemes.network["HPRD"] = "rgb(13, 59, 56)"
		sty.colorSchemes.network["HINT+HI2012"] = "rgb(127, 92, 159)";
		sty.colorSchemes.network["HINT"] = "rgb(127, 92, 159)";
		sty.colorSchemes.network["iRefIndex"] = "rgb(140, 91, 56)";
		sty.colorSchemes.network["Multinet"] = "rgb(92, 128, 178)";
		sty.colorSchemes.network["Community"] = "rgb(230, 189, 123)";
		return sty;
	}

	var style = { network: defaultStyle(), aberrations: defaultStyle(),
				  transcript: defaultStyle(), cnas: defaultStyle(),
				  heatmap: defaultStyle() };

        var tooltipNewline = {type: 'text', text:''};
	elements.forEach(function(e){
		style[e.name].width = $(e.el).width();
		if (data.datasetColors){
			Object.keys(data.datasetColors).forEach(function(name){
			  style[e.name].colorSchemes.sampleType[name] = data.datasetColors[name];
			});
		}
	});

	// Cold to hot gradient for the network
	style.network.nodeColor = ['rgb(102, 178, 255)', 'rgb(255, 51, 51)'];

	// Set up the GD3 color palette
	if (data.datasetColors){
		var colors = datasets.map(function(d){ return data.datasetColors[d]; });
		gd3.color.categories(datasets, colors);
		gd3.color.annotations('Cancer type', datasets, 'discrete', colors);
	}
	if (data.sampleAnnotations && data.sampleAnnotations.categories){
		data.sampleAnnotations.categories.forEach(function(c){
			var values = Object.keys(data.sampleAnnotations.annotationToColor[c]);
			if (values.length > 0){
				var colors = values.map(function(v){return data.sampleAnnotations.annotationToColor[c][v]; });
				gd3.color.annotations(c, values, 'discrete', colors);
			}
		});
	}

	///////////////////////////////////////////////////////////////////////////
	// Draw the five views

	// Heatmap: has to come first so that it gets sorted
	// in the same order as the aberration matrix
	if (data.heatmap.cells){
		// Add the cancer type as an annotation for the heatmap
		if (data.aberrations && data.aberrations.samples){
			var heatmapAnnotations = {categories: [], annotationToColor: {}, sampleToAnnotations: {}};
			heatmapAnnotations.categories.push("Cancer type");
			heatmapAnnotations.annotationToColor["Cancer type"] = {};
			Object.keys(data.datasetColors).forEach(function(d){
				heatmapAnnotations.annotationToColor["Cancer type"][d] = data.datasetColors[d];
			});
			data.aberrations.samples.forEach(function(s){
				heatmapAnnotations.sampleToAnnotations[s.name] = [data.aberrations.sampleToTypes[s._id]]
			});
			data.heatmap.annotations = heatmapAnnotations;
		}

		// Draw the heatmap
		heatmap.datum(data.heatmap)
			.call(gd3.heatmap({
				style: style.heatmap
			}).linkRowLabelsToNCBI(true).linkOutXLabels(true));


		// Add tooltips
		var cells = heatmap.selectAll('.gd3heatmapCells rect');
		cells.classed('gd3-tipobj', true);
		var heatmapTooltips = [];
		cells.each(function(d) {
			// Create the tooltip data for the data that will always be present
			var tooltipData = [
					{ type: 'link', href: '/sampleView?sample=' + d.x, body: 'Sample: ' + d.x },
					{ type: 'text', text: 'Value: ' + d.value}
				];

			// Add the annotations
			if (data.heatmap.annotations){
				data.heatmap.annotations.categories.forEach(function(c, i){
					var value = data.heatmap.annotations.sampleToAnnotations[d.x][i];
					if (!value) value = "No data";
					tooltipData.push({type: 'text', text: c + ': ' + value});
				});
			}

			// Add the tooltip
			heatmapTooltips.push(tooltipData.map(gd3.tooltip.datum) );
		});

		heatmap.select('svg').call(gd3.tooltip.make().useData(heatmapTooltips));

	} else {
		d3.select(heatmapElement).remove();
		d3.select("h3#heatmap-title").remove();
	}

	// Aberrations
	if (data.aberrations.samples && data.aberrations.samples.length > 0){
		if (typeof(data.sampleAnnotations) == "object" && Object.keys(data.sampleAnnotations).length > 0)
			data.aberrations.annotations = data.sampleAnnotations;

    var m2Fn = gd3.mutationMatrix({ style: style.aberrations })
            .showHoverLegend(true)
            .showLegend(false)
            .showColumnCategories(false)
            .showColumnLabels(false)
            .linkRowLabelsToNCBI(true)
            .showSortingMenu(false);
		aberrations.datum(data.aberrations).call(m2Fn)

    // Handle sorting
    $('ul#sort-options').sortable({
      stop: function(){
        // Compute the new order of the options
        var sortingOptions = [];
        d3.selectAll('li.sort-option').each(function(){
          sortingOptions.push($(this).data('sort-option'));
        });

        // Get the new column label ordering from the mutation matrix
        var columnLabels = m2Fn.getOrderedColumnLabels(sortingOptions);

        // Finally, issue a dispatch to update the heatmap
        gd3.dispatch.sort({
          columnLabels: columnLabels,
          sortingOptionsData: sortingOptions
        })
      }
    });

		// Add tooltips
		var cells = aberrations.selectAll('.mutmtx-sampleMutationCells g');
		cells.classed('gd3-tipobj', true);
		var aberrationsTooltips = [];
		cells.each(function(d) {
			// Create the tooltip data for the data that will always be present
			var geneName     = d.rowLabel,
				mutationType = mutationToName(d.cell.type),
				mutationClass = mutationToClass(d.cell.type),
				tooltipData  = [
					{ type: 'link', href: '/sampleView?sample=' + d.colLabel, body: 'Sample: ' + d.colLabel },
					{ type: 'text', text: 'Type: ' + d.cell.dataset},
					{ type: 'text', text: 'Mutation: ' + mutationType }
				];

			// Add the annotations
			var annData = data.aberrations.annotations;
			if (annData && annData.categories && annData.sampleToAnnotations){
				annData.categories.forEach(function(c, i){
					var value = annData.sampleToAnnotations[d.colLabel][i];
					if (value){
						tooltipData.push({type: 'text', text: c + ': ' + value});
					}
				});
			}

			// Add the references (if necessary)
			if (data.annotations && data.annotations[geneName]){
				var annotatedMutationNames = Object.keys(data.annotations[geneName])
					annotatedMutations = annotatedMutationNames.map(mutationToClass),
					mutationIndex = annotatedMutations.indexOf(mutationClass);

				// Determine if there are references for the current gene
				// AND its current mutation type
				if (mutationIndex !== -1){

				    // Find all the cancers for which this gene is known to be mutated. Then add
				    // references for each row
				    var cancerToRefs = data.annotations[geneName][annotatedMutationNames[mutationIndex]],
				    cancerNames  = Object.keys(cancerToRefs).sort();

					// The table is hidden on default, so we show a string describing the
					// table before showing it.
				    var knownAberrations = cancerNames.map(cancerToName).filter(function(s) {return s != 'Unknown';}).join(", ");
				    var inKnownCancers = knownAberrations == '' ? '' : (' in ' + knownAberrations);
				    tooltipData.push({ type: 'text', text: 'Known ' + mutationClass + inKnownCancers});
				    // count the number of references
				    if (cancerNames) {
					var numRefs = 0;
					cancerNames.forEach(function(name) {
					    numRefs += cancerToRefs[name].length;
					});
					tooltipData.push({ type: 'link',
							   body: 'View references (' + numRefs +') for this gene',
							   href: annotationsURL + '/annotations/' + geneName}); // todo: limit to references to a mutation
					tooltipData.push(tooltipNewline); // workaround: add newline after a link
				    }
				}
			    tooltipData.push({ type: 'link',
					       body: 'Add a new reference for this gene',
					       href: annotationsURL + '/annotations/create/mutation/?gene=' + geneName});
			    tooltipData.push(tooltipNewline);

			}

			// Add the tooltip
			aberrationsTooltips.push(tooltipData.map(gd3.tooltip.datum) );
		});

		aberrations.select('svg').call(gd3.tooltip.make().useData(aberrationsTooltips));


	} else {
		aberrations.html("<b>No aberrations</b>.")
	}

	// Network

	// Draw network
	network.datum(data.network)
		.call(gd3.graph({
			style: style.network
		}));

	// Add network tooltips
	var edges = network.selectAll("g.gd3Link"),
		networkTooltips = [],
		refs = data.network.refs,
		comments = data.network.comments;

	edges.classed("gd3-tipobj", true);
	edges.each(function(d) {
		// Create a table of references for this edge
		var refTable = [[
				{type: 'text', text: 'Network'},
				{type: 'text', text: 'PMID'},
			].map(gd3.tooltip.datum)
		];

	    d.categories.forEach(function(n){
		if (d.references[n].length > 0){
				d.references[n].forEach(function(ref, i){
					// only show the network name in the first row
					refTable.push([
						{type: 'text', text: i ? "" : n},
						{type: 'link', href: pubmedLink(ref.pmid), body: ref.pmid},

					].map(gd3.tooltip.datum));
				})
			} else {
				refTable.push(gd3.tooltip.datum({type: 'text', text: n}));
			}
		});

// todo: remove vote buttons
	    createInteractionHref = annotationsURL + '/annotations/interactions/add/?source=' + d.source.name +
			'&target=' + d.target.name;

		// Add the tooltip
		networkTooltips.push([
		    { type: 'text', text: 'Source: ' + d.source.name },
		    { type: 'text', text: 'Target: ' + d.target.name },
		    { type: 'link',
		      href: annotationsURL + '/annotations/interactions/' + d.source.name + ',' + d.target.name,
		      body: 'View references to this interaction.'},
		    tooltipNewline,
		    { type: 'link',
		      href: createInteractionHref,
		      body: 'Add and/or annotate a reference to this interaction.'},
		    { type: 'table', table: refTable }
		].map(gd3.tooltip.datum) );
	});

	network.select('svg').call(gd3.tooltip.make().useData(networkTooltips));
	// Transcript(s)

	// First populate the dropdown with the transcripts for each gene
	var numTranscriptsAdded = 0;
	genes.forEach(function(g, i){
		if (!data.transcripts[g] || Object.keys(data.transcripts[g]).length == 0) return;
		else numTranscriptsAdded += 1;

		var transcripts = Object.keys(data.transcripts[g]).map(function(t){
			return { name: t, numMutations: data.transcripts[g][t].mutations.length };
		});
		transcripts.sort(function(a, b){ return a.numMutations < b.numMutations ? 1 : -1 });

		var optGroup = transcriptSelect.append("optgroup")
			.attr("label", g);

		optGroup.selectAll(".options")
			.data(transcripts).enter()
			.append("option")
			.attr("value", function(d){ return g + "," + d.name; })
			.text(function(d){ return d.name + " (" + d.numMutations + " mutations)"; });
	});

	// Watch the transcript selector to update the current transcript plot on change
	function updateTranscript(){
		// Parse the selector's value to find the current gene and transcript
		var arr = transcriptSelect.node().value.split(","),
			geneName = arr[0],
			transcriptName = arr[1];

		// First remove any elements in the transcript container
		transcript.selectAll("*").remove();

		// Then add the new plot
		var transcriptFn = gd3.transcript({ showLegend: true, style: style.transcript })
		transcript.append("h5").text(geneName);
		var transcriptPlot = transcript.append("div")
			.datum(data.transcripts[geneName][transcriptName])
			.call(transcriptFn);

		// Add listeners to update the domain DB, and set the domain DB
		// to whichever domain DB is currently checked
		function setDomainDB(){
		    if ($(this).is(':checked')){
		    	transcriptFn.setDomainDB($(this).val());
		    }
		}
		$('ul#transcript-domain-radios input').each(setDomainDB);
		$('ul#transcript-domain-radios input').click(setDomainDB);

		// And add tooltips
		var aminoAcidCodes = { A: "Ala", B: "Asx", C: "Cys", D: "Asp", E: "Glu", F: "Phe", G: "Gly", H: "His", I: "Ile", K: "Lys", L: "Leu", M: "Met", N: "Asn", P: "Pro", Q: "Gln", R: "Arg", S: "Ser", T: "Thr", V: "Val", W: "Trp", X: "X", Y: "Tyr",Z: "Glx", "*": "*"};
		function aminoAcidCode(aa){ return aa in aminoAcidCodes ? aminoAcidCodes[aa] : aa; }


  	    // add some codes to interface with Django HTML api
	    var mutationTypeRevMap = {'Missense_Mutation':'MS', 'In_Frame_Del': 'IFD'};
		var mutations = transcriptPlot.selectAll("path.symbols"),
			transcriptTooltips = [];
		mutations.classed("gd3-tipobj", true);
		mutations.each(function(d) {
			// Search at the locus level...
			var locusOneCode = d.aao + d.locus + "%5Btw%5D",
				locusThreeCode = aminoAcidCode(d.aao) + d.locus + "%5Btw%5D",
				locusHref = 'http://www.ncbi.nlm.nih.gov/pmc/?term=' + geneName + '%5Btw%5D+AND+(' + locusOneCode + "+OR+" + locusThreeCode + ")",
				// ...and search at the protein sequence level
				changeOneCode = d.aao + d.locus + d.aan + "%5Btw%5D",
				changeThreeCode = aminoAcidCode(d.aao) + d.locus + aminoAcidCode(d.aan) + "%5Btw%5D",
				clause1	 = geneName + changeOneCode
				clause2 = geneName + '%5Btw%5D+AND+(' + changeOneCode + "+OR+" + changeThreeCode + ")",
				changeQuery = clause1 + " OR (" + clause2 + ")",
		    changeHref = 'http://www.ncbi.nlm.nih.gov/pmc/?term=' + changeQuery;

		    createParams = {'gene': geneName,
				    'mutation_class': 'SNV',
				    'mutation_type': mutationTypeRevMap[d.ty],
				    'original_amino_acid': d.aao,
				    'locus': d.locus,
				    'new_amino_acid': d.aan,
				    'cancer': d.dataset.toLowerCase()};		    // FIXME: database != cancer for some datasets

		    createMutationHref = annotationsURL + '/annotations/save/mutation/?' + $.param(createParams);

			transcriptTooltips.push([
			    { type: 'link', href: '/sampleView?sample=' + d.sample, body: 'Sample: ' + d.sample },
			    { type: 'text', text: 'Dataset: ' + d.dataset },
			    { type: 'text', text: 'Mutation type: ' + d.ty.replace("_", " ") },
			    { type: 'text', text: 'Change: ' + d.locus + ': ' + d.aao + '>' + d.aan},
			    { type: 'link', href: locusHref, body: 'Search locus on Pubmed.' },
			    tooltipNewline,
			    { type: 'link', href: changeHref, body: 'Search protein sequence change on Pubmed.' },
			    tooltipNewline,
			    { type: 'link', href: annotationsURL + '/annotations/' + geneName, body: 'View all references to this mutation'},
			    tooltipNewline,
			    { type: 'link', href: createMutationHref, body: 'Add and/or annotate a reference to this mutation.' },
			].map(gd3.tooltip.datum));
		});

		transcriptPlot.select('svg').call(gd3.tooltip.make().useData(transcriptTooltips));
	}
	transcriptSelect.on("change", updateTranscript);

	if (data.transcripts && numTranscriptsAdded > 0){
		updateTranscript();
	} else {
		transcriptSelect.remove();
		transcript.html("<b>No transcript data</b>.")
	}

	// Copy number aberrations

	// Populate the dropdown with the names of the genes with CNAs
	var cnaGenes = genes.filter(function(g){
			return data.cnas && g in data.cnas;
		}).map(function(g){
			return { name: g, numCNAs: data.cnas[g].segments.length };
		});

	cnasSelect.selectAll(".cna-option")
		.data(cnaGenes).enter()
		.append("option")
		.attr("id", function(d){ return "cna-option-" + d.name; })
		.attr("value", function(d){ return d.name; })
		.attr()
		.text(function(d){ return d.name + " (" + d.numCNAs + " aberrations)"; })

	// Create the CNA genes data
	function updateCNAChart(){
		// Retrieve the current gene
		var geneName = cnasSelect.node().value;

		// Empty out the CNA browser container
		cnas.selectAll("*").remove();

		// Update the CNA browser
		cnas.datum(data.cnas[geneName])
			.call(gd3.cna({ style: style.cnas }).showScrollers(false))

		// And add tooltips
		var intervals = cnas.selectAll("g.intervals"),
			cnaTooltips = [];
		intervals.classed("gd3-tipobj", true);
		intervals.each(function(d) {
			cnaTooltips.push([
				{ type: 'link', href: '/sampleView?sample=' + d.sample, body: 'Sample: ' + d.sample },
				{ type: 'text', text: 'Dataset: ' + d.dataset },
				{ type: 'text', text: 'Type: ' + mutationToName(d.ty) },
				{ type: 'text', text: 'Start: ' + d.start },
				{ type: 'text', text: 'End: ' + d.end }
			].map(gd3.tooltip.datum));
		});

		cnas.select('svg').call(gd3.tooltip.make().useData(cnaTooltips));
	}


	// Watch the CNA browser selector to update the current CNA browser on change
	cnasSelect.on("change", updateCNAChart);
	if (cnaGenes.length > 0){ updateCNAChart(); }
  else{
    cnasSelect.remove();
    cnas.html('<b>No copy number aberrations.</b>')
  }

	///////////////////////////////////////////////////////////////////////////
	// Controls for the control panel

	function resizeControlPanel() {
		var viewportWidth = $(window).width();
		if(viewportWidth < 600) {
			$('div#control-panel').css("width", viewportWidth+"px");
			$('div#control-panel').css("right", "0px");
			$('div#view').css('padding-top', $('div#control-panel').css('height'));
		} else {
			$('div#control-panel').css("width", "200px");
			$('div#control-panel').css("right", "0px");
			$('div#view').css('margin-top', '0px');
		}
	}

	$(window).resize(resizeControlPanel);
	$(function() { resizeControlPanel(); });

	$('span#hideControlPanel').click(function(e) {
		if($('div#controls').css('display') == 'block') {
			$('div#controls').css('display', 'none');
			$('div#saveBox').css('display', 'none');
			$('div#annotation').css('display', 'none');
		} else {
			$('div#controls').css('display', 'block');
			$('div#saveBox').css('display', 'block');
			$('div#annotation').css('display', 'block');
		}
		if($(window).width() < 600) {
			$('div#view').css('padding-top', $('div#control-panel').css('height'));
		}
	});

	///////////////////////////////////////////////////////////////////////////
	// Add a dataset menu to the control panel

	// Extract info about each dataset
	var filteredDatasets = [],
		datasetToColor = data.datasetColors,
		datasetToSamples = data.aberrations.typeToSamples,
		datasetData = datasets.map(function(d){
			return { name: d, color: datasetToColor[d], numSamples: datasetToSamples[d].length };
		}).sort(function(a, b){ return d3.ascending(a.name, b.name); });

	var datasetRows = d3.selectAll("table#datasets tbody tr")
    .on("click", function(d){
      // Add/Remove the dataset from the list of filtered datasets
      var name = $(this).data('name');
			var index = filteredDatasets.indexOf(name),
				visible = index == -1;

			if (visible){
				filteredDatasets.push( name );
			} else{
				filteredDatasets.splice(index, 1);
			}

			// Filter the mutation matrix, transcript plot, and CNA browser
			gd3.dispatch.filterCategory( { categories: filteredDatasets });

			// Fade in/out this dataset
			d3.select(this).style("opacity", visible ? 0.5 : 1);
    });

	///////////////////////////////////////////////////////////////////////////
	// Add controls
	var hideViewCheckboxes = [ { checkbox: $('#AberrationsHideCheckbox'), _id: "aberrationsRow" },
							   { checkbox: $('#DataMatrixHideCheckbox'), _id: "dataMatrixRow" },
							   { checkbox: $('#NetworkTranscriptHideCheckbox'), _id: "networkTranscriptRow" },
							   { checkbox: $('#CNAsHideCheckbox'), _id: "cnasRow" }]
	hideViewCheckboxes.forEach(function(d){
		d.checkbox.change(function() {
			if ($(this).is(":checked")){
				$('#' + d._id).hide();
			} else {
				$('#' + d._id).show();
			}
		});
	})

	// Resolve the promise and return
	deferred.resolve();

	return deferred;
}

///////////////////////////////////////////////////////////////////////////////
// AJAX functions
function populateForm(fields){
  var formData = new FormData();
  Object.keys(fields).forEach(function(k){
    formData.append( k, fields[k] );
  });
  return formData;
}

function vote(fields, url){
    // add and clear comment
    fields.comment = $("textarea#vote-comment").val();
    $("textarea#vote-comment").val("");

  // Create a form to submit as an AJAX request to update the database
  var formData = populateForm(fields);
  $.ajax({
    // Note: can't use JSON otherwise IE8 will pop open a dialog
    // window trying to download the JSON as a file
    url: url,
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    type: 'POST',

    error: function(xhr) {
      annotationStatus('Database error: ' + xhr.status);
    },

    success: function(response) {
      if(response.error) {
        annotationStatus('Oops, something bad happened.', warningClasses);
        return;
      }

      // Log the status
      annotationStatus(response.status, successClasses);
    }
  });
}

///////////////////////////////////////////////////////////////////////////////
// Update the HTML status <div>
var infoClasses  = 'alert alert-info',
  warningClasses = 'alert alert-warning',
  successClasses = 'alert alert-success';

function annotationStatus(msg, classes) {
  $("#annotationStatus").attr('class', classes);
  $('#annotationStatus').html(msg);
}
