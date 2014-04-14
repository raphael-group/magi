// Import required modules
var mongoose = require( 'mongoose' ),
	Genome  = require( "./genome" ),
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
exports.addDatasetFromFile = function(dataset, group_name, samples_file, snvs_file, cnas_file, is_standard, color, user_id){
	// Load required modules
	var fs      = require( 'fs' ),
		Dataset = mongoose.model( 'Dataset' ),
		MutGene = mongoose.model( 'MutGene' ),
		domain  = require( "./domains" ),
		Q       = require( 'q' );

	// Make sure that either/both an SNV and CNA file were provided
	if (!(snvs_file || cnas_file)){
		console.log("addDatasetFromFile: either/both SNV file or CNA file are *required*.")
		process.exit(1);
	}

	// Read in the sample file asynchronously
	var samples = [],
		givenSampleList = true;

	function loadSampleFile(){
		// Set up promise
		var d = Q.defer();

		// Return if no samples file is provided
		if (!samples_file){
			givenSampleList = false;
			d.resolve();
			return d.promise;
		}

		fs.readFile(samples_file, 'utf-8', function (err, data) {
			// Exit if there's an error
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			samples = data.trim().split('\n');

			// Resolve the promise
			d.resolve();

		});

		return d.promise;
	}

	// Read in the CNAs file asynchronously
	var snvs = {},
		cnas = {},
		mutGenes = {},
		mutSamples = {},
		summary = {},
		mutationTypes = [];

	function loadCNAFile(){
		// Set up promise
		var d = Q.defer();

		// If a CNA file wasn't provided, return
		if (!cnas_file){
			d.resolve();
			return d.promise;
		}

		fs.readFile(cnas_file, 'utf-8', function (err, data) {
			// Exit if there's an error, else callback
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			var lines = data.trim().split('\n');

			// Make sure there're some lines in the file
			if (lines.length < 2){
				console.log("Empty CNA file (or just header). Exiting.")
				process.exit(1);
			}

			// Parse the mutations into a hash from gene to transcripts' mutations
			for (var i = 1; i < lines.length; i++){
				// Parse the line
				var fields = lines[i].split('\t'),
					gene   = fields[0],
					sample = fields[1],
					cnaTy  = fields[2] == "AMP" ? "amp" : "del",
					start  = fields[3] * 1,
					end    = fields[4] * 1;

				// Ignore samples not in the whitelist
				if (samples.indexOf(sample) == -1){
					if (givenSampleList) continue;
					else samples.push( sample );
				}

				// Create the mutation
				var mut = { dataset: dataset, ty: cnaTy, sample: sample,
				            start: start, end: end };

				// Append the mutation to the list of mutations in the
				// current gene
				if (!(gene in cnas)) cnas[gene] = {segments: {}};
				if (!(sample in cnas[gene])) cnas[gene].segments[sample] = [];
				cnas[gene].segments[sample].push( mut );

				if (!(gene in mutSamples)) mutSamples[gene] = {};

				// Record the mutated sample
				if (sample in mutSamples[gene] && mutSamples[gene][sample].indexOf(cnaTy) == -1){
					mutSamples[gene][sample].push(cnaTy);
				}
				else{
					mutSamples[gene][sample] = [ cnaTy ];
				}

				// Record the mutation in the master list of genes to all their mutated samples
				if (!(gene in mutGenes))
					mutGenes[gene] = { snvs: {}, cnas: {}, inactivating: {}, mutated_samples: {}, amp: {}, del: {} };

				mutGenes[gene].mutated_samples[sample] = true;
				mutGenes[gene].cnas[sample] = true;
				mutGenes[gene][cnaTy.toLowerCase()][sample] = true;

			}

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

					for (var s in cnaSamples){
						var segs = cnaSamples[s];
						segments.push( {sample: s, segments: segs} );

						for (var i = 0; i < segs.length; i++){
							if (segs[i].start < minSegX) minSegX = segs[i].start;
							if (segs[i].end > maxSegX) maxSegX = segs[i].end;
						}
					}

					// Add the gene's region information
					cnas[g.name].region = { chr: g.chr, minSegX: minSegX, maxSegX: maxSegX };
					cnas[g.name].segments = segments;

					Genome.getGenesinRange(g.chr, g.start - 25000000, g.end + 25000000, function (err, neighbors){
						if(err) console.log(err);
						cnas[g.name].neighbors = neighbors;
						d2.resolve();
					});
					return d2.promise;
				})).then(function(){ d.resolve(); });
			});
		});

		return d.promise;
	}


	// Read in the SNVs file asynchronously
	function loadSNVFile(){	
		// Set up promise
		var d = Q.defer();

		// If a CNA file wasn't provided, return
		if (!snvs_file){
			d.resolve();
			return d.promise;
		}

		fs.readFile(snvs_file, 'utf-8', function (err, data) {
			// Exit if there's an error, else callback
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			var lines = data.trim().split('\n');

			// Make sure there're some lines in the file
			if (lines.length < 2){
				console.log("Empty SNV file (or just header). Exiting.")
				process.exit(1);
			}

			for (var i = 1; i < lines.length; i++){
				// Parse the line
				var fields     = lines[i].split('\t'),
					gene       = fields[0],
					sample     = fields[1],
					transcript = fields[2],
					length     = fields[3],
					locus      = fields[4],
					mutTy      = fields[5],
					aao        = fields[6],
					aan        = fields[7];

				// Create the mutation
				var mut = { sample: sample, dataset: dataset, locus: locus,
				            aan: aan, aao: aao, ty: mutTy };
				
				// If a sample list was provided, restrict to only those
				// samples
				if (samples.indexOf(sample) == -1){
					if (givenSampleList) continue;
					else samples.push( sample );
				}

				// Append the mutation to the list of mutations in the
				// current gene
				if (!(gene in snvs)) snvs[gene] = {};
				if (!(gene in mutSamples)) mutSamples[gene] = {};

				// Only add the transcript mutations if the transcript is defined
				if (transcript != '--'){
					if (!(transcript in snvs[gene])){
						// Create a new null transcript, including the relevant domains
						var transcript_info = { mutations: [], length: length * 1 };
						snvs[gene][transcript] = transcript_info;				
					}
			
					snvs[gene][transcript].mutations.push( mut );
				}

				// Record the mutated sample
				var mutClass = inactiveTys.indexOf(  mutTy.toLowerCase() ) != -1 ? "inactive_snv" : "snv";
				if (sample in mutSamples[gene] && mutSamples[gene][sample].indexOf(mutClass) == -1){
					mutSamples[gene][sample].push( mutClass );
				}
				else{
					mutSamples[gene][sample] = [ mutClass ];
				}

				// Record the mutation type
				if (mutationTypes.indexOf(mutTy) === -1){
					mutationTypes.push( mutTy.toLowerCase() );
				}

				// Record the mutation in the master list of genes to all their mutated samples
				if (!(gene in mutGenes))
					mutGenes[gene] = { snvs: {}, cnas: {}, inactivating: {}, mutated_samples: {}, amp: {}, del: {} };

				if (!(mutTy in mutGenes[gene])) mutGenes[gene][mutTy] = {};
				mutGenes[gene].mutated_samples[sample] = true;
				mutGenes[gene].snvs[sample] = true;
				mutGenes[gene][mutTy][sample] = true;

				if (mutClass == "inactive_snv") mutGenes[gene].inactivating[sample] = true;
			}

			d.resolve();

		});

		return d.promise; 

	}

	function computeSummary(){
		// Set up promise
		console.log(dataset + " summary:")
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
		var query = { title: dataset, group: group_name, is_standard: is_standard },
			newDataset  = { title: dataset, samples: samples, // samples from input sample list
					  		group: group_name, updated_at: Date.now(), summary: summary,
					  		is_standard: is_standard, user_id: user_id, color: color };

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
	
	return loadSampleFile()
			.then( loadCNAFile )
			.then( loadSNVFile )
			.then( computeSummary )
			.then( createDataset );

}