// Import required modules
var mongoose = require( 'mongoose' );
var Domain  = require( "./domains" );
var Genome  = require( "./genome" );

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
	updated_at: { type: Date, default: Date.now, required: true },
	created_at: { type: Date, default: Date.now, required: true },
	user_id: { type: mongoose.Schema.Types.ObjectId, default: null},
	is_standard: { type: Boolean, default: false, required: true }
});

mongoose.model( 'Dataset', DatasetSchema );
mongoose.model( 'MutGene', MutGeneSchema );

// List the datasets by group
exports.datasetGroups = function datasetgroups(query, callback){
	var Dataset = mongoose.model( 'Dataset' );

	Dataset.aggregate(
		{ $match: query },
		{$group: {_id: '$group', dbs: { $push: {title: '$title', _id: '$_id', samples: '$samples', updated_at: '$updated_at'} } }},
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
exports.addDatasetFromFile = function(dataset, group_name, samples_file, snvs_file, cnas_file, is_standard, user_id){
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
		mutSamples = {};

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
				//if (!(gene in mutTys)) mutTys[gene] = [];

				// Record the mutated sample
				if (sample in mutSamples[gene] && mutSamples[gene][sample].indexOf(cnaTy) == -1){
					mutSamples[gene][sample].push(cnaTy);
				}
				else{
					mutSamples[gene][sample] = [ cnaTy ];
				}

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
			}

			d.resolve();

		});

		return d.promise; 

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
					  		group: group_name, updated_at: Date.now(),
					  		is_standard: is_standard, user_id: user_id };

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
			.then( createDataset );

}