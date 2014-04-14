// Load models
var db = require('../../model/db'),
	annotations = require('../../model/annotations');

// Validate args
var argv = require('optimist').argv;
if (!( argv.annotations_file)){
    usage  = "Usage: node loadKnownGeneSets.js --annotations_file=</path/to/annotations/file>"
    console.log(usage);
    process.exit(1);
}

// Insert the gene sets into the database
var path   = require( 'path' ),
	filepath = path.normalize(__dirname + '/' + argv.annotations_file);

var mongoose = require( 'mongoose' );
annotations.loadAnnotationsFromFile( filepath, function(err){
	if (err) throw new Error(err);
	
	// Finish up
	mongoose.disconnect();	
});

