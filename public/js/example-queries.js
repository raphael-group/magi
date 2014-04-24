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
			dataset: "tcga pan-can"
		},
		{	selector: "a#cohesin-pan-can",
			genes: ["STAG2", "STAG1", "SMC1A", "RAD21", "SMC3"],
			dataset: "tcga pan-can"
		},
		{	selector: "a#pi3k-gbm",
			genes: ["PIK3CA", "PTEN", "BRAF", "AKT1", "PIK3R1"],
			dataset: "gbm"
		}
	];

	// Add an event handler to each link to change the gene list
	// and multi-select on click
	exampleQueries.forEach(function(query){
		var link = $(query.selector);

		link.on("click", function(){
			// Update the text area and highlight it by focusing on it
			genesList.val(query.genes.join("\n"));

			// Uncheck all checkboxes in the multiselect, 
			// then check the datasets with the given IDs
			datasetMultiselect.multiselect('deselect', datasetToCheckboxes.all );
			datasetMultiselect.multiselect('select', datasetToCheckboxes[query.dataset]);

		});
	});

});