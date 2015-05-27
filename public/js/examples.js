/* Create example queries */
$(document).ready(function(){
	// The gene list textarea and the dataset multiselect
	var genesList = $("textarea#genes-list"),
		datasetMultiselect = $("#dataset-multiselect");

	// The hard-coded example queries
	// - selector: ID of the link
	// - genes: list of genes for the query
	// - dataset: either group or dataset name (lowercase)
	var exampleQueries = [
		{	selector: "a#swi-snf-pan-can",
			genes: ["ARID1A", "ARID1B", "ARID2", "PBRM1", "SMARCA4", "SMARCB1", "SMARCC1", "SMARCC2"],
			dataset: "tcga pan-cancer"
		},
		{	selector: "a#cohesin-pan-can",
			genes: ["STAG2", "STAG1", "SMC1A", "RAD21", "SMC3"],
			dataset: "tcga pan-cancer"
		},
		{	selector: "a#pi3k-gbm",
			genes: ["PIK3CA", "PTEN", "BRAF", "AKT1", "PIK3R1"],
			dataset: "gbm"
		}
	];

	// Change the query to use the current datasets and genes
	function setQuery(genes, datasetIDs){
		// Update the text area
		genesList.val(genes.join("\n"));

		// Uncheck all checkboxes in the multiselect, 
		// then check the datasets with the given IDs
		datasetMultiselect.multiselect('deselect', datasetToCheckboxes.all );
		datasetMultiselect.multiselect('select', datasetIDs);
	}

	// Add an event handler to each link to change the gene list
	// and multi-select on click
	exampleQueries.forEach(function(query){
		var link = $(query.selector);
		link.on("click", function(){ setQuery( query.genes, datasetToCheckboxes[query.dataset]) });
	});

	// Add the users most recent queries
	if (recentQueries && recentQueries.length > 0){		
		var wrapper = d3.select("small#recent-queries"),
			links = wrapper.selectAll(".query-link")
			.data(recentQueries).enter()
			.insert("a", "hr")
			.attr("title", function(d){
				var title = d.genes.join(", ") + " in ";
				if (d.datasets.length > 3){
					title += d.datasets.length + " datasets."
				}
				else{
					title += d.datasets.map(function(db){
						var arr = db.split(" ");
						return arr[arr.length - 2];
					}).join(", ") + ".";
				}
				return title;
			})
			.style("margin", "0px 5px 0px 5px")
			.style("cursor", "pointer")
			.text(function(d, i){ return i + 1; })
			.on("click", function(d){ setQuery(d.genes, d.datasets); });
	}

});

$(document).ready(function(){
	// Load the pre-packaged gd3 data
	d3.json("/data/example-data.json", function(data){
		// Add the multi-sample mutation matrix
		var params = {style: {width: 750}};
		d3.select("#multi-cancer-m2")
			.style("border", "1px solid #eee")
			.datum(data.multi_cancer_aberrations)
			.call( gd3.mutationMatrix(params) );

		// Add the single-sample mutation matrix
		d3.select("#single-cancer-m2")
			.style("border", "1px solid #eee")
			.datum(data.single_cancer_aberrations)
			.call( gd3.mutationMatrix(params) );

		// Add the heatmap
		d3.select("#gd3-heatmap")
			.style("border", "1px solid #eee")
			.datum(data.heatmap)
			.call( gd3.heatmap(params).showAnnotations(false) );

		// Add the subnetwork
		params.style.width = 500;
		data.network.title = "Mutations";
		params.style.nodeColor = ['rgb(102, 178, 255)', 'rgb(255, 51, 51)'];
		d3.select("#gd3-subnetwork-plot")
			.style("border", "1px solid #eee")
			.datum(data.network)
			.call( gd3.graph(params) );

        // Add the transcript plot
        params.domainDB = "PFAM";
        d3.select("#gd3-transcript-plot")
        	.append("div")
        	.append("i")
        	.text("ENST00000342988");

		d3.select("#gd3-transcript-plot")
			.style("border", "1px solid #eee")
			.datum(data.transcript)
			.call( gd3.transcript(params) );

		// Add the CNA browser
		params.style.width = 800;
		d3.select("#gd3-cna-browser")
			.style("border", "1px solid #eee")
			.style("height", "300px")
			.style("overflow-y", "scroll")
			.datum(data.cnas)
			.call(gd3.cna(params))
			.select("svg")

	})

});