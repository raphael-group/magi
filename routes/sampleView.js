// Routes for the view
// Load models
var mongoose = require( 'mongoose' ),
	Database = require('../model/db'),
	Samples = require('../model/samples'),
	Annotations = require('../model/annotations'),
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

				var Annotation = Database.magi.model( 'Annotation' );
				Annotation.find({gene: {$in: mutGenes}}, function(err, support){
					if (err){
						console.error(err);
						fail = true;
						return;
					}
					annotations = Annotations.geneTable(mutGenes, support);

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

				    // call for additional mutations
				    SQLannotations.geneFind(SQLannotations.inGeneClause('gene', ['PTEN'] /*mutGenes*/ ),'right', function(err, userAnnos) {
					if (err) {
					    console.error(err);
					    fail = true;
					    return;
					}

					addIfMatching = function(mutationArray, protoAnno, ref, annoType, refKeys) {
					    for(i = 0; i < mutationArray.length; i++) {
						match = true;
						Object.keys(ref).foreach(function (key) {
						    if(protoAnno[key] != mutationArray[i][key]) {
							match = false;
						    }
						});

						if (match) {
						    console.log("match found!")
						    for(j = 0; j < refKeys.length; j++) {
							mutationArray[i][refKeys].refs.push(ref);
							mutationArray[i][refKeys].count += 1;
						    }
						}
					    }
/*
					    newMutation = protoAnno;
					    newMutation['annotationType'] = annoType;
					    for(j = 0; j < refKeys.length; j++) {
						newMutation[refKeys[j]] = {refs: ref};
					    }
					    mutationArray.push(newMutation);
*/					    return
					}

					for(var h = 0; h < userAnnos.length; h++) {
					    userAnno = userAnnos[h];
					    ref = {
						pmid: userAnno.reference,
						cancers: userAnno.cancer
					    };

					    redoneAnno = {gene: userAnno.gene}
					    addIfMatching(geneMutations, redoneAnno, ref,
						       'gene', ['geneReferences'])

					    // look for a subtype in geneMutations
					    if (userAnno.mutation_type) {
						redoneAnno["type"] = userAnno.mut_type;
						addIfMatching(typeMutations, redoneAnno, ref,
							   'type', ['geneReferences', 'typeReferences'])

						if (userAnno.protein_seq_change) { // (userAnno.protein_seq_change)
						    redoneAnno["change"] = userAnnos.protein_seq_change;
						    addIfMatching(locusMutations, redoneAnno, ref,
							       'locus', ['geneReferences', 'typeReferences', 'locusReferences'])
						}
					    }
					}

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

					res.render('sampleView', {
						sample: sample,
						annotations: sampleAnnotations,
						user: req.user,
						dataset: dataset,
						cancer: cancer,
						mutations: mutations,
						show_requery: true
					});
				    });
				});
			});
		})
	});
    if (fail){ res.redirect('/401'); }
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

