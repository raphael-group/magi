// Routes for enrichment statistics
// Load models
var mongoose = require( 'mongoose' ),
	Datasets = require( "../model/datasets" ),
	Database = require('../model/db'),
	fs = require('fs'),
	request = require('request');

// Compute enrichment given a JSON object. Expected to be called from AJAX
// as it returns a JSON object.
exports.stats = function stats(req, res){
	console.log('/enrichments/stats');

	// Parse the given data
	var pathToScript = 'stats/computeEnrichments.py'
	var args = new Array('-r', JSON.stringify(req.body));

	// Spawn the child process to compute the enrichments. The only output
	// to stdout is a JSON dump of the response
	var error = null,
		finished = false,
		stderr = '',
		stdout = '',
		stdout_list = [];

	var enrichments = require('child_process').spawn(pathToScript, args)
		.on('exit', function(code, signal){
			// If successful, parse the stdout into a JSON object
			if (code == 0) {
				res.json({data: JSON.parse(stdout), status: "Success!"});
			// Otherwise forward the error
			} else{
				error = 'return code: ' + code + ', signal: ' + signal;
				console.error(error);
				res.send({error: error});
			}
		}).on('error', function(err) {
			error = err;
		});

	enrichments.stdout.on('data', function(data){
		if (Buffer.isBuffer(data)) data = data.toString();
		stdout_list.push(data);
	});
	enrichments.stdout.on('end', function () {
        stdout = stdout_list.join();
    });
	enrichments.stderr.on('data', function(data){
		if (Buffer.isBuffer(data)) data = data.toString();
		stderr += data;
	});
}

exports.index  = function enrichments(req, res){
	console.log('/enrichments');

	// Parse the query parameters
	var genes = req.query.genes.split(","),
		datasetIDs = req.query.datasets.split(",");

	// Render the enrichment page
	var Dataset = Database.magi.model( 'Dataset' ),
		MutGene = Database.magi.model( 'MutGene' ),
		logged_in = req.user,
		user_id = logged_in ? req.user._id + "" : undefined;

	// Load the data from the datasets and mutated genes that we need
	// for the enrichments page
	Dataset.find({_id: {$in: datasetIDs}}, {summary: 0, data_matrix_samples: 0, data_matrix_name: 0}, function(err, datasets){
		if (err) console.error(err);

		// Verify permissions
		var permissions = datasets.map(function(d){
			return d.is_public || (logged_in && (d.user_id + "" == req.user._id));
		})

		if (!permissions.every(function(d){ return d; })){
			req.session.msg401 = "You do not have access to all the datasets in your query.";
			res.redirect("401");
		}

		// Create a merged sample annotations object
		var samples = [];
		datasets.forEach(function(d){
			samples = samples.concat(d.samples);
		});
		sampleAnnotations = Datasets.createSampleAnnotationObject(datasets, samples.map(function(d){ return {name: d}; }));

		// Load the genes' mutations
		MutGene.find({ gene: {$in: genes}, dataset_id: {$in: datasetIDs}}, {mutated_samples: 1, gene: 1}, function(err, mutatedGenes){
			if (err) console.error(err);

			// Create a map from samples to their mutated samples
			var geneToMutatedSamples = {};
			mutatedGenes.forEach(function(d){
				if (!(d.gene in geneToMutatedSamples)) geneToMutatedSamples[d.gene] = {};
				Object.keys(d.mutated_samples).forEach(function(s){
					geneToMutatedSamples[d.gene][s] = true;
				});
			});

			// Render the view
			var pkg = {
				genes: genes,
				geneToMutatedSamples: geneToMutatedSamples,
				datasets: datasets,
				samples: samples,
				sampleAnnotations: sampleAnnotations,
				user: req.user
			};

			res.render('enrichments', pkg);
		});
	});
}
