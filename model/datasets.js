// Import required modules
var mongoose = require( 'mongoose' ),
	Genome  = require( "./genome" ),
	Cancers  = require( "./cancers" ),
	GeneSets  = require( "./genesets" );

// Create schemas to hold the SNVs
var MutGeneSchema = new mongoose.Schema({
	gene: {type: String, required: true},
	dataset_id: { type: mongoose.Schema.Types.ObjectId, required: true},
	mutated_samples: { type: {}, required: true, default: []},
	snvs: { type: {}, required: false},
	cnas: { type: {}, required: false},
	updated_at: { type: Date, default: Date.now, required: true },
});

// Create schemas to hold the entire database
var DatasetSchema = new mongoose.Schema({
	title: { type: String, required: true },
	samples: { type: [String], required: true },
	group: { type: String, required: false},
	summary: { type: {}, required: true },
	updated_at: { type: Date, default: Date.now, required: true },
	created_at: { type: Date, default: Date.now, required: true },
	user_id: { type: mongoose.Schema.Types.ObjectId, default: null},
	is_standard: { type: Boolean, default: false, required: true },
	color: { type: String, required: true }
});

mongoose.model( 'Dataset', DatasetSchema );
mongoose.model( 'MutGene', MutGeneSchema );

// List the datasets by group
exports.datasetGroups = function datasetgroups(query, callback){
	var Dataset = mongoose.model( 'Dataset' );

	Dataset.aggregate(
		{ $match: query },
		{$group: {_id: '$group', dbs: { $push: {title: '$title', color: '$color', _id: '$_id', samples: '$samples', updated_at: '$updated_at'} } }},
		{$sort: {_id: -1}}, // sort descending by group name
		function(err, res){
			// Handle error (if necessary)
			if (err) throw new Error(err);

			// Parse result into groups
			var groups = [];
			for (var i = 0; i < res.length; i++){
				var dbs = res[i].dbs.sort(function(db1, db2){ return db1.title > db2.title; });
				dbs.forEach(function(db){ db.num_samples = db.samples.length; db.samples = null; })
				groups.push( {name: res[i]._id, dbs: dbs } );
			}

			// Execute callback
			callback(err, groups);
		}
	)
}

exports.datasetlist = function datasetlist(dataset_ids, callback){
	var Dataset = mongoose.model( 'Dataset' );
	Dataset.find({_id: {$in: dataset_ids}}, callback);
}

exports.removeDataset = function removeDataset(query, callback){
	// Load the modules
	var Dataset = mongoose.model( 'Dataset' ),
		MutGene = mongoose.model( 'MutGene' );

	// Remove the dataset, then remove all mutgenes from that dataset
	Dataset.remove(query, function(err){
		// Throw an error if it occurred
		if (err) throw new Error(err);

		// Otherwise, remove all mutgenes with 
		MutGene.remove({dataset_id: query.dataset_id}, function(err){
			// Throw an error if it occurred
			if (err) throw new Error(err);

			// Otherwise call the callback
			callback("");
		});
	});
}

// A function for listing all the SNVs for a set of genes
exports.mutGenesList = function snvlist(genes, dataset_ids, callback){
	var MutGene = mongoose.model( 'MutGene' ),
		query = { gene: {$in: genes}, dataset_id: {$in: dataset_ids} };

	MutGene.find(query, function(err, mutGenes){
 		if(err) console.log(err);
 		else callback("", mutGenes);
	});// end MutGene.find

}// end exports.mutGenesList

// List of inactivating mutation types
var inactiveTys = ["frame_shift_ins", "nonstop_mutation", "nonsense_mutation",
				   "splice_site", "frame_shift_del"];

// Loads a SNVs into the database
exports.addDatasetFromFile = function(dataset, group_name, samples_file, snvs_file, cnas_file,
									  aberration_file, is_standard, color, user_id){
	// Load required modules
	var fs      = require( 'fs' ),
		Dataset = mongoose.model( 'Dataset' ),
		MutGene = mongoose.model( 'MutGene' ),
		Cancer = mongoose.model( 'Cancer' ),
		domain  = require( "./domains" ),
		Q       = require( 'q' );

	// Make sure that either/both an SNV and CNA file were provided
	if (!(snvs_file || cnas_file || aberration_file)){
		console.log("addDatasetFromFile: at least one of the SNV, CNA, or aberration files are *required*.")
		process.exit(1);
	}

	// Load the cancer types, their abbreviations, and their colors
	var datasetToColor = {};
	function loadCancers(){
		var d = Q.defer();
		Cancer.find({}, function(err, cancers){
			if (err) throw new Error(err);
			cancers.forEach(function(c){ datasetToColor[c.abbr] = c.color; });
			d.resolve();
		});

		return d.promise;
	}

	// Data structures to hold info about each sample and dataset
	var datasets = [],
		givenSampleList = true,
		sampleToDataset = {},
		datasetToSamples = {};

	// Read in the sample file asynchronously
	function loadSampleFile(){
		// Set up promise
		var d = Q.defer();

		// Return if no sample file was provided
		if (!samples_file){
			givenSampleList = false;

			// Set the color to the given color if provided
			if (color){
				datasetToColor[dataset] = color;
			}
			// Otherwise use the default color for this cancer type
			else if (dataset.toLowerCase() in datasetToColor){
				datasetToColor[dataset] = datasetToColor[dataset.toLowerCase()];
			}
			// If neither work, assign a random color
			else{
				datasetToColor[dataset] = '#' + Math.floor(Math.random()*16777215).toString(16);
			}

			// Exit if a dataset wasn't provided since we need some sort of name
			if (!dataset){
				console.log("Dataset is required without sample list.")
				process.exit(1);
			}

			datasets = [ dataset ];

			d.resolve();
			return d.promise;
		}

		fs.readFile(samples_file, 'utf-8', function (err, data) {
			// Exit if there's an error
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			lines = data.trim().split('\n');
			var sampleNames = {};

			lines.forEach(function(s){
				var arr = s.split("\t");
				if (arr.length > 1){
					sampleToDataset[arr[0]] = arr[1];
					if (!(arr[1] in datasetToSamples)) datasetToSamples[arr[1]] = [];
					datasetToSamples[arr[1]].push( arr[0] );
				}
				sampleNames[arr[0]] = true;
			});

			// Extract the names of all the datasets
			datasets = Object.keys(datasetToSamples);

			// Make sure all samples have a name
			if (datasets.length == 0){
				if (dataset){
					datasets = [dataset];
					datasetToSamples[dataset] = [];
					Object.keys(sampleNames).forEach(function(s){
						sampleToDataset[s] = dataset;
						datasetToSamples[dataset].push( s );
					});
					if (color) datasetToColor[dataset] = color;
				}
				else if (datasets.length > 1){
					console.log("If sample datasets aren't provided, you must name your dataset.");
					process.exit(1);
				}
			}
			else if (datasets.length == 1 && color){
				datasetToColor[datasets[0].toLowerCase()] = color;
			}

			// Assign random colors to datasets without them
			datasets.forEach(function(db){
				if (!(db in datasetToColor)){
					if (!(db.toLowerCase() in datasetToColor)){
						datasetToColor[db] = '#' + Math.floor(Math.random()*16777215).toString(16);
					}
					else{
						datasetToColor[db] = datasetToColor[db.toLowerCase()];
					}
				}
			});

			// Resolve the promise
			d.resolve();

		});

		return d.promise;
	}

	function loadDataset(datasetName, samples, cnaLines, snvLines, aberrationLines){

		// Define globals to store the mutations
		var snvs = {},
			cnas = {},
			mutGenes = {},
			mutSamples = {},
			summary = {},
			mutationTypes = [];

		function recordMutation(gene, sample, mutClass){
			// Make sure the gene is initialized in both data structures
			if (!(gene in mutSamples)) mutSamples[gene] = {};
			if (!(gene in mutGenes))
				mutGenes[gene] = { snvs: {}, cnas: {}, inactivating: {}, mutated_samples: {}, fus: {}, amp: {}, del: {} };

			// Add the sample and the mutation class to the mutSamples data structure
			if (sample in mutSamples[gene] && mutSamples[gene][sample].indexOf(mutClass) == -1){
				mutSamples[gene][sample].push( mutClass );
			}
			else{
				mutSamples[gene][sample] = [ mutClass ];
			}

			// Record the gene as being mutated in the given sample
			mutGenes[gene].mutated_samples[sample] = true;		
		}

		function loadAberrations(){
			aberrationLines.forEach(function(l){
				// Extract the fields
				var fields = l.split('\t'),
					sample   = fields[0],
					mutations = fields.slice(1, fields.length);

				// Record the mutations
				var mutClass = "other";
				mutations.forEach(function(gene){
					recordMutation(gene, sample, mutClass);
				});
			});
		}

		function loadCNAs(){
			// Set up promise
			var d = Q.defer();

			// If a CNA file wasn't provided, resolve the promise
			if (cnaLines.length == 0) d.resolve();

			// Parse the mutations into a hash from gene to transcripts' mutations
			cnaLines.forEach(function(l){
				// Extract the fields
				var fields = l.split('\t'),
					gene   = fields[0],
					sample = fields[1],
					cnaTy  = fields[2] == "AMP" ? "amp" : fields[2] == "DEL" ? "del" : "fus",
					start  = fields[3],
					end    = fields[4];

				// Record the CNA if a start/end were provided
				if (start != "" && end != ""){
					var mut = { dataset: sampleToDataset[sample], ty: cnaTy, sample: sample,
					            start: start * 1, end: end * 1 };

					// Append the mutation to the list of mutations in the
					// current gene
					if (!(gene in cnas)) cnas[gene] = {segments: {}};
					if (!(sample in cnas[gene])) cnas[gene].segments[sample] = [];
					cnas[gene].segments[sample].push( mut );
				}

				// Record the mutated sample
				recordMutation(gene, sample, cnaTy);
				mutGenes[gene].cnas[sample] = true;
				mutGenes[gene][cnaTy.toLowerCase()][sample] = true;

			});

			// Load locations of each gene and find their neighbors 
			var Gene = mongoose.model( 'Gene' );
			Gene.find({name: {$in: Object.keys(cnas)}}, function (err, genes){
				if (err) throw new Error(err);
	
				Q.allSettled( genes.map(function(g){
					var d2 = Q.defer();

					// Find the min/max segment locations for the current gene
					var minSegX = Number.MAX_VALUE,
						maxSegX = 0,
						cnaSamples = cnas[g.name].segments,
						segments = [];

					Object.keys(cnaSamples).forEach(function(s){
						var segs = cnaSamples[s];
						segments.push( {sample: s, segments: segs} );
						segs.forEach(function(seg){
							minSegX = Math.min(minSegX, seg.start);
							maxSegX = Math.max(maxSegX, seg.end);
						});
					});

					// Add the gene's region information
					cnas[g.name].region = { chr: g.chr, minSegX: minSegX, maxSegX: maxSegX };
					cnas[g.name].segments = segments;

					// Find the gene's neighbors that are overlap the segments assigned to that gene
					// (with a small boundary on either side)
					var segWidthBoundary = Math.round(0.1 * (maxSegX - minSegX));
					Genome.getGenesinRange(g.chr, minSegX - segWidthBoundary, maxSegX + segWidthBoundary, function (err, neighbors){
						if(err) console.log(err);
						cnas[g.name].neighbors = neighbors;
						d2.resolve();
					});
					return d2.promise;
				})).then(function(){ d.resolve(); });
			});

			return d.promise;
		}


		// Read in the SNVs file asynchronously
		function loadSNVs(){	
			snvLines.forEach(function(l){
				// Extract the fields
				var fields = l.split('\t'),
					gene       = fields[0],
					sample     = fields[1],
					transcript = fields[2],
					length     = fields[3],
					locus      = fields[4],
					mutTy      = fields[5],
					aao        = fields[6],
					aan        = fields[7];

				// Create the mutation
				var mut = { sample: sample, dataset: sampleToDataset[sample], locus: locus,
				            aan: aan, aao: aao, ty: mutTy };
				
				// Append the mutation to the list of mutations in the
				// current gene
				if (mutTy && mutTy != '--'){
					if (!(gene in snvs)) snvs[gene] = {};

					// Only add the transcript mutations if the transcript is defined
					if (transcript && transcript != '--'){
						if (!(transcript in snvs[gene])){
							// Create a new null transcript, including the relevant domains
							var transcript_info = { mutations: [], length: length * 1 };
							snvs[gene][transcript] = transcript_info;				
						}
				
						snvs[gene][transcript].mutations.push( mut );
					}

					// Record the mutation type
					var mutTy = mutTy.toLowerCase(), //lowercase so case doesn't matter
						mutClass = mutTy && inactiveTys.indexOf(  mutTy ) != -1 ? "inactive_snv" : "snv";

					if (mutationTypes.indexOf(mutTy) === -1){
						mutationTypes.push( mutTy );
					}

					// Record the mutated sample
					recordMutation(gene, sample, mutClass);

					if (!(mutTy in mutGenes[gene])) mutGenes[gene][mutTy] = {};

					mutGenes[gene].snvs[sample] = true;
					mutGenes[gene][mutTy][sample] = true;

					if (mutClass == "inactive_snv") mutGenes[gene].inactivating[sample] = true;
				}
			});
		}

		function computeSummary(){
			// Set up promise
			console.log(datasetName + " summary:")
			var promise = Q.defer();
			var num_samples = samples.length,
				num_snvs = 0,
				num_cnas = 0,
				num_mutated_genes,
				most_mutated_genes,
				most_mutated_gene_sets,
				muation_plot_data;

			function numMutatedSamples(sampleToMut){ return sampleToMut ? Object.keys(sampleToMut).length : 0; }
			function isInactivating(mut){ return inactiveTys.indexOf(  mut.ty.toLowerCase() )}
			function dist(x, y){ return x * x + y * y; } // distance from the origin

			// Count the number of mutated genes in the dataset
			var genes = Object.keys(mutGenes);
			num_mutated_genes = genes.length;
			console.log("\tNo. mutated genes:", num_mutated_genes);
			var genes = genes.map(function(g){
				var snvSamples = mutGenes[g] ? numMutatedSamples(mutGenes[g].snvs) : 0,
					cnaSamples = mutGenes[g] ? numMutatedSamples(mutGenes[g].cnas) : 0;
				num_snvs += snvSamples;
				num_cnas += cnaSamples;
				return { name: g, snvs: snvSamples, cnas: cnaSamples };
			});
			console.log("\tNo. SNVs:", num_snvs);
			console.log("\tNo. CNAs:", num_cnas);

			// Extract the 100 most mutated genes
			genes = genes.sort(function(a, b){ return dist(a.snvs, a.cnas) > dist(b.snvs, b.cnas) ? -1 : 1; })
				.slice(0, Math.min(500, genes.length))
				.map(function(g){
					var d = mutGenes[g.name];
					return {
								name: g.name,
								cnas: g.cnas,
								snvs: g.snvs,
								mutated_samples: numMutatedSamples(d.mutated_samples),
								inactivating: numMutatedSamples(d.inactivating)
							}
				});
			most_mutated_genes = genes.slice(0, Math.min(genes.length, 100));

			// Create the data for the mutation plot
			mutation_plot_data = {};
			genes.forEach(function(d){
				mutation_plot_data[d.name] = 	{ 
													cnas: d.cnas,
													snvs: d.snvs,
													mutated_samples: d.mutated_samples,
													inactivating: d.inactivating
												};
				mutationTypes.forEach(function(ty){
					mutation_plot_data[d.name][ty] = numMutatedSamples(mutGenes[d.name][ty]);
				});
			});

			// Find the most mutated pathways/complexes
			function numMutations(geneset, ty){
				var mutatedSamples = {};
				for (var i = 0; i < geneset.length; i++){
					if (mutGenes[geneset[i]]){
						for (var s in mutGenes[geneset[i]][ty]){
							mutatedSamples[s] = true;
						}
					}
				}
				return numMutatedSamples(mutatedSamples);
			}

			var GeneSet = mongoose.model( 'GeneSet' );
			GeneSet.find({}, function(err, genesets){
				// Throw err if necessary
				if (err) throw new Error(err);

				// Sort the genesets by the number of their mutations, and report the first twenty
				var genesets = genesets.map(function(S){
					var d = {
						name: S.description,
						database: S.database,
						num_genes: S.genes.length,
						mutated_samples: numMutations(S.genes, "mutated_samples"),
						cnas: numMutations(S.genes, "cnas"),
						snvs: numMutations(S.genes, "snvs"),
						inactivating: numMutations(S.genes, "inactivating"),
					};
					
					// Find the top 5 most mutated genes
					var mutatedGenes = S.genes.filter(function(g){
						return mutGenes[g] ? numMutatedSamples(mutGenes[g].mutated_samples) > 0 : false;
					})
					.sort(function(a, b){
						var x = mutGenes[a] ? numMutatedSamples(mutGenes[a].mutated_samples) : 0,
							y = mutGenes[b] ? numMutatedSamples(mutGenes[b].mutated_samples) : 0;
						return x < y ? 1 : -1;
					});
					d.top_genes = mutatedGenes.slice(0, Math.min(5, mutatedGenes.length)).join(",");
					return d;
				});

				// Create the objects to represent the most mutated gene sets
				genesets.filter(function(S){ return S.mutated_samples > 0; }).sort(function(a, b){ return a.mutated_samples < b.mutated_samples ? 1 : -1; });
				most_mutated_gene_sets = genesets.slice(0, Math.min(genesets.length, 20));

				// Update the summary
				summary = {
					most_mutated_genes: most_mutated_genes,
					most_mutated_gene_sets: most_mutated_gene_sets,
					num_samples: num_samples,
					num_mutated_genes: num_mutated_genes,
					num_snvs: num_snvs,
					num_cnas: num_cnas,
					mutation_plot_data: mutation_plot_data
				};

				promise.resolve();
			});

			return promise.promise;
		}

		// Save the dataset
		function createDataset(){
			// Set up promise
			var d = Q.defer();

			// Transform mutation data into SNV schema format
			var mutGenes = [];
			for (var g in mutSamples){
				// Create the object we want to insert
				var Gene = { gene: g, mutated_samples: mutSamples[g],
					         snvs: {}, cnas: {} };

				if (g in snvs) Gene.snvs = snvs[g];
				if (g in cnas) Gene.cnas = cnas[g];
				
				mutGenes.push( Gene );
			}

			// Formulate queries and updates for the datbase
			var query = { title: datasetName, group: group_name, is_standard: is_standard },
				newDataset  = {
					title: datasetName,
					samples: samples, // samples from input sample list
					group: group_name,
					updated_at: Date.now(),
					summary: summary,
					is_standard: is_standard,
					user_id: user_id,
					color: datasetToColor[datasetName]
				};

			if (user_id) query.user_id = user_id;

			// Find the dataset 
			Dataset.remove(query, function(err){
				if (err) throw new Error(err);

				Dataset.create( newDataset, function(err, newDataset){
					if (err) throw new Error(err);

					// Update the MutGene data to include the dataset ID
					mutGenes.forEach(function(g){ g.dataset_id = newDataset._id; })

					// Remove any previous MutGenes associated with the dataset
					MutGene.remove({dataset_id: newDataset._id}, function(err){
						if (err) throw new Error(err);
		
						// Finally, create mutated genes
						MutGene.create(mutGenes, function(err, res){
							if (err) throw new Error(err);
							d.resolve();		
						});
					});
				});
			});


			return d.promise;
		}

		// Load the synchronous aberrations and SNVs
		loadAberrations();
		loadSNVs();

		// Then load the CNAs, compute the summary, and create the dataset
		return loadCNAs().then( computeSummary ).then( createDataset );

	}

	function loadMutationFile(filepath, fileType, sampleIndex, callback){
		// Initialize each dataset with an empty array
		var datasetToLines = {};
		datasets.forEach(function(db){
			datasetToLines[db] = [];
			if (!givenSampleList && !(db in datasetToSamples)){
				datasetToSamples[db] = [];
			}
		})

		// Return an empty array for each dataset if a filepath wasn't provided
		if (!filepath){
			callback("", datasetToLines);
			return;
		}

		fs.readFile(filepath, 'utf-8', function (err, data) {
			// Exit if there's an error, else callback
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			var lines = data.trim().split('\n');

			// Make sure there're some lines in the file
			if (lines.length == 0){
				console.log("Empty " + fileType + " file. Exiting.")
				process.exit(1);
			}

			lines.forEach(function(l){
				// Parse the sample from the line
				var sample = l.split("\t")[sampleIndex];

				// Skip lines that start with '#'
				if (l.lastIndexOf('#', 0) === 0){ return; }

				// Skip samples not in the whitelist
				if (givenSampleList){
					if (!(sample in sampleToDataset)) return;
				}
				else{
					sampleToDataset[sample] = dataset;
					if (datasetToSamples[dataset].indexOf(sample) == -1){
						datasetToSamples[dataset].push( sample );
					}
				}

				// Assign the line to the current dataset
				datasetToLines[sampleToDataset[sample]].push( l );
			});

			// Execute the callback
			callback("", datasetToLines);
		});
	}

	function splitDatasets(){
		// Set up promise
		var d = Q.defer();

		loadMutationFile(snvs_file, "SNV", 1, function(err, datasetToSNVLines){
			loadMutationFile(cnas_file, "CNA", 1, function(err, datasetToCNALines){
				loadMutationFile(aberration_file, "aberrations", 0, function(err, datasetToAberrationLines){
					var funcs = datasets.map(function(datasetName){
						var samples = datasetToSamples[datasetName],
							snvLines = datasetToSNVLines[datasetName],
							cnaLines = datasetToCNALines[datasetName],
							aberrationLines = datasetToAberrationLines[datasetName];

							return function(){ return loadDataset( datasetName, samples, cnaLines, snvLines, aberrationLines ) };
					});
					funcs.push( function(){ d.resolve(); } )
					return funcs.slice(1, funcs.length).reduce(Q.when, Q(funcs[0]()))
				});
			});	
		});
		return d.promise;
	}
	
	return loadCancers().then( loadSampleFile ).then( splitDatasets )

}