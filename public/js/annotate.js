/* Annotation controller for the view. Responsibilities:
*  1) Populate the annotation forms
*  2) Respond to dispatch click events to populate the annotation forms.
*  3) Set up the voting functions, which will be used by tooltips in view.js.
*/

function initializeAnnotations(){
  ///////////////////////////////////////////////////////////////////////////////
  // Annotations for interactions

  // Select the form and the first protein select
  var interactionFormElement = "form div#interactions",
	  interactionForm = d3.select(interactionFormElement),
	  proteinOneSelect = interactionForm.selectAll("select#protein1"),
	  proteinTwoSelect = interactionForm.selectAll("select#protein2");

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
	  domainInput = mutationForm.select("input#domain");

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
  })

  // Set up the cancers input, with abbreviations

  //  List of cancers with abbreviations from TCGA (http://goo.gl/2A3UuH) and ICGC (http://dcc.icgc.org/projects)
  var abbrToCancer = data.abbrToCancer,
	cancerToAbbr = {};

  Object.keys(abbrToCancer).forEach(function(k){ cancerToAbbr[abbrToCancer[k]] = k; })
  cancers = Object.keys(cancerToAbbr);

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
	locusInput.property('value', d.locus ? d.locus : "");
	domainInput.property('value', d.domain ? d.domain : "");
  });

  ///////////////////////////////////////////////////////////////////////////////
  // Functions for switching/resetting the forms

  // Reset
  function resetAnnotations(ty){
	if (!arguments.length) ty = annotationType.node().value;
	if (ty == "mutation"){
	  mutationForm.selectAll(".toggle").style("display", "none");
	  geneSelect.property('value', '-- choose gene --');
	  abberationSelect.property('value', "");
	  cancerInput.property('value', "");
	  mutationInput.property('value', "");
	  locusInput.property('value', "");
	  domainInput.property('value', "");
	} else if (ty == "interaction"){
	  interactionForm.selectAll(".toggle").style("display", "none");
	  proteinOneSelect.property('value', '-- choose gene --');
	}
  }

  // Switch the form being displayed
  function toggleForm(ty){
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
}

// If the user isn't logged in then we don't need to worry about
// annotations
if (user) initializeAnnotations;
