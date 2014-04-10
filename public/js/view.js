/* Master D3 controller for the view */

// Hard-code the names of each element
var m2Element = "div#mutation-matrix",
	subnetworkElement = "div#subnetwork",
	transcriptElement = "div#transcript-plot",
	transcriptSelectElement = "select#transcript-plot-select",
	cnaBrowserElement = "div#cna-browser",
	cnaBrowserSelectElement = "select#cna-browser-select",
	controlsElement = "div#control-panel div#controls";

// Select each element for easy access later
var m2 = d3.select(m2Element),
	subnet = d3.select(subnetworkElement),
	transcript = d3.select(transcriptElement),
	transcriptSelect = d3.select(transcriptSelectElement),
	cnaBrowser = d3.select(cnaBrowserElement),
	cnaBrowserSelect = d3.select(cnaBrowserSelectElement),
	controls = d3.select(controlsElement);

var elements = [ {name: "mutation_matrix", el: m2Element}, {name: "subnetwork", el: subnetworkElement},
				 {name: "transcript", el: transcriptElement}, {name: "cnabrowser", el: cnaBrowserElement} ];

// Hard-code the network colors (TODO: more elegant way later)
var defaultStyle = function(){
	var sty = { colorSchemes: { network: {} , sampleType: {} } };
	sty.colorSchemes.network["HPRD"] = "rgb(13, 59, 56)"
	sty.colorSchemes.network["HINT+HI2012"] = "rgb(127, 92, 159)";
	sty.colorSchemes.network["HINT"] = "rgb(127, 92, 159)";
	sty.colorSchemes.network["iRefIndex"] = "rgb(140, 91, 56)";
	sty.colorSchemes.network["Multinet"] = "rgb(92, 128, 178)";
	return sty; 
}

// Parse the GET url parameters and generate the GET query to get the data
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var genes = getParameterByName("genes")
	datasets = getParameterByName("datasets"),
	query = "/data/bundle?genes=" + genes + "&datasets=" + datasets;

///////////////////////////////////////////////////////////////////////////
// Get the data and initialize the view
d3.json(query, function(err, data){
	// Create each element's style by merging in the dataset colors and
	// finding the width of each container
	var style = { subnetwork: defaultStyle(), mutation_matrix: defaultStyle(),
				  transcript: defaultStyle(), cnabrowser: defaultStyle() };
	elements.forEach(function(e){
		style[e.name].width = $(e.el).width();
		if (data.datasetColors){
            Object.keys(data.datasetColors).forEach(function(name){
              style[e.name].colorSchemes.sampleType[name] = data.datasetColors[name];
            });
		}
	});

	///////////////////////////////////////////////////////////////////////////
	// Parse and store the dataset colors and number of samples, and
	// by default include all datasets in each visualization
	var datasetToColor = data.datasetColors,
		datasetToNumSamples = data.mutation_matrix.typeToNumSamples;

	var datasetData = Object.keys(datasetToColor).map(function(d){
		return { name: d, color: datasetToColor[d], numSamples: datasetToNumSamples[d], active: true };
	});

	var datasetToInclude = {};
	datasetData.forEach(function(d){ datasetToInclude[d.name] = true; });

	///////////////////////////////////////////////////////////////////////////
	// Add the mutation matrix
	var m2Chart = mutation_matrix({style: style.mutation_matrix})
	              .addCoverage()
	              .addMutationLegend()
	              .addSortingMenu();
	m2.datum(data.mutation_matrix);
	m2Chart(m2);

	// Add the subnetwork plot
	var subnetChart = subnetwork({style: style.subnetwork})
                	.addNetworkLegend()
                	.addGradientLegend()
	subnet.datum(data.subnetwork_data);
	subnetChart(subnet);

	///////////////////////////////////////////////////////////////////////////
	// Add a transcript plot selector, where each transcript is grouped by gene
	var genes = Object.keys(data.transcript_data),
		firstGene, firstTranscript;

	genes.forEach(function(g, i){
		var transcripts = Object.keys(data.transcript_data[g]).map(function(t){
			return { name: t, numMutations: data.transcript_data[g][t].mutations.length };
		});
		transcripts.sort(function(a, b){ return a.numMutations < b.numMutations });

		var optGroup = transcriptSelect.append("optgroup")
			.attr("label", g);

		optGroup.selectAll(".options")
			.data(transcripts).enter()
			.append("option")
			.attr("value", function(d){ return g + "," + d.name; })
			.text(function(d){ return d.name + " (" + d.numMutations + " mutations)"; });

		// Store the first gene and transcript for initialization later
		if (i == 0){
			firstGene = g;
			firstTranscript = transcripts[0].name;
		}
	});

	// Set the default params for the transcript plot
	var transcriptParams = { style: style.transcript, domainDB: data.domainDBs[0] },
		transcriptChart = transcript_plot(transcriptParams)
	              		.addLegend()
	              		.addVerticalPanning();

	// Watch the transcript selector to update the current transcript plot on change
	transcriptSelect.on("change", function(){
		// Parse the selector's value to find the current gene and transcript
		var arr = $(this).val().split(","),
			geneName = arr[0],
			transcriptName = arr[1];
	
		// First remove any elements in the transcript container
		transcript.selectAll("*").remove();

		// Then add the new plot 
		transcript.datum(data.transcript_data[geneName][transcriptName]);
		transcript.append("h5").text(geneName);
		transcriptChart(transcript);
		transcriptChart.filterDatasets(datasetToInclude);
	});

	// Initialize the transcript plot with the first gene
	if (genes.length > 0){
		transcript.datum(data.transcript_data[firstGene][firstTranscript]);
		transcript.append("h5").text(firstGene);
		transcriptChart(transcript);
		transcriptChart.filterDatasets(datasetToInclude);
	}

	///////////////////////////////////////////////////////////////////////////
	// Add a CNA browser selector to choose the genes
	var cnaChart = cna_browser({ style: style.cnabrowser });
	function updateCNAChart(){
		// Retrieve the current gene
		var geneName = $(this).val();

		// Empty out the CNA browser container
		cnaBrowser.selectAll("*").remove();

		// Update the CNA browser
		cnaBrowser.datum(data.cna_browser_data[geneName]);
		cnaChart(cnaBrowser);
		cnaChart.filterDatasets(datasetToInclude);
	}

	// Create the CNA genes data
	var cnaGenes = Object.keys(data.cna_browser_data).map(function(g){
		return { name: g, numCNAs: data.cna_browser_data[g].segments.length };
	});
	cnaGenes.sort(function(a, b){ return a.numCNAs < b.numCNAs; });

	// Watch the CNA browser selector to update the current CNA browser on change
	cnaBrowserSelect.selectAll(".cna-option")
		.data(cnaGenes).enter()
		.append("option")
		.attr("id", function(d){ return "cna-option-" + d.name; })
		.attr("value", function(d){ return d.name; })
		.attr()
		.text(function(d){ return d.name + " (" + d.numCNAs + " aberrations)"; })
	
	cnaBrowserSelect.on("change", updateCNAChart);

	// Initialize the CNA browser with the first gene
	if (cnaGenes.length > 0){
		cnaBrowser.datum(data.cna_browser_data[cnaGenes[0].name]);
		cnaChart(cnaBrowser);
		cnaChart.filterDatasets(datasetToInclude);
	}

	///////////////////////////////////////////////////////////////////////////
	// Update the control panel
	controls.append("h5").text("Datasets");
	var datasetEls = controls.append("ul")
		.attr("id", "datasets")
		.selectAll(".dataset")
		.data(datasetData).enter()
		.append("li")
		.style("cursor", "pointer")
		.on("click", function(d){
			// Determine if the dataset is currently active
			var active = d.active,
				opacity = active ? 0.5 : 1;

			// Create a dictionary to update the status of the current dataset
			d.active = !active;
			datasetToInclude[d.name] = d.active;

			// Filter the mutation matrix, transcript plot, and CNA browser
			m2Chart.filterDatasets(datasetToInclude);
			transcriptChart.filterDatasets(datasetToInclude);
			cnaChart.filterDatasets(datasetToInclude);

			// Fade in/out this dataset
			d3.select(this).style("opacity", opacity);
		});

	datasetEls.append("div").attr("class", "dataset-color").style("background", function(d){ return d.color; });
	datasetEls.append("div").text(function(d){ return d.name + " (" + d.numSamples + ")"; });

});

