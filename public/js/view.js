/* Master D3 controller for the view */

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
var votePPI, voteMutation, commentPPI;
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


	// Set up the styles for the four views
	var genes = data.genes,
		datasets = data.datasets;

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

	///////////////////////////////////////////////////////////////////////////
	// Draw the five views

	// Aberrations
	if (data.aberrations.samples && data.aberrations.samples.length > 0){
		data.aberrations.annotations = data.sampleAnnotations;
		aberrations.datum(data.aberrations)
			.call(gd3.mutationMatrix({
				style: style.aberrations
			}));
	} else {
		aberrations.html("<b>No aberrations</b>.")
	}

	// Heatmap
	if (data.heatmap.cells){
		// Add cancer type to the sample annotations for the heatmap
		if (data.sampleAnnotations && data.aberrations.samples.length > 0){
			// Perform a deep copy of the sample annotation data
			var heatmapAnnotations = {categories: [], annotationToColor: {}, sampleToAnnotations: {}};
			$.extend(heatmapAnnotations.categories, data.sampleAnnotations.categories);
			$.extend(heatmapAnnotations.annotationToColor, data.sampleAnnotations.annotationToColor);

			// Add the cancer types as a heatmap annotation
			heatmapAnnotations.categories.splice(0, 0, "Cancer type");
			heatmapAnnotations.annotationToColor["Cancer type"] = {};
			Object.keys(data.datasetColors).forEach(function(d){
				heatmapAnnotations.annotationToColor["Cancer type"][d] = data.datasetColors[d];
			});
			data.aberrations.samples.forEach(function(s){
				if (s.name in data.sampleAnnotations.sampleToAnnotations){
					var currentAnnotations = data.sampleAnnotations.sampleToAnnotations[s.name];
					heatmapAnnotations.sampleToAnnotations[s.name] = [data.aberrations.sampleToTypes[s._id]].concat(currentAnnotations);
				}
			});
			data.heatmap.annotations = heatmapAnnotations;
		}
		heatmap.datum(data.heatmap)
			.call(gd3.heatmap({
				style: style.heatmap
			}));
	} else {
		d3.select(heatmapElement).remove();
		d3.select("h3#heatmap-title").remove();
	}

	// Network
	network.datum(data.network)
		.call(gd3.graph({
			style: style.network
		}));

	// Transcript(s)

	// First populate the dropdown with the transcripts for each gene
	genes.forEach(function(g, i){
		if (!data.transcripts[g]) return;

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
		transcript.append("div")
			.datum(data.transcripts[geneName][transcriptName])
			.call(gd3.transcript({
				showLegend: true,
				style: style.transcript
			}));
	}
	transcriptSelect.on("change", updateTranscript);
	if (data.transcripts && Object.keys(data.transcripts).length > 0){
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
			.call(gd3.cna({ style: style.cnas }))
	}


	// Watch the CNA browser selector to update the current CNA browser on change
	cnasSelect.on("change", updateCNAChart);
	if (cnaGenes) updateCNAChart();

	// Resolve the promise and return
	deferred.resolve();

	return deferred;
}