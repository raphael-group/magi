// Routes for the view
// Load models
var mongoose = require( 'mongoose' ),
	Database = require('../model/db'),
	Samples = require('../model/samples'),
        SQLannotations = require('../model/annotations_sql'),
	Cancers = require('../model/cancers'),
	Datasets = require('../model/datasets'),
	fs = require('fs');

exports.sampleView = function sampleView(req, res){
	console.log('/sample-view');
	var sample = req.query.sample,
		fail = false,
		Sample = Database.magi.model( 'Sample' ),
		Dataset = Database.magi.model( 'Dataset' ),
		Cancer = Database.magi.model( 'Cancer' );

	Sample.findOne({name: sample}, function(err, sample){
		// Fail if we can't find the sample
		if (err){
			console.error(err);
			fail = true;
			return;
		} else if (!sample){
			res.render('sampleView', {error: 'No such sample', sampleName: req.query.sample});
			return;
		}

		var mutGenes = sample.mutations.map(function(d){ return d.name; });

		Dataset.findById(sample.dataset_id, function(err, dataset){
			// Fail if we can't find the dataset for some reason
			if (err){
				console.error(err);
				fail = true;
				return;
			// Provide some authentication
			} else if (!dataset.is_public && dataset.user_id != req.user._id){
				fail = true;
				return;
			}
			var sampleAnnotations = [];

			Object.keys(dataset.sample_annotations[sample.name]).forEach(function(k){
				sampleAnnotations.push({ property: k, value: dataset.sample_annotations[sample.name][k]});
			});

			Cancer.findById(dataset.cancer_id, function(err, cancer){
				if (err){
					console.error(err);
					fail = true;
					return;
				}

			    // Create a list of mutations including the annotations, separating
			    // them into three groups: locus (most important), type (second most
			    // important), and gene (least important)
			    var locusMutations = [],
			    typeMutations = [],
			    geneMutations = [];

			    // call for additional mutations
			    SQLannotations.geneFind(SQLannotations.inGeneClause('gene', mutGenes),'right', function(err, userAnnos) {
				if (err) {
				    console.error(err);
				    fail = true;
				    return;
				} 
				
				annotations = geneTable(mutGenes, userAnnos);

				// Create a list of mutations including the annotations, separating
				// them into three groups: locus (most important), type (second most
				// important), and gene (least important)
				var locusMutations = [],
				typeMutations = [],
				geneMutations = [];
				sample.mutations.forEach(function(d){
				    var g = d.name;
				    d.mutations.forEach(function(m){
					// Remove the p. prefix
					if (typeof(m.change) == 'string'){
					    m.change = m.change.replace("p.", "");
					}
					if (typeof(annotations[g][m.type]) != 'undefined'){
					    if (typeof(annotations[g][m.type][m.change]) != 'undefined'){
						m['annotationType'] = 'locus';
						m['locusReferences'] = annotations[g][m.type][m.change];
						m['typeReferences'] = annotations[g][m.type][""];
						m['geneReferences'] = annotations[g][""];
						locusMutations.push(m)
					    } else {
						m['annotationType'] = 'type';
						m['typeReferences'] = annotations[g][m.type][""];
						m['geneReferences'] = annotations[g][""];
						typeMutations.push(m)
					    }
					} else {
					    m['annotationType'] = 'gene';
					    m['geneReferences'] = annotations[g][""];
					    geneMutations.push( m );
					}
				    });
				});
				// Sort the mutations
				locusMutations.sort(function(a, b){ return a.locusReferences.count > b.locusReferences.count ? -1 : 1; })
				typeMutations.sort(function(a, b){ return a.typeReferences.count > b.typeReferences.count ? -1 : 1; })
				geneMutations.sort(function(a, b){ return a.geneReferences.count > b.geneReferences.count ? -1 : 1; })
				var mutations = locusMutations.concat(typeMutations.concat(geneMutations)).map(function(d){
				    // Prettify the mutation types for display
				    if (d.type == 'missense') d.type = 'Missense';
				    else if (d.type == 'nonsense') d.type = 'Nonsense';
				    else if (d.type == 'splice_site') d.type = 'Splice Site';
				    else if (d.type == 'amp') d.type = 'Amplification';
				    else if (d.type == 'del') d.type = 'Deletion';
				    else if (d.type == 'snv') d.type = 'SNV';
				    return d;
				});
				// Render the page
				res.render('sampleView', {sample: sample, annotations: sampleAnnotations, user: req.user, dataset: dataset, cancer: cancer, mutations: mutations, show_requery: true });
			    });
			});
		})
	});
    if (fail){ res.redirect('/401'); }
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function geneTable(genes, support){
	// Assemble the annotations into a dictionary index by 
	// gene (e.g. TP53) and mutation class (e.g. missense or amp)
	// and then protein change (only applicable for missense/nonsense)
	// 1) Store the total number of references for the gene/class in "",
	//    i.e. annotations['TP53'][''] gives the total for TP53 and 
	//    annotations['TP53']['snv'][''] gives the total for TP53 SNVs.
	// 2) Count the number per protein change.
	var annotations = {};

	genes.forEach(function(g){ annotations[g] = { "": [] }; });

	support.forEach(function(A){
		// We split SNVs into two subclasses: nonsense or missense.
		// We also remove the "_mutation" suffix sometimes present in the
		// mutation types
		var mClass = A.mut_class.toLowerCase(),
			mType = A.mut_type ? A.mut_type.toLowerCase().replace("_mutation", "") : "";
		if (mClass == "snv" && (mType == "missense" || mType == "nonsense")){ mClass = mType; }
		// Add the class if it hasn't been seen before
		if (typeof(annotations[A.gene][mClass]) == 'undefined'){
			annotations[A.gene][mClass] = {"" : [] };
		}

		// If we know the mutaton class, we might also want to add
		// the protein sequence change
		if (mClass == "snv" || mClass == "missense" || mClass == "nonsense"){
			if (A.protein_seq_change){
				A.protein_seq_change = A.protein_seq_change.replace("p.", "");
				if (typeof(annotations[A.gene][mClass][A.protein_seq_change]) == 'undefined'){
					annotations[A.gene][mClass][A.protein_seq_change] = [];
				}

			    annotations[A.gene][mClass][A.protein_seq_change].push({ pmid: A.reference, cancer: A.cancer });

			}
		}
	    annotations[A.gene][mClass][""].push({ pmid: A.reference, cancer: A.cancer });
	    annotations[A.gene][""].push({ pmid: A.reference, cancer: A.cancer });
	});

	// Combine references at the PMID level so that for each
	// annotation type (gene, type, locus) we have a list of references
	// with {pmid: String, cancers: Array }. Then collapse at the cancer type(s)
	// level so we have a list of PMIDs that all map to the same cancer type(s)
	function combineCancers(objects){
		var objToIndex = [],
			combinedCancer = [];

		// First combine at the cancer level
		objects.forEach(function(d){
			d.cancer = d.cancer ? d.cancer.toUpperCase() : "Cancer";
			if (typeof(objToIndex[d.pmid]) == 'undefined'){
				objToIndex[d.pmid] = combinedCancer.length;
				combinedCancer.push( { pmid: d.pmid, cancers: [d.cancer] } );
			} else {
				var index = objToIndex[d.pmid];
				if (combinedCancer[index].cancers.indexOf(d.cancer) === -1)
					combinedCancer[index].cancers.push( d.cancer )
			}
		});

		// Then combine at the PMID level
		var groups = {};
		combinedCancer.forEach(function(d){
			var key = d.cancers.sort().join("");
			if (typeof(groups[key]) === 'undefined') groups[key] = [];
			groups[key].push(d)
		});

		var combined = Object.keys(groups).map(function(k){
			var datum = {pmids: [], cancers: groups[k][0].cancers };
			groups[k].forEach(function(d){ datum.pmids.push(d.pmid); });
			return datum;
		});

		return {refs: combined, count: combinedCancer.length};
	}

	genes.forEach(function(g){
		Object.keys(annotations[g]).forEach(function(ty){
			if (ty == ""){
				annotations[g][ty] = combineCancers(annotations[g][ty]);
			} else {
				Object.keys(annotations[g][ty]).forEach(function(c){
					annotations[g][ty][c] = combineCancers(annotations[g][ty][c]);
				});
			}
		});
	});

	return annotations;

}
