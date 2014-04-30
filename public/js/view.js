/* Master D3 controller for the view */

// Hard-code the names of each element
var m2Element = "div#mutation-matrix",
	subnetworkElement = "div#subnetwork",
	transcriptElement = "div#transcript-plot",
	transcriptSelectElement = "select#transcript-plot-select",
	cnaBrowserElement = "div#cna-browser",
	cnaBrowserSelectElement = "select#cna-browser-select",
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
	submitElement = "div#annotation button#submit";

// Select each element for easy access later
var m2 = d3.select(m2Element),
	subnet = d3.select(subnetworkElement),
	transcript = d3.select(transcriptElement),
	transcriptSelect = d3.select(transcriptSelectElement),
	cnaBrowser = d3.select(cnaBrowserElement),
	cnaBrowserSelect = d3.select(cnaBrowserSelectElement),
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
	sty.colorSchemes.network["Community"] = "rgb(230, 189, 123)";
	return sty; 
}

// Hard-code the classes and names of mutations (TODO: more elegant way later)
var mutationToClass = {
			snv: "SNV",
			del: "Del",
			inactive_snv: "SNV",
			amp: "Amp",
			other: "Other"
		},
	mutationToName = {
			snv: "SNV",
			del: "Deletion",
			inactive_snv: "Inactivating SNV",
			amp: "Amplification",
			other: "Other"
		};

// Parse the GET url parameters and generate the GET query to get the data
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var genes = getParameterByName("genes")
	datasets = getParameterByName("datasets"),
	showDuplicates = getParameterByName("showDuplicates") == "true",
	query = "/data/bundle?genes=" + genes + "&datasets=" + datasets;

// Make sure there are some genes and datasets
function noData(){
	d3.select("#view").selectAll("*").remove();
	d3.select("#control-panel").remove();
	d3.select("#view")
		.append("b")
		.style("height", "80%")
		.html("No data provided. Return to the <a href='/'>home page</a> to create a query.")
	throw { name: 'FatalError', message: 'No data provided' };
}

if (!genes || !datasets) noData();

///////////////////////////////////////////////////////////////////////////
// Get the data and initialize the view
var votePPI, voteMutation;
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
		datasetToSamples = data.mutation_matrix.typeToSamples;

	var datasetData = Object.keys(datasetToColor).map(function(d){
		return { name: d, color: datasetToColor[d], numSamples: datasetToSamples[d].length, active: true };
	}).sort(function(a, b){ return d3.ascending(a.name, b.name); });

	var datasetToInclude = {};
	datasetData.forEach(function(d){ datasetToInclude[d.name] = true; });

	///////////////////////////////////////////////////////////////////////////
	// Define a function to generate the tooltips for the mutation matrix.
	// You need a function to generate the tooltip function since the annotations can
	// change over time
	function generateAnnotations(annotations){
		return function(d, i){
			var mutationClass = mutationToClass[d.ty],
				tip  = "<div class='m2-tooltip' id='" + d.gene + "-" + d.sample + "'>"
			tip += "<span>Sample: " + d.sample.name + '<br />Type: ' + d.dataset + "<br/>" + "Mutation: " + mutationToName[d.ty] + "</span>";
			if (annotations[d.gene] && annotations[d.gene][mutationClass]){
				var cancers = Object.keys(annotations[d.gene][mutationClass]);
				tip += "<br style='clear:both'/>Known mutations<div class='less-info'>"
				if (cancers.length <= 2){
					tip += " in " + cancers.map(invertCancerTy).join(" and ") + ".";
				}
				else{
					tip += " in " + cancers.slice(0, 2).map(invertCancerTy).join(", ") + ", and " + (cancers.length - 2) + " others.";	
				}

				tip += "</div>"

				// Add the PMIDs
				function pmidLink(pmid){ return "<li><a href='http://www.ncbi.nlm.nih.gov/pubmed/" + pmid + "' target='_new'>" + pmid + "</a></li>"}
				tip += "<div class='more-info'><table class='table table-condensed'>\n<tr><th>Cancer</td><th>PMIDs</td></tr>\n"
				cancers.forEach(function(cancer){
					var pmids = annotations[d.gene][mutationClass][cancer].map(pmidLink).join("\n");
					tip += "<tr><td>" + cancer + "</td><td><ul>" + pmids + "</ul></td></tr>\n"
				});
				tip += "</table>\n</div><br/><a href='/annotations/gene/" + d.gene + "' target='_new'>Click to view details &raquo;</a>"
			}

			return tip + "</div>\n";
		}
	}

	// Add the mutation matrix
	var annotations = data.annotations;
	var m2Chart = mutation_matrix({style: style.mutation_matrix})
					.addCoverage()
					.addMutationLegend()
					.addSortingMenu()
					.addTooltips(generateAnnotations(annotations))
					.addOnClick(function(d, i){
						console.log( d )
						var mutClass = d.ty == "amp" ? "Amp" : d.ty == "del" ? "Del" : "SNV";
						setAnnotation(d.gene, mutClass, d.dataset, {});
					});
	if (showDuplicates) m2Chart.showDuplicates();

	m2.datum(data.mutation_matrix);
	m2Chart(m2);

	///////////////////////////////////////////////////////////////////////////
	// Add the subnetwork plot

	// Initialize the hash of references to votes
	var refs = data.subnetwork_data.refs;

	// Function for updating the tooltips when a user votes, and storing the
	// resulting vote in the datbase
	votePPI = function (network, source, target, pmid, direction){
		// Extract the voting data and the respective elements
		var d = refs[network][source][target][pmid],
			voteID = [network, source, target, pmid].join("-"),
			up = $("td#" + voteID + " a.upvote"),
			down = $("td#" + voteID + " a.downvote"),
			count = $("td#" + voteID + " span");

		// Update the arrows in the tooltip
		if (direction == "down" || d.vote == "down") down.toggleClass("downvote-on");
		if (direction == "up" || d.vote == "up") up.toggleClass("upvote-on");

		// Update the arrows in the tooltip
		if (direction == "up"){
			d.score += d.vote == "up" ? -1 : d.vote == "down" ? 2 : 1;
			d.vote = d.vote == "up" ? null : "up";
		}
		else if (direction == "down"){
			d.score += d.vote == "up" ? -2 : d.vote == "down" ? 1 : -1;
			d.vote = d.vote == "down" ? null : "down";
		}

		// Finally, update the count
		count.text(d.score);

		// Create a form to submit as an AJAX request to update the database
        var formData = new FormData();
        formData.append( 'source', source );
        formData.append( 'target', target );
        formData.append( 'network', network );
        formData.append( 'pmid', pmid );
        formData.append( 'vote', direction );


        $.ajax({
            // Note: can't use JSON otherwise IE8 will pop open a dialog
            // window trying to download the JSON as a file
            url: '/vote/ppi',
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

	// Draw the subnetwork chart with tooltips onmouseover and
	// preset annotations onclick
	var subnetChart = subnetwork({style: style.subnetwork})
                	.addNetworkLegend()
                	.addGradientLegend()
                	.addTooltips(function(d, activeNetworks){
						// Sort the names to ensure source/target are always in the same order
						// (since we have an undirected graph)
						var sortedNames = [d.source.name, d.target.name].sort(),
							source= sortedNames[0],
							target = sortedNames[1],
							tip = "<div id='subnet-tooltip'>\n";

						// Add basic information about the edge
						tip += "Source: " + source + "<br/>Target: " + target + "<br/><br/>";

						// Display each tooltip's references as a table of networks to unordered
						// lists of references
						function pmidLink(pmid){ return "<a href='http://www.ncbi.nlm.nih.gov/pubmed/" + pmid + "' target='_new'>" + pmid + "</a>" }

						// Create a table the (active) networks in which the edge appears,
						// and list the references for each edge
						tip += "<table class='table table-condensed'>\n<tr><th>Network</th><th>PMID</th><th>Votes</th></tr>\n"
						d.networks.filter(function(n){ return activeNetworks[n]; }).forEach(function(n){
							// Add a row with just the network if there are no references
							if (d.references[n].length == 0){
								tip += "<tr><td>" + n + "</td><td></td><td></td></tr>";
							}

							// Add the references as separate rows
							d.references[n].forEach(function(ref){
								var pmid = ref.pmid,
									voteID = [n, source, target, pmid].join("-"),
									score = refs[n][source][target][pmid].score;

								// Create a new row with the network name and reference
								var row = "<tr><td>" + (d.references[n][0] == ref ? n : "") + "</td>";
								row    += "<td>" + pmidLink(pmid) + "</td>";

								// Add -/+ buttons for users to vote on PMIDs annotating a particular edge,
								// but only if the user is logged in
								if (user){
									var upvoted = refs[n][source][target][pmid].vote == "up",
										upLinkClass = upvoted ? "upvote upvote-on" : "upvote",
										downvoted =  refs[n][source][target][pmid].vote == "down",
										downLinkClass = downvoted ? "downvote downvote-on" : "downvote",
										uplink = "<a class='" + upLinkClass + "' onclick='votePPI(\"" + n + "\", \"" + source + "\", \"" + target + "\", \"" + pmid + "\", \"up\"); return false;'>+</a>",
										downlink = "<a class='" + downLinkClass + "' onclick='votePPI(\"" + n + "\", \"" + source + "\", \"" + target + "\", \"" + pmid + "\", \"down\"); return false;'>-</a>";
								}
								else{
									var uplink = "", downlink = "";
								}

								row += "<td id='" + voteID + "'>" + downlink + "<span class='count'>" + score + "</span>" + uplink + "</td></tr>";
									
								// Append the row
								tip += row;
							});
						});

						return tip + "</table>\n</div>\n";
                	})
                	.addOnClick(function(d, i, el){
                		setAnnotation(d.source.name, "interact", d.target.name, {} );
                	});

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
		transcripts.sort(function(a, b){ return a.numMutations < b.numMutations ? 1 : -1 });

		var optGroup = transcriptSelect.append("optgroup")
			.attr("label", g);

		optGroup.selectAll(".options")
			.data(transcripts).enter()
			.append("option")
			.attr("value", function(d){ return g + "," + d.name; })
			.text(function(d){ return d.name + " (" + d.numMutations + " mutations)"; });

		// Store the first gene and transcript for initialization later
		if (transcripts.length > 0 && !firstGene && !firstTranscript){
			firstGene = g;
			firstTranscript = transcripts[0].name;
		}
	});

	// Set the default params for the transcript plot
	var transcriptParams = { style: style.transcript, domainDB: data.domainDBs[0] },
		transcriptChart = transcript_plot(transcriptParams)
	              		.addLegend()
	              		.addVerticalPanning()
	              		.addTooltips(function(d, i){
	              			return d.sample + '<br />Type: ' + d.dataset + "<br/>"
	              				   + d.ty.replace(/_/g, ' ') + '<br />'
	              				   + d.locus + ': ' + d.aao + '>' + d.aan;
	              		})
						.addOnClickMutations(function(d, i){
							var fields = {
								transcript_mutation: true,
								position: d.locus,
								mut_ty: d.ty
							};
							setAnnotation(d.gene, "SNV", d.dataset, fields);
						})
						.addOnClickDomains(function(d, i){
							var fields = {
								transcript_domain: true,
								domain: d.name
							};
							setAnnotation(d.gene, "SNV", "", fields);
						});

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

	// Initialize the transcript plot with the first gene and transcript
	// (if the gene has SNVs)
	if (firstGene && firstTranscript){
		transcript.datum(data.transcript_data[firstGene][firstTranscript]);
		transcript.append("h5").text(firstGene);
		transcriptChart(transcript);
		transcriptChart.filterDatasets(datasetToInclude);
	}

	///////////////////////////////////////////////////////////////////////////
	// Add a CNA browser selector to choose the genes
	var cnaChart = cna_browser({ style: style.cnabrowser })
		.addTooltips()
		.addOnClick(function(d){
			var mutClass = d.ty == "amp" ? "Amp" : "Del";
			setAnnotation(d.gene, mutClass, d.dataset);
		});

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
	cnaGenes.sort(function(a, b){ return a.numCNAs < b.numCNAs ? 1 : -1; });

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
	else{
		cnaBrowserSelect.style("display", "none");
		d3.select("div#cna-browser").append("b").text("No copy number data for these genes.")
	}

	///////////////////////////////////////////////////////////////////////////
	// Update the control panel
	var datasetsPanel = controls.append("div")
		.attr("class", "panel panel-default")
		.style("padding", "0px")

	// Add a heading
	var datasetHeading = datasetsPanel.append("div")
		.attr("class", "panel-heading")
		.style("padding", "5px")
			.append("h5")
			.attr("class", "panel-title")
			.attr("data-toggle", "collapse")
			.attr("data-parent", "#accordion")
			.attr("href", "#collapseDataset")
			.style("cursor", "pointer")
			.style("font-size", "14px")
			.style("width", "100%")
			.text("Datasets");

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
			// Determine if the dataset is currently active
			var active = d.active,
				opacity = active ? 0.5 : 1;

			// Create a dictionary to update the status of the current dataset
			d.active = !active;
			datasetToInclude[d.name] = d.active;

			// Filter the mutation matrix, transcript plot, and CNA browser
			m2Chart.filterDatasets(datasetToInclude);
			if (genes.length > 0) transcriptChart.filterDatasets(datasetToInclude);
			
			if (cnaGenes.length > 0) cnaChart.filterDatasets(datasetToInclude);

			// Fade in/out this dataset
			d3.select(this).style("opacity", opacity);
		});

	datasetEls.append("div").attr("class", "dataset-color").style("background", function(d){ return d.color; });
	datasetEls.append("div").text(function(d){ return d.name + " (" + d.numSamples + ")"; });

	///////////////////////////////////////////////////////////////////////////
	// Update the annotations

	// Add the genes to the first select
	annotatedGene.selectAll(".gene-option")
		.data(genes).enter()
		.append("option")
			.attr("value", function(g){ return g; })
			.text(function(g){ return g; });

	///////////////////////////////////////////////////////////////////////////
	// Set up the cancers input, with abbreviations
	
	//	List of cancers with abbreviations from TCGA (http://goo.gl/2A3UuH) and ICGC (http://dcc.icgc.org/projects)
	var abbrToCancer,
		cancerToAbbr = {};

	d3.json("/data/abbrToCancer.json", function(abbrs){
		// Load and parse the abbreviations
		abbrToCancer = abbrs;
		Object.keys(abbrToCancer).forEach(function(k){ cancerToAbbr[abbrToCancer[k]] = k; })
		cancers = Object.keys(cancerToAbbr);
	
		// Set up the bloodhound for the typeahead enginge
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
		$(cancerInputElement + " .typeahead").typeahead({highlight: true}, {
			  name: 'cancers',
			  displayKey: 'value',
			  source: cancerBloodhound.ttAdapter(),
			  templates:{
			  	suggestion: function(data){ return templ.render(data); }
			  }
		});
	});

	// Create a map of cancers to their abbreviations, and a list of all cancers
	// 
	function invertCancerTy(name){ return name in cancerToAbbr ? cancerToAbbr[name].toUpperCase()  : name; }
	function getCancerTy(name){
		var lowName = name.toLowerCase()
		return lowName in abbrToCancer ? abbrToCancer[lowName] : name;
	}


	// Resetter for the annotation menu
	function resetAnnotation(){
		interactor.selectAll("*").remove();
		annotateInput.style("display", "none");
		cancerInput.style("display", "none");
		$(interactionElement).val("");
		$(annotatedGeneElement).val("");
		$(annotationsElement + " input").val("");
		$(cancerTypeaheadElement).val("");
		$(interactorElement).hide().val("");
		$(transcriptMutationElement + " input").val("")
		$(transcriptMutationElement).hide();
		$(transcriptPositionElement + " input").val("");
		$(transcriptPositionElement).hide();
		$(transcriptDomainElement + " input").val("");
		$(transcriptDomainElement).hide();
		$(commentElement).val("");
	}
	$("#reset-annotation").on("click", resetAnnotation);

	// Setter for the current interaction type
	function setAnnotation( gene, interaction, interactorName, fields ){
		// Reset the form
		resetAnnotation();

		// Set the gene name and the interaction type, and update
		// the remainder of the form appropriately
		$(annotatedGeneElement).val(gene);
		$(interactionElement).val(interaction);
		updateInteraction();

		// Make the interaction-specific changes
		if (interaction == "interact"){
			$(interactorElement).val(interactorName);
		}
		else{
			$(cancerInputElement + " input").val(getCancerTy(interactorName));
			if (fields.transcript_mutation){
				$(transcriptMutationElement + " input").val(fields.mut_ty)
				$(transcriptMutationElement).show();
				$(transcriptPositionElement + " input").val(fields.position).show();
				$(transcriptPositionElement).show();
			}
			else if (fields.transcript_domain){
				//$(transcriptMutationElement).show();
				//$(transcriptMutationElement + " input").val(fields.mut_ty);
				$(transcriptDomainElement + " input").val(fields.domain);
				$(transcriptDomainElement).show();
			}
		}
	}

	// Updater for whenever an interaction type is chosen
	function updateInteraction(){
		var val = $(interactionElement).val(),
			geneName = $(annotatedGeneElement).val();

		annotationStatus("", "");

		if (geneName != "" && val != ""){
			if (val == "interact"){
				interactor.selectAll("*").remove();
				interactor.selectAll(".gene2-option")
					.data(genes.filter(function(g){ return g != geneName; })).enter()
					.append("option")
						.attr("value", function(d){ return d; })
						.text(function(d){ return d; });
				interactor.style("display", "inline");
				cancerInput.style("display", "none");
			}
			else{
				interactor.style("display", "none");
				cancerInput.style("display", "inline");
			}
			annotateInput.style("display", "inline");
		}
		else{
			annotateInput.style("display", "none");
			cancerInput.style("display", "none");
		}
	}

	interaction.on("change", updateInteraction);
	annotatedGene.on("change", updateInteraction);

	// Define the submit request
    var infoClasses  = 'alert alert-info',
    	warningClasses = 'alert alert-warning',
    	successClasses = 'alert alert-success';

	$("div#annotation form#annotation-form").on("submit", function(e){
		// Reset the messages
		annotationStatus("", "");

		// Retrieve the values of the entries
		var pmid = $(annotationsElement + " input").val(),
			gene = $(annotatedGeneElement).val(),
			interactionClass = $(interactionElement).val(),
			mutationType = $(transcriptMutationElement + " input").val(),
			domainName = $(transcriptDomainElement + " input").val(),
			position = $(transcriptPositionElement + " input").val(),
			comment = $(commentElement).val();

		// Validate the PMID
		if (pmid == "" || pmid.length != 8 || isNaN(parseFloat(pmid)) || !isFinite(pmid) ){
			annotationStatus("Please enter at least one valid PMID (8-character number).", warningClasses);
			return false;
		}

		// Validate the interaction/annotation
		var interactorName = interactionClass == "interact" ? $(interactorElement).val() : $(cancerTypeaheadElement).val();
		if (gene == "" || interactionClass == "" || interactorName == ""){
			if (interactionClass == "interact"){ var msg = "Please select a pair of genes." }
			else{ var msg = "Please select a gene and a cancer type." }
			annotationStatus(msg, warningClasses);
			return false;
		}

		// If the entries validate, create a mini-form and then submit via Ajax
        var formData = new FormData();
        formData.append( 'support', pmid );
        formData.append( 'gene', gene );
        formData.append( 'interaction', interactionClass );
        formData.append( 'interactor', interactorName );
        formData.append( 'position', position );
        formData.append( 'mutationType', mutationType );
        formData.append( 'domainName', domainName );
        formData.append( 'comment', comment );

        $.ajax({
            // Note: can't use JSON otherwise IE8 will pop open a dialog
            // window trying to download the JSON as a file
            url: '/save/annotation',
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

                // Add the data to the current annotations
                if (interactionClass != "interact"){
                	var cancerTy = interactorName,
                		mClass = interactionClass;
	                if (!annotations[gene]) annotations[gene] = {};
	                if (!annotations[gene][mClass]) annotations[gene][mClass] = {};
	                if (!annotations[gene][mClass][cancerTy]) annotations[gene][mClass][cancerTy] = [];
					annotations[gene][mClass][cancerTy].push( pmid );

					m2Chart.addTooltips(generateAnnotations(annotations));
				}

                // Reset the form
				resetAnnotation();
            }
        });

        // Return false because we don't actually want the form to submit
        return false;

	});

    function annotationStatus(msg, classes) {
        $("#annotationStatus").attr('class', classes);
        $('#annotationStatus').html(msg);
    }

});