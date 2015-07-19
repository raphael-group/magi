// Routes for the view
// Load models
var mongoose = require( 'mongoose' ),
Database = require('../model/db'),
Samples = require('../model/samples'),
Annotations = require('../model/annotations'),
Cancers = require('../model/cancers'),
Datasets = require('../model/datasets'),
SQLannotations = require('../model/annotations_sql.js'),
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
		    SQLannotations.geneFind(SQLannotations.inGeneClause('gene', mutGenes),
					    'right', function(err, results) {
						if (err) {
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

					// this is where we get the user-given annotations				    	 
					SQLmutations.forEach(function(m) {
//					    m['geneReferences'] = 
					    if (!!m.protein_seq_change && m.protein_seq_change != 'undefined') {
						
					    } else if (!!m.mut_type && m.mut_type != 'undefined') {
					    }
					}

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
					res.render('sampleView', {sample: sample, 
								  annotations: sampleAnnotations, 
								  user: req.user,
								  dataset: dataset,
								  cancer: cancer, 
								  mutations: mutations });
				    			    )
					    });
				    });
			});
		})
	});
    if (fail){ res.redirect('/401'); }
}