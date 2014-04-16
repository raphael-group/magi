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
	return sty; 
}

// Hard-code the classes and names of mutations (TODO: more elegant way later)
var mutationToClass = {
			snv: "SNV",
			del: "Del",
			inactive_snv: "SNV",
			amp: "Amp"
		},
	mutationToName = {
			snv: "SNV",
			del: "Deletion",
			inactive_snv: "Inactivating SNV",
			amp: "Amplification"
		};

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
	// Define a function to generate the tooltips for the mutation matrix.
	// You need a function to generate the tooltip function since the annotations can
	// change over time
	function generateAnnotations(annotations){
		return function(d, i){
			var mutationClass = mutationToClass[d.ty],
				tip  = "<div class='m2-tooltip' id='" + d.gene + "-" + d.sample + "'>"
			tip += "<span>Sample: " + d.sample + '<br />Type: ' + d.dataset + "<br/>" + "Mutation: " + mutationToName[d.ty] + "</span>";
			if (annotations[d.gene] && annotations[d.gene][mutationClass]){
				var cancers = Object.keys(annotations[d.gene][mutationClass]);
				tip += "<br style='clear:both'/>Known mutations<div class='less-info'>"
				if (cancers.length <= 2){
					tip += " in " + cancers.join(" and ") + ".";
				}
				else{
					tip += " in " + cancers.slice(0, 2).join(", ") + ", and " + (cancers.length - 2) + " others.";	
				}

				tip += "<br/><a href='/annotations/gene/" + d.gene + "' target='_new'>Click to view details &raquo;</a></div>"
				
				// Add the PMIDs
				function pmidLink(pmid){ return "<li><a href='http://www.ncbi.nlm.nih.gov/pubmed/" + pmid + "' target='_new'>" + pmid + "</a></li>"}
				tip += "<div class='more-info'><table class='table table-condensed'>\n<tr><th>Cancer</td><th>PMIDs</td></tr>\n"
				cancers.forEach(function(cancer){
					var pmids = annotations[d.gene][mutationClass][cancer].map(pmidLink).join("\n");
					tip += "<tr><td>" + cancer + "</td><td><ul>" + pmids + "</ul></td></tr>\n"
				});
				tip += "</table>\n</div>"
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
					.addTooltips(generateAnnotations(annotations));

	m2.datum(data.mutation_matrix);
	m2Chart(m2);

	// Add the subnetwork plot
	var subnetChart = subnetwork({style: style.subnetwork})
                	.addNetworkLegend()
                	.addGradientLegend()
                	.addTooltips();
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
	              		.addTooltips()
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
	var cnaChart = cna_browser({ style: style.cnabrowser }).addTooltips();
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
			transcriptChart.filterDatasets(datasetToInclude);
			cnaChart.filterDatasets(datasetToInclude);

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

	// Make the cancer typeahead
	var substringMatcher = function(strs) {
		return function findMatches(q, cb) {
			var matches, substringRegex;

			// an array that will be populated with substring matches
			matches = [];

			// regex used to determine if a string contains the substring `q`
			substrRegex = new RegExp(q, 'i');

			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
				if (substrRegex.test(str)) {
				// the typeahead jQuery plugin expects suggestions to a
				// JavaScript object, refer to typeahead docs for more info
				matches.push({ value: str });
				}
			});

			cb(matches);
		};
	};

	var cancers = ["Acute lymphoblastic leukemia (ALL)", "Acute myeloid leukemia", "Adrenocortical carcinoma", "AIDS-related cancers", "AIDS-related lymphoma", "Anal cancer", "Appendix cancer", "Astrocytoma, childhood cerebellar or cerebral", "Basal-cell carcinoma", "Bile duct cancer, extrahepatic (see Cholangiocarcinoma)", "Bladder cancer", "Bone tumor, Osteosarcoma/Malignant fibrous histiocytoma", "Brainstem glioma", "Brain cancer", "Brain tumor, cerebellar astrocytoma", "Brain tumor, cerebral astrocytoma/malignant glioma", "Brain tumor, ependymoma", "Brain tumor, medulloblastoma", "Brain tumor, supratentorial primitive neuroectodermal tumors", "Brain tumor, visual pathway and hypothalamic glioma", "Breast cancer", "Bronchial adenomas/carcinoids", "Burkitt\'s lymphoma", "Carcinoid tumor, childhood", "Carcinoid tumor, gastrointestinal", "Carcinoma of unknown primary", "Central nervous system lymphoma, primary", "Cerebellar astrocytoma, childhood", "Cerebral astrocytoma/Malignant glioma, childhood", "Cervical cancer", "Childhood cancers", "Chronic bronchitis", "Chronic lymphocytic leukemia", "Chronic myelogenous leukemia", "Chronic myeloproliferative disorders", "Chronic obstructive pulmonary disease (COPD)", "Colon Cancer", "Cutaneous T-cell lymphoma", "Desmoplastic small round cell tumor", "Emphysema", "Endometrial cancer", "Ependymoma", "Esophageal cancer", "Ewing\'s sarcoma in the Ewing family of tumors", "Extracranial germ cell tumor, Childhood", "Extragonadal Germ cell tumor", "Extrahepatic bile duct cancer", "Eye Cancer, Intraocular melanoma", "Eye Cancer, Retinoblastoma", "Gallbladder cancer", "Gastric (Stomach) cancer", "Gastrointestinal Carcinoid Tumor", "Gastrointestinal stromal tumor (GIST)", "Germ cell tumor: extracranial, extragonadal, or ovarian", "Gestational trophoblastic tumor", "Glioma of the brain stem", "Glioma, Childhood Cerebral Astrocytoma", "Glioma, Childhood Visual Pathway and Hypothalamic", "Gastric carcinoid", "Hairy cell leukemia", "Head and neck cancer", "Heart cancer", "Hepatocellular (liver) cancer", "Hodgkin lymphoma", "Hypopharyngeal cancer", "Hypothalamic and visual pathway glioma, childhood", "Intraocular Melanoma", "Islet Cell Carcinoma (Endocrine Pancreas)", "Kaposi sarcoma", "Kidney cancer (renal cell cancer)", "Laryngeal Cancer", "Leukemias", "Leukemia, acute lymphoblastic (also called acute lymphocytic leukemia)", "Leukemia, acute myeloid (also called acute myelogenous leukemia)", "Leukemia, chronic lymphocytic (also called chronic lymphocytic leukemia)", "Leukemia, chronic myelogenous (also called chronic myeloid leukemia)", "Leukemia, hairy cell", "Lip and Oral Cavity Cancer", "Liposarcoma", "Liver Cancer (Primary)", "Lung Cancer, Non-Small Cell", "Lung Cancer, Small Cell", "Lymphomas", "Lymphoma, AIDS-related", "Lymphoma, Burkitt", "Lymphoma, cutaneous T-Cell", "Lymphoma, Hodgkin", "Lymphomas, Non-Hodgkin (an old classification of all lymphomas except Hodgkin\'s)", "Lymphoma, Primary Central Nervous System", "Macroglobulinemia, Waldenstr\\u00f6m", "Male breast cancer", "Malignant Fibrous Histiocytoma of Bone/Osteosarcoma", "Medulloblastoma, Childhood", "Melanoma", "Melanoma, Intraocular (Eye)", "Merkel Cell Carcinoma", "Mesothelioma, Adult Malignant", "Mesothelioma, Childhood", "Metastatic Squamous Neck Cancer with Occult Primary", "Mouth Cancer", "Multiple Endocrine Neoplasia Syndrome, Childhood", "Multiple Myeloma/Plasma Cell Neoplasm", "Mycosis Fungoides", "Myelodysplastic Syndromes", "Myelodysplastic/Myeloproliferative Diseases", "Myelogenous Leukemia, Chronic", "Myeloid Leukemia, Adult Acute", "Myeloid Leukemia, Childhood Acute", "Myeloma, Multiple (Cancer of the Bone-Marrow)", "Myeloproliferative Disorders, Chronic", "Nasal cavity and paranasal sinus cancer", "Nasopharyngeal carcinoma", "Neuroblastoma", "Non-Hodgkin lymphoma", "Non-small cell lung cancer", "Oral Cancer", "Oropharyngeal cancer", "Osteosarcoma/malignant fibrous histiocytoma of bone", "Ovarian cancer", "Ovarian epithelial cancer (Surface epithelial-stromal tumor)", "Ovarian germ cell tumor", "Ovarian low malignant potential tumor", "Pancreatic cancer", "Pancreatic cancer, islet cell", "Paranasal sinus and nasal cavity cancer", "Parathyroid cancer", "Penile cancer", "Pharyngeal cancer", "Pheochromocytoma", "Pineal astrocytoma", "Pineal germinoma", "Pineoblastoma and supratentorial primitive neuroectodermal tumors, childhood", "Pituitary adenoma", "Plasma cell neoplasia/Multiple myeloma", "Pleuropulmonary blastoma", "Primary central nervous system lymphoma", "Prostate cancer", "Rectal cancer", "Renal cell carcinoma (kidney cancer)", "Renal pelvis and ureter, transitional cell cancer", "Retinoblastoma", "Rhabdomyosarcoma, childhood", "Salivary gland cancer", "Sarcoma, Ewing family of tumors", "Sarcoma, Kaposi", "Sarcoma, soft tissue", "Sarcoma, uterine", "S\\u00e9zary syndrome", "Skin cancer (nonmelanoma)", "Skin cancer (melanoma)", "Skin carcinoma, Merkel cell", "Small cell lung cancer", "Small intestine cancer", "Soft tissue sarcoma", "Squamous cell carcinoma \\u2013 see Skin cancer (nonmelanoma)", "Squamous neck cancer with occult primary, metastatic", "Stomach cancer", "Supratentorial primitive neuroectodermal tumor, childhood", "T-Cell lymphoma, cutaneous \\u2013 see Mycosis Fungoides and S\\u00e9zary syndrome", "Testicular cancer", "Throat cancer", "Thymoma, childhood", "Thymoma and Thymic carcinoma", "Thyroid cancer", "Thyroid cancer, childhood", "Transitional cell cancer of the renal pelvis and ureter", "Trophoblastic tumor, gestational", "Unknown primary site, carcinoma of, adult", "Unknown primary site, cancer of, childhood", "Ureter and renal pelvis, transitional cell cancer", "Urethral cancer", "Uterine cancer, endometrial", "Uterine sarcoma", "Vaginal cancer", "Visual pathway and hypothalamic glioma, childhood", "Vulvar cancer", "Waldenstrom macroglobulinemia", "Wilms tumor (kidney cancer), childhood"];
	$(cancerInputElement + " .typeahead").typeahead({
		  hint: true,
		  highlight: true,
		  minLength: 1
		},
		{
		  name: 'cancers',
		  displayKey: 'value',
		  source: substringMatcher(cancers)
	});

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

		// Validate the entries
		var pmid = $(annotationsElement + " input").val(),
			gene = $(annotatedGeneElement).val(),
			mClass = $(interactionElement).val(),
			cancerTy = $(cancerTypeaheadElement).val();

		if (pmid == "" || pmid.length != 8 || isNaN(parseFloat(pmid)) || !isFinite(pmid) ){
			annotationStatus("Please enter at least one valid PMID (8-character number).", warningClasses);
			return false;
		}

		if (gene == "" || mClass == "" || cancerTy == ""){
			annotationStatus("Please select a gene, an interaction, and a second gene or cancer.", warningClasses);
			return false;
		}

		// If the entries validate, create a mini-form and then submit via Ajax
        var formData = new FormData();
        formData.append( 'support', pmid );
        formData.append( 'gene', gene );
        formData.append( 'interaction', mClass );
        formData.append( 'interactor', cancerTy );

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
                if (!annotations[gene]) annotations[gene] = {};
                if (!annotations[gene][mClass]) annotations[gene][mClass] = {};
                if (!annotations[gene][mClass][cancerTy]) annotations[gene][mClass][cancerTy] = [];
				annotations[gene][mClass][cancerTy].push( pmid );

				m2Chart.addTooltips(generateAnnotations(annotations));

                // Reset the form
                annotateInput.style("display", "none");
                interactor.style("display", "none");
                cancerInput.style("display", "none")
                $(interactionElement).val("");
                $(annotatedGeneElement).val("");
                $(annotationsElement + " input").val("");
                $(cancerTypeaheadElement).val("");

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

