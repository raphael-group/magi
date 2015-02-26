// Load models
var db = require('../model/db'),
	genome = require('../model/genome');

// Validate args
var argv = require('optimist').argv;
if (!( argv.genome_file )){
    usage  = "Usage: node loadGenome.js --genome_file=</path/to/genome>"
    console.log(usage);
    process.exit(1);
}

// Insert the network into the database
var path = require( 'path' ),
	filepath = path.normalize(__dirname + '/' + argv.genome_file);

var mongoose = require( 'mongoose' );
genome.loadGenomeFromFile( filepath, function(err){
	if (err) throw new Error(err);
	
	// Finish up
	mongoose.disconnect();	
});

