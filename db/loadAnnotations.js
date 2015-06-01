// Load models
//var db = require('../model/db'),
	annotations = require('../model/annotations_sql');

// Validate args
var argv = require('optimist').argv;
if (!( argv.annotations_file)){
    usage  = "Usage: node loadAnnotations.js --annotations_file=</path/to/annotations/file> --source=<name>"
    console.log(usage);
    process.exit(1);
}

// normalize the path to the annotations
var path   = require( 'path' ),
	filepath = path.normalize(__dirname + '/' + argv.annotations_file);

//var mongoose = require( 'mongoose' );
annotations.loadAnnotationsFromFile( filepath, argv.source, function(err){
	if (err) throw new Error(err);
	
	// Finish up
//	mongoose.disconnect();	
});

