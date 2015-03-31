/* Annotation controller for the view. Responsibilities:
*  1) Populate the annotation forms
*  2) Respond to dispatch click events to populate the annotation forms.
*  3) Set up the voting functions, which will be used by tooltips in view.js.
*/

var resetAnnotations, toggleForm;
function initializeAnnotations(){
	///////////////////////////////////////////////////////////////////////////////
	// Annotations for interactions

	// Select the form and the first protein select
	var interactionFormElement = "form div#interactions",
		interactionForm = d3.select(interactionFormElement),
		proteinOneSelect = interactionForm.select("select#protein1"),
		proteinTwoSelect = interactionForm.select("select#protein2"),
		ppiPMID = interactionForm.select("input#ppi-pmid"),
		ppiComment = interactionForm.select("textarea#interaction-comment");

	// Populate the first protein select
	proteinOneSelect.selectAll("option")
		.data(['-- choose gene --'].concat(data.genes)).enter()
		.append("option")
		.attr("value", function(d){ return d; })
		.text(function(d){ return d; })

	proteinOneSelect.on("change", function(d, i){ updateProteinSelect(d, i, this); });

	// Update the protein 2 select on change
	function updateProteinSelect(d, i, selector){
		// Get the selected option
		var val = d3.select(selector).node().value;

		// Hide everything but the protein one selector if no gene is chosen
		if (val == "-- choose gene --"){
			interactionForm.selectAll(".toggle").style("display", "none");
		// Otherwise, show and populate the protein two select
		} else{
			interactionForm.selectAll(".toggle").style("display", "inline");
			var otherOptions = data.genes.filter(function(g){ return g !== val; }),
				options = proteinTwoSelect.selectAll("option")
					.data(otherOptions, function(d){ return d});
					options.enter()
					.append("option")
					.attr("value", function(d){ return d; })
					.text(function(d){ return d; });
			options.exit().remove();
		}
	}

	// Update the protein selects when users click on the interactions
	var annotationType = d3.select("input#antype");
	gd3.dispatch.on("interaction.magi", function(d){
		toggleForm("interaction");
		mutationForm.selectAll(".toggle").style("display", "none");
		proteinOneSelect.property('value', d.source);
		updateProteinSelect(null, null, "select#protein1");
		proteinTwoSelect.property('value', d.target);
	});

	///////////////////////////////////////////////////////////////////////////////
	// Annotations for mutations
	var mutationFormElement = "form div#mutations",
		mutationForm = d3.select(mutationFormElement),
		geneSelect = mutationForm.select("select#gene"),
		abberationSelect = mutationForm.select("select#aberration"),
		cancerInput = mutationForm.select("input#cancer-typeahead"),
		mutationInput = mutationForm.select("input#mut_ty"),
		locusInput = mutationForm.select("input#locus"),
		domainInput = mutationForm.select("input#domain"),
		mutationPMID = mutationForm.select("input#mutation-pmid"),
		mutationComment = mutationForm.select("textarea#mutation-comment");

	geneSelect.selectAll("option")
		.data(['-- choose gene --'].concat(data.genes)).enter()
		.append("option")
		.attr("value", function(d){ return d; })
		.text(function(d){ return d; });

	geneSelect.on("change", function(){
		// Get the selected option
		var val = d3.select(this).node().value;

		// Hide everything but the protein one selector if no gene is chosen
		if (val == "-- choose gene --"){
			mutationForm.selectAll(".toggle").style("display", "none");
		// Otherwise, show and populate the protein two select
		} else{
			mutationForm.selectAll(".toggle").style("display", "inline");
		}
	});

	// Set up the bloodhound for the typeahead enginge
	function invertCancerTy(name){ return name in cancerToAbbr ? cancerToAbbr[name].toUpperCase()  : name; }
	var cancerBloodhound = new Bloodhound({
		datumTokenizer: function(data){
			// For each datum, return an array of the value (cancers) and
			// abbreviations broken up by whitespace
			var cancerTokens = Bloodhound.tokenizers.whitespace(data.value),
				abbrTokens = Bloodhound.tokenizers.whitespace(data.abbr)
			return cancerTokens.concat(abbrTokens);
		},
		queryTokenizer: Bloodhound.tokenizers.whitespace,
		local: $.map(cancers, function(c) { return { value: c, abbr: invertCancerTy(c) }; })
	});
	cancerBloodhound.initialize();

	// Compile the template for showing suggestions
	var templ = Hogan.compile('<p><strong>{{value}}</strong> ({{abbr}})</p>');
	$("input#cancer-typeahead").typeahead({highlight: true}, {
		name: 'cancers',
		displayKey: 'value',
		source: cancerBloodhound.ttAdapter(),
		templates:{
			suggestion: function(data){ return templ.render(data); }
		}
	});

	// Handle the mutation dispatch events
	gd3.dispatch.on("mutation.magi", function(d){
		toggleForm("mutation");
		mutationForm.selectAll(".toggle").style("display", "inline");
		geneSelect.property('value', d.gene);
		abberationSelect.property('value', d.mutation_class);
		cancerInput.property('value', data.datasetToCancer[d.dataset]);
		mutationInput.property('value', d.mutation_type ? d.mutation_type : "");
		console.log(d.change)
		locusInput.property('value', d.change ? d.change : "");
		domainInput.property('value', d.domain ? d.domain : "");
	});

  ///////////////////////////////////////////////////////////////////////////////
  // Functions for switching/resetting the forms

	// Reset
  	resetAnnotations = function (ty){
		if (!arguments.length) ty = annotationType.node().value;
		if (ty == "mutation"){
			mutationForm.selectAll(".toggle").style("display", "none");
			geneSelect.property('value', '-- choose gene --');
			abberationSelect.property('value', "");
			cancerInput.property('value', "");
			mutationPMID.property('value', '');
			mutationInput.property('value', "");
			locusInput.property('value', "");
			domainInput.property('value', "");
			mutationComment.property('value', '');
		} else if (ty == "interaction"){
			interactionForm.selectAll(".toggle").style("display", "none");
			proteinOneSelect.property('value', '-- choose gene --');
			ppiPMID.property('value', '');
			ppiComment.property('value', '');
		}
	}

  	// Switch the form being displayed
	toggleForm = function (ty){
		if (ty == "mutation"){
			interactionForm.style("display", "none");
			mutationForm.style("display", "inline");
			annotationType.attr('value', 'mutation');
			d3.select("a#show-interaction-form").style({"font-weight": "normal", "text-decoration": "none"});
			d3.select("a#show-mutation-form").style({"font-weight": "bold", "text-decoration": "underline"});
			resetAnnotations('interaction');
		} else if (ty == "interaction"){
			interactionForm.style("display", "inline");
			mutationForm.style("display", "none");
			annotationType.attr('value', 'interaction');
			d3.select("a#show-mutation-form").style({"font-weight": "normal", "text-decoration": "none"});
			d3.select("a#show-interaction-form").style({"font-weight": "bold", "text-decoration": "underline"});
			resetAnnotations('mutation');
		}
	}

	///////////////////////////////////////////////////////////////////////////
	// Respond to the form submission to add a new annotation

	// PMID validator
	function validatePMID(pmid){
		if (pmid == ""){
			annotationStatus("Please enter at least one valid PMID or PMCID.", warningClasses);
			return false;
		}
		return true;
	}

	$("form#annotations").on("submit", function(e){
		// Reset the messages
		annotationStatus("", "");
		e.preventDefault();

		// Figure out whether a PPI or mutation annotation is being added
		var type = annotationType.attr('value');
		
		// If it's a mutation
		if (type == 'mutation'){
			// Retrieve the values filled out in the form
			var pmid = mutationPMID.property('value'),
				gene = geneSelect.node().value,
				mutationClass = abberationSelect.node().value,
				cancer = cancerInput.property('value'),
				mutationType = mutationInput.property('value'),
				change = locusInput.property('value'),
				domain = domainInput.property('value'),
				comment = mutationComment.property('value');

			// Hard-code amps/dels as CNAs
			if (mutationClass == 'amp' || mutationClass == 'del'){
				mutationType = mutationClass == 'amp' ? 'amplification' : 'deletion';
				mutationClass = 'cna';
			}

			if (!validatePMID(pmid)) return false;
			var url = '/save/annotation/mutation',
				formData = populateForm({
					pmid: pmid,
					gene: gene,
					mutationClass: mutationClass,
					cancer: cancer,
					mutationType: mutationType,
					change: change, 
					domain: domain,
					comment: comment
				});

		// If it's a PPI
		} else {
			// Retrieve the values filled out in the form
			var pmid    = ppiPMID.property('value'),
				source  = proteinOneSelect.node().value,
				target  = proteinTwoSelect.node().value,
				comment = ppiComment.property('value');

			// Validate the PubMed ID and construct the form to submit
			if (!validatePMID(pmid)) return false;
			var url = '/save/annotation/ppi',
				formData = populateForm({
					pmid: pmid,
					source: source,
					target: target,
					comment: comment
				});
		}

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

				// Reset the form
				resetAnnotations();
			}
		});

		// Return false because we don't actually want the form to submit
		return false;

	});
}

// If the user isn't logged in then we don't need to worry about
// annotations
if (user) initializeAnnotations();
