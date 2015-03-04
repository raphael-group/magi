// Load models
var db = require('../model/db')
, ppis = require('../model/ppis');

// Validate args
var argv = require('optimist').argv;
if (!( argv.ppi_file )){
    usage  = "Usage: node loadPPIs.js --ppi_file=</path/to/ppis>"
    console.log(usage);
    process.exit(1);
}

// Insert the network into the database
var path   = require( 'path' )
, filepath = path.normalize(__dirname + '/' + argv.ppi_file);

var mongoose = require( 'mongoose' );
ppis.insertNetworkFromFile( filepath, function(err){
	if (err) throw new Error(err);
	
	// Finish up
	mongoose.disconnect();	
});

