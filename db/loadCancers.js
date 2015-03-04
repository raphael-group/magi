// Load models
var db = require('../model/db'),
	cancers = require('../model/cancers');

// Validate args
var argv = require('optimist').argv;
if (!( argv.cancers_file)){
    usage  = "Usage: node loadCancers.js --cancers_file=</path/to/cancer/file>"
    console.log(usage);
    process.exit(1);
}

// Normalize the path to the cancers file
var path   = require( 'path' ),
	filepath = path.normalize(__dirname + '/' + argv.cancers_file);

var mongoose = require( 'mongoose' );
cancers.loadCancersFromFile( filepath, true, function(err){
	if (err) throw new Error(err);
	
	// Finish up
	mongoose.disconnect();	
});

