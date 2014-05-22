// Import required modules
var mongoose = require( 'mongoose' );

// Create GeneSet schema and add it to Mongoose
var GeneSetSchema = new mongoose.Schema({
	database: {type: String, required: true},
	genes: { type: [String], required: true},
	gene_set_id: { type: String, required: false},
	description: { type: String, required: false },
	created_at: { type: Date, default: Date.now, required: true }	
});

mongoose.model( 'GeneSet', GeneSetSchema );

// Loads gene sets into the database
exports.loadGeneSetsFromFile = function(filename, database, callback){
	// Load required modules
	var fs = require( 'fs' ),
		GeneSet = mongoose.model( 'GeneSet' ),
		Q  = require( 'q' );

	// Read in the file asynchronously
	var data;
	function loadGeneSetFile(){
		var d = Q.defer();
		fs.readFile(filename, 'utf-8', function (err, fileData) {
			// Exit if there's an error, else callback
			if (err) console.log(err)
			d.resolve();
			data = fileData;
		});
		return d.promise;
	}

	function processGeneSets(){
		// Load the lines, but skip the header (the first line)
		var lines = data.trim().split('\n');

		// Make sure there're some lines in the file
		if (lines.length < 2){
			console.log("Empty file (or just header). Exiting.")
			process.exit(1);
		}

		// Create objects to represent each interaction
		var genesets = [];
		for (var i = 1; i < lines.length; i++){
			// Parse the line
			var fields = lines[i].split('\t'),
				geneset = 	{
								database: database,
								gene_set_id: fields[0],
								description: fields[1],
								genes: fields[2].split(", ")
							};

			// Save the geneset
			genesets.push( geneset );
		}
		console.log( "Loaded " + genesets.length + " genesets." )

		// Save all the interactions
		return Q.allSettled( genesets.map(function(S){
			var d = Q.defer();
			GeneSet.create(S, function(err){
				if (err) throw new Error(err);
				d.resolve();
			})
			return d.promise;
		}));
	}

	loadGeneSetFile().then( processGeneSets ).then( function(){ callback("") } );
}