/* Create example queries */
$(document).ready(function(){
	// 
	var containingDiv = "div#example-queries",
		genesList = $("textarea#genes-list");
	
	var exampleQueries = [
		{	selector: containingDiv + " a#swi-snf-pan-can",
			genes: ["ARID1A", "ARID1B", "ARID2", "PBRM1", "SMARCA4", "SMARCB1", "SMARCC1", "SMARCC2"],
			grouped: true,
			groupID: 0,
			dataset: null
		},
		{	selector: containingDiv + " a#cohesin-pan-can",
			genes: ["STAG2", "STAG1", "SMC1A", "RAD21", "SMC3"],
			grouped: true,
			groupID: 0,
			dataset: null
		},
		{	selector: containingDiv + " a#pi3k-gbm",
			genes: ["PIK3CA", "PTEN", "BRAF", "AKT1", "PIK3R1"],
			grouped: false,
			group: 0,
			dataset: "5329e4a3ec6f808feaa6d983"
		}
	];

	exampleQueries.forEach(function(query){
		var link = $(query.selector),
			linkGroup = query.groupID,
			linkDataset = query.dataset;

		link.on("click", function(){
			// Update the text area and highlight it
			genesList.val(query.genes.join("\n"));
			highlightElement(genesList, 'highlight');

			// Then check and highlight the datasets
			$("input").prop("checked", false); // uncheck everything else
			if (query.grouped){
				var checkboxes = $("input.group-" + linkGroup + "-checkbox");
				checkboxes.prop("checked", true);
				$('ul#group-' + linkGroup).slideDown();
				highlightElement($("ul#group-" + linkGroup), 'highlight');
			}
			else{
				$("input#db-" + linkDataset).prop("checked", true);
				if (linkGroup >= 0) $('ul#group-' + linkGroup).slideDown();
				highlightElement($("input#db-" + linkDataset).parent().parent(), 'highlight');
			}

		});
	});

});

function highlightElement(el, className){
    el.addClass(className);
	setTimeout(
    	function() { el.removeClass(className); },
    	1000
	);
}