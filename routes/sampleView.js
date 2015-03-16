// Routes for the view
// Load models
var mongoose = require( 'mongoose' ),
	Database = require('../model/db'),
	Samples = require('../model/samples'),
	Annotations = require('../model/annotations'),
	Cancers = require('../model/cancers'),
	Datasets = require('../model/datasets'),
	fs = require('fs');

exports.sampleView = function sampleView(req, res){
	console.log('/sample-view');
	var sample = req.query.sample,
		fail = false,
		Sample = Database.magi.model( 'Sample' ),
		Dataset = Database.magi.model( 'Dataset' ),
		Cancer = Database.magi.model( 'Cancer' ),
		Annotation = Database.magi.model( 'Annotation' );

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

				Annotation.find({gene: {$in: mutGenes}}, function(err, support){
					if (err){
						console.error(err);
						fail = true;
						return;
					}

					// Assemble the annotations into a dictionary index by 
					// gene (e.g. TP53) and mutation class (e.g. missense or amp)
					// and then protein change (only applicable for missense/nonsense)
					// 1) Store the total number of references for the gene/class in "",
					//    i.e. annotations['TP53'][''] gives the total for TP53 and 
					//    annotations['TP53']['snv'][''] gives the total for TP53 SNVs.
					// 2) Count the number per protein change.
					var annotations = {};

					mutGenes.forEach(function(g){ annotations[g] = { "": [] }; });

					support.forEach(function(A){
						if (typeof(annotations[A.gene][A.mutation_class]) == 'undefined'){
							annotations[A.gene][A.mutation_class] = {"" : [] };
						}
						if (A.mutation_class == "missense" || A.mutation_class == "nonsense"){
							if (A.change){
								if (typeof(annotations[A.gene][A.mutation_class][A.change]) == 'undefined'){
									annotations[A.gene][A.mutation_class][A.change] = [];
								}

								A.references.forEach(function(ref){
									annotations[A.gene][A.mutation_class][A.change].push({ pmid: ref.pmid, cancer: A.cancer });
								});
							}
						}
						A.references.forEach(function(ref){
							annotations[A.gene][A.mutation_class][""].push({ pmid: ref.pmid, cancer: A.cancer });
							annotations[A.gene][""].push({ pmid: ref.pmid, cancer: A.cancer });
						});
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
							d.cancer = d.cancer.toUpperCase();
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

					mutGenes.forEach(function(g){
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

					// Create a list of mutations including the annotations, separating
					// them into three groups: locus (most important), type (second most
					// important), and gene (least important)
					var locusMutations = [],
						typeMutations = [],
						geneMutations = [];

					sample.mutations.forEach(function(d){
						var g = d.name;
						d.mutations.forEach(function(m){
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
					res.render('sampleView', {sample: sample, annotations: sampleAnnotations, user: req.user, dataset: dataset, cancer: cancer, mutations: mutations });

				});
			});
		})
	});
	if (fail){ res.redirect('/401'); }
}