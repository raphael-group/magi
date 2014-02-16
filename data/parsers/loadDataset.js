// Load models
var db = require('../../model/db'),
	snvs = require('../../model/datasets');

// Validate args
var argv = require('optimist').argv;
if (!( argv.snv_file && argv.db_name && argv.sample_list )){
    usage  = "Usage: node loadSNVs.js --snv_file=</path/to/snvs> "
    usage += "--db_name=<name> --sample_list=</path/to/samples/> "
    usage += "--group_name=<name|optional> --cna_file=</path/to/cnas>"
    console.log(usage);
    process.exit(1);
}

// Insert the network into the database
var path = require( 'path' ),
	snvFile = path.normalize(__dirname + '/' + argv.snv_file),
	cnaFile = path.normalize(__dirname + '/' + argv.cna_file);

// 
var domain = require( "../../model/domains" ),
	mongoose = require( 'mongoose' );
snvs.addDatasetFromFile( argv.db_name, argv.group_name || "", argv.sample_list, snvFile, cnaFile, true )
	.then(function(){
		mongoose.disconnect();
	});

