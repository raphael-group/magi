/* Master D3 controller for the view */

var user_id = user ? user._id : "";

// When the document is ready, draw the visualizations
// and then fade them in and the loading GIF out
$(document).ready(
	function(){

		var promise = view();
		promise.done(function(){
			d3.select("div#loading").style("display", "none")
			d3.select("div#view-page").transition().duration(1000).style("opacity", 1);
			d3.select("div#view-page").style("height", "auto")
		});
	}
);

// Share link button event handler
$('button#shareBtn').on('click', function(e) {
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
		controlsElement = "div#control-panel div#controls",
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

		aberrations.datum(data.aberrations)
			.call(gd3.mutationMatrix({
				style: style.aberrations
			}).showColumnCategories(false).showColumnLabels(false).linkRowLabelsToNCBI(true));

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
						cancerNames  = Object.keys(cancerToRefs).sort(),
						refTable = [[
								{type: 'text', text: 'Cancer'},
								{type: 'text', text: 'PMID'},
								{type: 'text', text: 'Votes'}
							].map(gd3.tooltip.datum)
						];

					cancerNames.forEach(function(cancer){
						cancerToRefs[cancer].forEach(function(ref, i){
							// only show the cancer name in the first row
							refTable.push([	
								{ type: 'text', text: i ? "" : cancerToName(cancer) },
								{ type: 'link', body: ref.pmid, href: pubmedLink(ref.pmid)},
								{ type: 'vote',
								  voteDirectionFn: function(){ return ref.vote; },
								  voteCountFn: function(){ return ref.score; },
								  upvoteFn: function(){
								  	// Update the reference vote count
								  	if (ref.vote == 'down'){
								  		ref.score += 2;
								  		ref.vote = 'up';
								  	} else if (ref.vote == 'up'){
								  		ref.score -= 1;
								  		ref.vote = null;
								  	} else {
								  		ref.vote = 'up';
								  		ref.score += 1;
								  	}
								  	vote({_id: ref._id, pmid: ref.pmid, vote: 'up'}, '/vote/mutation');
								  	return ref.vote;
								  },
								  downvoteFn: function(){
								  	if (ref.vote == 'down'){
								  		ref.score += 1;
								  		ref.vote = null;
								  	} else if (ref.vote == 'up'){
								  		ref.score -= 2;
								  		ref.vote = 'down'
								  	} else {
								  		ref.vote = 'down';
								  		ref.score -= 1;
								  	}
								  	vote({_id: ref._id, pmid: ref.pmid, vote: 'down'}, '/vote/mutation');
								  	return ref.vote;
								  }}
							].map(gd3.tooltip.datum));
						});
					});

					// The table is hidden on default, so we show a string describing the 
					// table before showing it.
					var knownAberrations = cancerNames.map(cancerToName).join(", ");
					tooltipData.push({ type: 'text', text: 'Known ' + mutationClass + ' in ' + knownAberrations});
					tooltipData.push({type: 'table', table: refTable, defaultHidden: true});
				}
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
		comments = data.network.comments;;

	edges.classed("gd3-tipobj", true);
	edges.each(function(d) {
		// Create a table of references for this edge
		var refTable = [[
				{type: 'text', text: 'Network'},
				{type: 'text', text: 'PMID'},
				{type: 'text', text: 'Votes'}
			].map(gd3.tooltip.datum)
		];
		d.categories.forEach(function(n){
			if (d.references[n].length > 0){
				d.references[n].forEach(function(ref, i){
					ref.score = ref.upvotes.length - ref.downvotes.length;
					if (ref.upvotes.indexOf(user_id) > -1){
						ref.vote = 'up';
					} else if (ref.downvotes.indexOf(user_id) > -1){
						ref.vote = 'down';
					} else {
						ref.vote = null;
					}
					// only show the network name in the first row
					refTable.push([
						{type: 'text', text: i ? "" : n},
						{type: 'link', href: pubmedLink(ref.pmid), body: ref.pmid},
						{type: 'vote',
						 voteDirectionFn: function(){ return ref.vote; },
						 voteCountFn: function(){ return ref.score; },
						 upvoteFn: function(){
						  	if (ref.vote == 'down'){
						  		ref.score += 2;
						  		ref.vote = 'up';
						  	} else if (ref.vote == 'up'){
						  		ref.score -= 1;
						  		ref.vote = null;
						  	} else {
						  		ref.vote = 'up';
						  		ref.score += 1;
						  	}
						 	vote({
						 		source: d.source.name,
						 		target: d.target.name,
						 		network: n,
						 		pmid: ref.pmid,
						 		vote: 'up'
						 	}, '/vote/ppi');
						 },
						 downvoteFn: function(){
						  	if (ref.vote == 'down'){
						  		ref.score += 1;
						  		ref.vote = null;
						  	} else if (ref.vote == 'up'){
						  		ref.score -= 2;
						  		ref.vote = 'down'
						  	} else {
						  		ref.vote = 'down';
						  		ref.score -= 1;
						  	}
						 	vote({
						 		source: d.source.name,
						 		target: d.target.name,
						 		network: n,
						 		pmid: ref.pmid,
						 		vote: 'down'
						 	}, '/vote/ppi')
						 }}
					].map(gd3.tooltip.datum));
				})
			} else{
				refTable.push(gd3.tooltip.datum({type: 'text', text: n}));
			}
		});

		// Add the tooltip
		networkTooltips.push([
			{ type: 'text', text: 'Source: ' + d.source.name },
			{ type: 'text', text: 'Target: ' + d.target.name },
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
		transcript.append("h5").text(geneName);
		var transcriptPlot = transcript.append("div")
			.datum(data.transcripts[geneName][transcriptName])
			.call(gd3.transcript({
				showLegend: true,
				style: style.transcript
			}));

		// And add tooltips
		var aminoAcidCodes = { A: "Ala", B: "Asx", C: "Cys", D: "Asp", E: "Glu", F: "Phe", G: "Gly", H: "His", I: "Ile", K: "Lys", L: "Leu", M: "Met", N: "Asn", P: "Pro", Q: "Gln", R: "Arg", S: "Ser", T: "Thr", V: "Val", W: "Trp", X: "X", Y: "Tyr",Z: "Glx", "*": "*"};
		function aminoAcidCode(aa){ return aa in aminoAcidCodes ? aminoAcidCodes[aa] : aa; }

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

			transcriptTooltips.push([
				{ type: 'link', href: '/sampleView?sample=' + d.sample, body: 'Sample: ' + d.sample },
				{ type: 'text', text: 'Dataset: ' + d.dataset },
				{ type: 'text', text: 'Mutation type: ' + d.ty.replace("_", " ") },
				{ type: 'text', text: 'Change: ' + d.locus + ': ' + d.aao + '>' + d.aan},
				{ type: 'link', href: locusHref, body: 'Search locus on Pubmed.' },
				{ type: 'text', text: ''},
				{ type: 'link', href: changeHref, body: 'Search protein sequence change on Pubmed.' }
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
	if (cnaGenes) updateCNAChart();

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

	// Add a container and a heading
	var controls = d3.select("#control-panel div#controls"),
		datasetsPanel = controls.append("div")
			.attr("class", "panel panel-default")
			.style("padding", "0px")

	var datasetHeading = datasetsPanel.append("div")
		.attr("class", "panel-heading")
		.style("padding", "5px")
		.append("h5")
		.attr("class", "panel-title")
		.attr("id", "datasetLink")
		.style("cursor", "pointer")
		.style("font-size", "14px")
		.style("width", "100%")
		.text("Datasets");
	bootstrapToggle({link: "dataset", target: "Dataset"});

	datasetHeading.append("span")
		.style("float", "right")
		.text("[+]");

	// Add each dataset
	var datasetsBody = datasetsPanel.append("div")
		.attr("id", "collapseDataset")
		.attr("class", "panel-collapse collapse in")
		.append("div")
		.attr("class", "panel-body")
		.style("padding", "5px");

	var datasetEls = datasetsBody.append("ul")
		.attr("id", "datasets")
		.selectAll(".dataset")
		.data(datasetData).enter()
		.append("li")
		.style("cursor", "pointer")
		.on("click", function(d){
			// Add/Remove the dataset from the list of filtered datasets
			var index = filteredDatasets.indexOf(d.name),
				visible = index == -1;

			if (visible){
				filteredDatasets.push( d.name );
			} else{
				filteredDatasets.splice(index, 1);
			}

			// Filter the mutation matrix, transcript plot, and CNA browser
			gd3.dispatch.filterCategory( { categories: filteredDatasets });

			// Fade in/out this dataset
			d3.select(this).style("opacity", visible ? 0.5 : 1);
		});

	datasetEls.append("div").attr("class", "dataset-color").style("background", function(d){ return d.color; });
	datasetEls.append("div").text(function(d){ return d.name + " (" + d.numSamples + ")"; });

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
