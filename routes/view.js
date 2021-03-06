// Routes for the view
// Load models
var mongoose = require( 'mongoose' ),
	Dataset  = require( "../model/datasets" ),
	Transcripts  = require( "../model/transcripts" ),
	Aberrations = require("../model/aberrations"),
	PPIs = require("../model/ppis"),
	QueryHash = require('../model/queryHash'),
	Database = require('../model/db'),
	Cancers  = require( "../model/cancers" ),
	Utils = require('../model/util'),
	saveQuery = require('./index').saveQuery,
	fs = require('fs');

exports.view  = function view(req, res){
	// Parse query params
	if(req.params.id) {
		var QueryHash = Database.magi.model('QueryHash'),
				searchTerm = {queryHash: req.params.id};

		QueryHash.find(searchTerm, function(err, entries) {
			if(entries.length == 0) {
				req.session.msg401 = "Fatal error: bad query.";
				res.redirect("401");
		    } else {
		    	var query = entries[0].query;
	      		if (query == undefined) {
					req.session.msg401 = "Fatal error: bad query.";
					res.redirect("401");
	      		} else { // parse the query and extract the gene names and datasets
	      			function getParameterByName(str,name) {
	      				var match = RegExp('[?&]' + name + '=([^&]*)').exec(str);
	      				return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
					}
					var genes = getParameterByName(query,"genes").split(','),
						dataset_ids = getParameterByName(query,"datasets").split(',');
					completeViewData(genes, dataset_ids);
	      }
	    }
	  });
	} else {
		var genes = req.query.genes.split(","),
			dataset_ids = req.query.datasets.split(",");

		if (req.user){
			saveQuery(req.user, dataset_ids.map(function(d){ return 'db-' + d; }), genes, function(err){
				if (err) console.err(err)
				completeViewData(genes, dataset_ids);
			});
		} else{
			completeViewData(genes, dataset_ids);
		}
	}

	function completeViewData(genes, dataset_ids) {
		// Force the user ID to be a string to make finding it in arrays easy
		var logged_in = req.user,
			user_id = logged_in ? req.user._id + "" : undefined;

		// Load and format SNVs then PPIs
		// Then return JSON object.
		Dataset.datasetlist(dataset_ids, function(err, datasets){
			// Validate that the user can view ALL the datasets in the query
			var permissions = datasets.map(function(d){
				return d.is_public || (logged_in && (d.user_id + "" == req.user._id));
			});

			if (!permissions.every(function(b){ return b; })){
				req.session.msg401 = "You do not have access to all the datasets in your query.";
				res.redirect("401");
			}

			// compute the number of samples across each dataset
			var num_samples = datasets.reduce(function(total, dataset){
				return total + dataset.samples.length;
			}, 0);

			// Create a map of dataset names to IDs
			var datasetNames = {};
			datasets.forEach(function(d){ datasetNames[d._id] = d.title; });

			// Create a map of dataset ids to their z_index (in the case of duplicate samples)
			var datasetIDToPrecedence = {};
			datasets.sort(function(a, b){ return a.is_public ? 1 : a.updated_at > b.updated_at ? -1 : 1 });
			for (var i = 0; i < datasets.length; i++){
				datasetIDToPrecedence[datasets[i]._id] = i;
			}

			// Create a map of each dataset to its color
			var datasetColors = {};
			datasets.forEach(function(d){ if (d.color) datasetColors[d.title] = d.color });

			// Create a map of each type to the number of mutated samples
			var typeToSamples = {};
			datasets.forEach(function(d){ typeToSamples[d.title] = d.samples; });

			Dataset.mutGenesList(genes, dataset_ids, function(err, mutGenes){
				// Create a list of all the transcripts in the mutated genes
				var transcripts = [];
				mutGenes.forEach(function(G){
					for (var t in G.snvs) transcripts.push( t );
				});

				// Load all the transcripts' domains
				Transcripts.find(transcripts, function(err, transcripts){
					// Create a map of transcripts to domains, and record
					// all the domain DBs included for these gene sets
					var domainDBs = {},
						transcriptToDomains = {},
						transcriptToSequence = {},
						transcriptToSequenceAnnos = {};

					transcripts.forEach(function(t){
						transcriptToDomains[t.name] = t.domains;
						transcriptToSequence[t.name] = t.sequence;
						transcriptToSequenceAnnos[t.name] = t.annotations;
						Object.keys(t.domains).forEach(function(n){
							domainDBs[n] = true;
						});
					});

					// Create empty Objects to store transcript/mutation matrix data
					var M = {},
						transcript_data = {proteinDomainDB: 'PFAM'}
						sampleToTypes = {},
						// CNA samples don't need IDs like the mutation matrix
						cnaSampleToTypes = {},
						cna_browser_data = {},
						// make a list of mutated samples with their unique IDs
						seenSample = {},
						samples = [];

					// Initialize with genes as keys (in case genes aren't in the data)
					for (var i in genes){
						transcript_data[genes[i]] = {};
						M[genes[i]] = {};
					}

					// Iterate through each dataset
					for (var i = 0; i < mutGenes.length; i++){
						// Parse dataset values into short variable handles
						var G = mutGenes[i],
							z_index = datasetIDToPrecedence[G.dataset_id];

						// Record the CNAs
						if (G.cnas){
							if (!(G.gene in cna_browser_data)){
								cna_browser_data[G.gene] = {
									gene: G.gene,
									neighbors: G.cnas.neighbors,
									region: G.cnas.region,
									segments: []
								};
							}
							console.log(G.cnas)
							cna_browser_data[G.gene].segments = cna_browser_data[G.gene].segments.concat( G.cnas.segments );

							// Update the segment extent and neighbors to include any neighbors outside of the
							// previous boundaries
							console.log(G.gene, G.cnas.region)
							var minSegX = G.cnas.region.minSegX,
								maxSegX = G.cnas.region.maxSegX;
							if (maxSegX > cna_browser_data[G.gene].region.maxSegX){
								cna_browser_data[G.gene].neighbors = cna_browser_data[G.gene].neighbors.concat(
									G.cnas.neighbors.filter(function(g){ return g.end > cna_browser_data[G.gene].region.maxSegX; })
								);
								cna_browser_data[G.gene].region.maxSegX = maxSegX;
							}
							if (minSegX < cna_browser_data[G.gene].region.minSegX){
								cna_browser_data[G.gene].neighbors = cna_browser_data[G.gene].neighbors.concat(
									G.cnas.neighbors.filter(function(g){ return g.start < cna_browser_data[G.gene].region.minSegX; })
								);
								cna_browser_data[G.gene].region.minSegX = minSegX;
							}
						}

						// Load the mutated samples
						for (var s in G.mutated_samples){
							var _id = G.dataset_id + "-" + s;
							sampleToTypes[_id] = datasetNames[G.dataset_id];
							cnaSampleToTypes[s] = datasetNames[G.dataset_id];
							M[G.gene][_id] = G.mutated_samples[s];
							if (!(_id in seenSample)){
								samples.push( {_id: _id, name: s, z_index: z_index } );
								seenSample[_id] = true;
							}
						}

						for (t in G.snvs){
							// Add transcript if it's not present
							if (!(t in transcript_data[G.gene])){
								transcript_data[G.gene][t] = { mutations: [], gene: G.gene };
								transcript_data[G.gene][t].length = G.snvs[t].length;
								transcript_data[G.gene][t].domains = transcriptToDomains[t] || {};
								transcript_data[G.gene][t].protein_sequence = transcriptToSequence[t];
								transcript_data[G.gene][t].sequence_annotations = transcriptToSequenceAnnos[t];
							}
							var trsData = transcript_data[G.gene][t]; // transcript data

							// Concatenate the mutations
							var updatedMutations = trsData.mutations.concat(G.snvs[t].mutations);
							trsData.mutations = updatedMutations;
						}
					}

					// If no genes were provided, just add all the samples in the case
					// that there are sample annotations
					if (genes.length == 0 || (genes.length === 1 && genes[0] === "")){
						datasets.forEach(function(d){
							d.samples.forEach(function(s){
								var _id = s;
								sampleToTypes[_id] = datasetNames[d.dataset_id];
								sampleToTypes[s] = d.title;
								samples.push( {_id: _id, name: s, z_index: 1 } );
							})
						});
					}

					var Genome  = require( "../model/genome" ),
						missingCNAData = genes.filter(function(g){ return !(g in cna_browser_data); });
					Genome.addCNARegionData(missingCNAData, function(err, missingRegions){
						if (err) throw new Error(err);

						missingCNAData.forEach(function(g){
							cna_browser_data[g] = missingRegions[g];
						});

						// Load the annotations for each gene
					    Aberrations.geneFindFromList(genes, function(err, support) {
						// Throw error if necessary
						if (err) throw new Error(err);

						// Assemble the annotations
						var annotations = {},
								geneToAnnotationList = {},
								geneToAnnotationCount = {};

						genes.forEach(function(g){
							annotations[g] = {};
							geneToAnnotationCount[g] = 0;
							geneToAnnotationList[g] = {};
						})
						support.rows.forEach(function(A, i){

							var ref = {
								pmid: A.identifier,
								_id: A.reference_id
							};
							geneToAnnotationList[A.gene_id][A.identifier] = true;

							if (!annotations[A.gene_id][A.mutation_class]) {
								annotations[A.gene_id][A.mutation_class] = {};
							}
							if (!annotations[A.gene_id][A.mutation_class][A.cancer_name]) {
								annotations[A.gene_id][A.mutation_class][A.cancer_name] = [];
							}
							annotations[A.gene_id][A.mutation_class][A.cancer_name].push(ref);
							geneToAnnotationCount[A.gene_id] += 1;
						});

						// Assemble data into single Object
						var mutation_matrix = {
						    M : M,
						    sampleToTypes: sampleToTypes,
						    sampleTypes: Object.keys(typeToSamples),
						    typeToSamples: typeToSamples,
						    samples: samples
						};

							// Sort genes by coverage
							genes = genes.sort(function(a, b){
								return Object.keys(M[a]).length > Object.keys(M[b]).length ? -1 : 1;
							});

							// Create nodes using the number of mutations in each gene
							var nodes = genes.map(function(g){
								var mutSamples = Object.keys( M[g] );
								return { name: g, value: mutSamples.length };
							});

							// Add sampleToTypes to each cna_browser gene
							mutGenes.forEach(function(g){
								if (g.cnas){
									cna_browser_data[g.gene].sampleToTypes = cnaSampleToTypes;
								}
							});

							// Heatmap is restricted to only mutated samples, which is why we pass that in
							Dataset.createHeatmap(genes, datasets, samples, function(err, heatmap){
								if (err) throw new Error(err);
								var sampleAnnotations = Dataset.createSampleAnnotationObject(datasets, mutation_matrix.samples);

							    PPIs.ppilist(genes, function(err, ppis) {
								PPIs.ppicomments(ppis, user_id, function(err, comments){
								    formatPPIs(ppis, user_id, function(err, edges, refs){
									var Cancer = Database.magi.model( 'Cancer' );
									Cancer.find({}, function(err, cancers){
									    if (err) throw new Error(err);

									    // Create a mapping of dataset titles to cancer names
									    var cancerIdToName = {},
									    abbrToCancer = {},
									    datasetToCancer = {};
									    cancers.forEach(function(c){
										cancerIdToName[c._id] = c.cancer;
										if (c.abbr) abbrToCancer[c.abbr] = c.cancer;
									    });
									    datasets.forEach(function(d){
										datasetToCancer[d.title] = cancerIdToName[d.cancer_id];
									    });

									    // Package data into one object
									    var network_data = {
										edges: edges,
										nodes: nodes,
										refs: refs,
										comments: comments,
										title: "Mutations"
									    };
									    var pkg = {
												datasets: datasets.sort(function(a, b){ return a.title > b.title ? 1 : -1; }),
										abbrToCancer: abbrToCancer,
										datasetToCancer: datasetToCancer,
										network: network_data,
										aberrations: mutation_matrix,
										transcripts: transcript_data,
										domainDBs: Object.keys(domainDBs),
										cnas: cna_browser_data,
										datasetColors: datasetColors,
										annotations: annotations,
										genes: genes,
										dataset_ids: dataset_ids,
										heatmap: heatmap,
										sampleAnnotations: sampleAnnotations,
										geneToAnnotationCount: geneToAnnotationCount
									    };
									    // Render view
									    res.render('view', {data: pkg, showDuplicates: req.query.showDuplicates || false, user: req.user });
									});
								    });
								});
							    });
							});
					    });
					});
				});
			});
		});
	}
}

function formatPPIs(ppis, user_id, callback){
	var edgeNames = {};
	for (var i = 0; i < ppis.length; i++){
		// Parse interaction and create unique ID
		var ppi   = ppis[i],
			ppiName = [ppi.source_id, ppi.target_id].sort().join("*");
	    refInfo = {
			pmid: ppi.identifier,
			upvotes: ppi.upvotes,
			downvotes: ppi.downvotes,
			_id: ppi.id
	    }
		// Append the current network for the given edge
		if (ppiName in edgeNames){
			edgeNames[ppiName].push( {name: ppi.input_source, refs: refInfo } );
		}
		else{
		    edgeNames[ppiName] = [ {id: ppi.id, name: ppi.input_source, refs: refInfo } ];
		}
	}

	// Create edges array by splitting edgeNames
	var edges = [],
		refs = {};
	for (var edgeName in edgeNames){
		var  arr   = edgeName.split("*"),
			source   = arr[0],
			target   = arr[1],
	    networks = edgeNames[edgeName].map(function(d){ return d.name; });
//	    anno_id = edgeNames[edgeName].id;

		// Create a map of each network to its references
		var references = {};
		networks.forEach(function(n){ references[n] = []; });
		edgeNames[edgeName].forEach(function(d){
		    if (d.refs.pmid && d.refs.pmid != '' ) {
			references[d.name] = references[d.name].concat( d.refs );
		    }
		});

		// Update the map of each network's edge's references to
		// its votes and whether or not it was voted for by the current user
		networks.forEach(function(n){
			// Initialize the hashes for each component of this edge (if necessary)
			if (!(n in refs)) refs[n] = {};
			if (!(source in refs[n])) refs[n][source] = {};
			if (!(target in refs[n][source])) refs[n][source][target] = {};

			references[n].forEach(function(ref){
				// Record the score
				var score = ref.upvotes.length - ref.downvotes.length;
				refs[n][source][target][ref.pmid] = {
				    vote: null,
				    score: score
				};
				//  Record the user's vote for the current reference (if neccessary)
				if (user_id && ref.upvotes.indexOf(user_id) != -1){
					refs[n][source][target][ref.pmid].vote = "up";
				}
				else if (user_id && ref.downvotes.indexOf(user_id) != -1){
					refs[n][source][target][ref.pmid].vote = "down";
				}
			});
		});

		edges.push({ source: source, target: target, weight: 1, categories: networks, references: references });
	}

	// Execute callback
	callback("", edges, refs);

}
