// Load models
var mongoose = require( 'mongoose' ),
	Dataset  = require( "../model/datasets" ),
	PPIs     = require( "../model/ppis" ),
	Domains  = require( "../model/domains" );

// List of inactivating mutation types
var inactiveTys = ["frame_shift_ins", "nonstop_mutation", "nonsense_mutation",
				   "splice_site", "frame_shift_del"];

// Determine if a set of mutations includes at least one inactivating SNV
function includes_inactivating(mut_tys){
	for (var i = 0; i < mut_tys.length; i++){
		if (inactiveTys.indexOf(mut_tys[i].toLowerCase()) != -1)
			return true;
	}
	return false;
}

exports.viewData = function getViewData(req, res){
	// Parse query params
	var genes = req.query.genes.split("-"),
		dataset_ids = req.query.datasets.split("-");

	// Load and format SNVs then PPIs
	// Then return JSON object.
	Dataset.datasetlist(dataset_ids, function(err, datasets){
		// compute the number of samples across each dataset
		var num_samples = datasets.reduce(function(total, dataset){
			return total + dataset.samples.length;
		}, 0);

		// Create a map of dataset names to IDs
		var datasetNames = {};
		datasets.forEach(function(d){ datasetNames[d._id] = d.title; });

		Dataset.mutGenesList(genes, dataset_ids, function(err, mutGenes){
			// Create a list of all the transcripts in the mutated genes
			var transcripts = [];
			mutGenes.forEach(function(G){
				for (var t in G.snvs) transcripts.push( t );
			});

			// Load all the transcripts' domains
			Domains.domainlist(transcripts, function(err, domains){
				// Create a map of transcripts to domains
				var transcript2domains = {};
				domains.forEach(function(d){
					transcript2domains[d.transcript] = d.domains;
				});

				// Create empty Objects to store transcript/oncoprint data
				var M = {},
					transcript_data = {}
					sample2ty = {};

				// Initialize with genes as keys (in case genes aren't in the data)
				for (var i in genes){
					transcript_data[genes[i]] = {};
					M[genes[i]] = {};
				}

				// Iterate through each dataset
				for (var i = 0; i < mutGenes.length; i++){
					// Parse dataset values into short variable handles
					var G = mutGenes[i];

					// Load the mutated samples
					G.mutated_samples.forEach(function(s){
						// Determine if the SNVs are inactivating
						if (includes_inactivating(s.mut_tys))
							M[G.gene][s.sample] = ['inactive_snv'];
						else
							M[G.gene][s.sample] = ['snv'];

						// Record the sample's dataset
						sample2ty[s.sample] = datasetNames[G.dataset_id];
					});

					for (t in G.snvs){
						// Add transcript if it's not present
						if (!(t in transcript_data[G.gene])){
							transcript_data[G.gene][t] = { mutations: [] };
							transcript_data[G.gene][t].length = G.snvs[t].length;
							transcript_data[G.gene][t].domains = transcript2domains[t] || {};	
						}
						var trsData = transcript_data[G.gene][t]; // transcript data
						
						// Concatenate the mutations
						var updatedMutations = trsData.mutations.concat(G.snvs[t].mutations);
						trsData.mutations = updatedMutations;
					}
				}
				
				// Compute coverage of gene set
				var num_mutated_samples = Object.keys(sample2ty).length
				, coverage       = (num_mutated_samples * 100. / num_samples).toFixed(2)
				, coverage_str   = coverage + "% (" + num_mutated_samples + '/' + num_samples + ")"

				// Assemble data into single Object
				var oncoprint_data = {M : M, sample2ty: sample2ty, coverage_str: coverage_str};

				// Create nodes using the number of mutations in each gene
				var nodes = genes.map(function(g){
					var mutSamples = Object.keys( M[g] );
					return { name: g, heat: mutSamples.length };
				});


				PPIs.ppilist(genes, function(err, ppis){
					PPIs.formatPPIs(ppis, function(err, edges){
						// Package data into one object
						var subnetwork_data = { edges: edges, nodes: nodes };
						var pkg = 	{
										subnetwork_data: subnetwork_data,
										oncoprint_data: oncoprint_data,
										transcript_data: transcript_data
									};
						
						// Send JSON response
						res.json( pkg );

					});
				});
			});
		});
	});
}