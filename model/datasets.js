// Import required modules
var mongoose = require( 'mongoose' );

// Create schemas to hold the SNVs
var MutGeneSchema = new mongoose.Schema({
	gene: {type: String, required: true},
	dataset: { type: String, required: true},
	mutated_samples: { type: {}, required: true},
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
});

mongoose.model( 'Dataset', DatasetSchema );
mongoose.model( 'MutGene', MutGeneSchema );

// List all the titles and names of the datasets
exports.datasetTitles = function datasetlist(callback){
	var Dataset = mongoose.model( 'Dataset' );
	Dataset.find({}, 'title', {sort: {title: 1} }, callback);
}

exports.datasetGroups = function datasetlist(callback){
	var Dataset = mongoose.model( 'Dataset' );
	Dataset.aggregate(
		{$group: {_id: '$group', list: { $push: '$title'} }},
		{$sort: {_id: -1}}, // sort descending by group name
		function(err, res){
			// Handle error (if necessary)
			if (err) throw new Error(err);

			// Parse result into groups
			var groups = [];
			for (var i = 0; i < res.length; i++){
				groups.push( {name: res[i]._id, dbs: res[i].list.sort(), id: i } );
			}

			// Execute callback
			callback(err, groups);
		}
	)
}

exports.datasetlist = function datasetlist(datasets, callback){
	var Dataset = mongoose.model( 'Dataset' );
	Dataset.find({title: {$in: datasets}}, callback);
}

// A function for listing all the interactions for a particular gene
exports.mutGenesList = function snvlist(genes, datasets, callback){
	var MutGene = mongoose.model( 'MutGene' )
	, query     = { gene: {$in: genes}, dataset: {$in: datasets} };

	MutGene.find(query, function(err, mutGenes){
 		if(err) console.log(err);
 		else callback("", mutGenes);
	});// end MutGene.find

}// end exports.mutGenesList

// Loads a SNVs into the database
exports.addSNVsFromFile = function(dataset, group_name, samples_file, snvs_file){
	// Load required modules
	var fs    = require( 'fs' )
	, Dataset = mongoose.model( 'Dataset' )
	, MutGene = mongoose.model( 'MutGene' )
	, domain  = require( "./domains" )
	, Q       = require( 'q' );

	// Read in the sample file asynchronously
	var samples;
	function loadSampleFile(){
		// Set up promise
		var d = Q.defer();

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

	// Read in the SNVs file asynchronously
	function loadSNVFile(){	
		// Set up promise
		var d = Q.defer();

		fs.readFile(snvs_file, 'utf-8', function (err, data) {
			// Exit if there's an error, else callback
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			var lines = data.trim().split('\n');

			// Make sure there're some lines in the file
			if (lines.length < 2){
				console.log("Empty file (or just header). Exiting.")
				process.exit(1);
			}

			// Parse the mutations into a hash from gene to transcripts' mutations
			var gene2mutations = {}
			, mutTys           = {}
			, mutSamples       = {};
			for (var i = 1; i < lines.length; i++){
				// Parse the line
				var fields   = lines[i].split('\t')
				, gene       = fields[0]
				, sample     = fields[1]
				, transcript = fields[2]
				, length     = fields[3]
				, locus      = fields[4]  * 1 // make sure locus is a Number
				, mutTy      = fields[5]
				, aao        = fields[6]
				, aan        = fields[7];

				// Create the mutation
				var mut = { sample: sample, dataset: dataset, locus: locus,
				            aan: aan, aao: aao, ty: mutTy };

				// Append the mutation to the list of mutations in the
				// current gene
				if (!(gene in gene2mutations)) gene2mutations[gene] = {};
				if (!(gene in mutSamples)) mutSamples[gene] = [];
				if (!(gene in mutTys)) mutTys[gene] = [];

				// Only add the transcript mutations if the transcript is defined
				if (transcript != '--'){
					if (!(transcript in gene2mutations[gene])){
						// Create a new null transcript, including the relevant domains
						var transcript_info = { mutations: [], length: length * 1 };
						gene2mutations[gene][transcript] = transcript_info;				
					}
			
					gene2mutations[gene][transcript].mutations.push( mut );
				}

				// Record the mutated sample
				var j = mutSamples[gene].indexOf( sample );
				if (j == -1){
					mutSamples[gene].push( sample );
					mutTys[gene].push( [mutTy] );
				}
				else{
					if (mutTys[gene][j].indexOf(mutTy) == -1)
						mutTys[gene][j].push( mutTy );
				}

			}

			// Transform mutation data into SNV schema format
			var mutGenes = [];
			for (var g in gene2mutations){
				// Create a list of sample with mutation types objects
				var mutated_samples = [];
				for (var i = 0; i < mutSamples[g].length; i++)
					mutated_samples.push( {sample: mutSamples[g][i], mut_tys: mutTys[g][i]});

				// Crate the object we want to insert
				var Gene = { gene: g, mutated_samples: mutated_samples,
					          snvs: {}, cnas: {}, dataset: dataset };
				
				for (var t in gene2mutations[g])
					Gene.snvs[t] = gene2mutations[g][t];
				
				mutGenes.push( Gene );
			}


			// Formulate queries and updates for the datbase
			var query = { title: dataset }
			, update  = { title: dataset, samples: samples, // samples from input sample list
						  group: group_name, updated_at: Date.now() };

			// First, remove all previous datasets and mutgenes matching the input dataset
			Dataset.remove(query, function(err){
				if (err) throw new Error(err);
				MutGene.remove({dataset: dataset}, function(err){
					// Then create the dataset
					Dataset.create(update, function(err, dataset){
						if (err) throw new Error(err);

						// Finally, create mutated genes
						MutGene.create(mutGenes, function(err, res){
							if (err) throw new Error(err);
							d.resolve();
						});
					});
				});
			});
		});

		return d.promise; 

	}
	
	return loadSampleFile().then( function(){ return loadSNVFile(); } );

}