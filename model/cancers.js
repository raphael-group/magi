// Import required modules
var mongoose = require( 'mongoose' ),
    Database = require('./db');

// Create GeneSet schema and add it to Mongoose
var CancerSchema = new mongoose.Schema({
	cancer: { type: String, required: true},
	abbr: { type: String, required: true},
	color: { type: String, required: true },
	created_at: { type: Date, default: Date.now, required: true },
	is_standard: { type: Boolean, default: false, required: false }
});

Database.magi.model( 'Cancer', CancerSchema );

// Loads annotations into the database
exports.loadCancersFromFile = function(filename, is_standard, callback){
	// Load required modules
	var fs = require( 'fs' ),
		Cancer = Database.magi.model( 'Cancer' ),
		Q  = require( 'q' );

	// Read in the file asynchronously
	var data;
	function loadCancerFile(){
		var d = Q.defer();
		fs.readFile(filename, 'utf-8', function (err, fileData) {
			// Exit if there's an error, else callback
			if (err) console.log(err)
			d.resolve();
			data = fileData;
		});
		return d.promise;
	}

	function processCancers(){
		// Load the lines, but skip the header (the first line)
		var lines = data.trim().split('\n');

		// Create objects to represent each interaction
		var cancers = [];
		lines.forEach(function(l){
			// Parse the line
			var fields = l.split('\t'),
				cancer = {
					cancer: fields[0],
					abbr: fields[1],
					color: fields[2],
					is_standard: is_standard
				}
			cancers.push( cancer );
		});

		console.log( "Loaded " + cancers.length + " cancers." )

		// Save all the interactions
		return Q.allSettled( cancers.map(function(c){
			var d = Q.defer();
			Cancer.create(c, function(err){
				if (err) throw new Error(err);
				d.resolve();
			})
			return d.promise;
		}));
	}

	loadCancerFile().then( processCancers ).then( function(){ callback("") } );
}