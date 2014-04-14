// Load models
var db = require('../../model/db'),
	genesets = require('../../model/genesets');

// Validate args
var argv = require('optimist').argv;
if (!( argv.gene_set_file && argv.dataset )){
    usage  = "Usage: node loadKnownGeneSets.js --gene_set_file=</path/to/genesets/file> --dataset={dataset name}"
    console.log(usage);
    process.exit(1);
}

// Insert the gene sets into the database
var path   = require( 'path' ),
	filepath = path.normalize(__dirname + '/' + argv.gene_set_file);

var mongoose = require( 'mongoose' );
genesets.loadGeneSetsFromFile( filepath, argv.dataset, function(err){
	if (err) throw new Error(err);
	
	// Finish up
	mongoose.disconnect();	
});

