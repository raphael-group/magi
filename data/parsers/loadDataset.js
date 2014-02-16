// Load models
var db = require('../../model/db'),
	Dataset = require('../../model/datasets');

// Validate args
var argv = require('optimist').argv;
if (!( argv.db_name && (argv.snv_file || argv.cna_file) )){
    usage  = "Usage: node loadSNVs.js --snv_file=</path/to/snvs|optional> "
    usage += "--db_name=<name> --sample_list=</path/to/samples|optional> "
    usage += "--group_name=<name|optional> --cna_file=</path/to/cnas|optional>"
    console.log(usage);
    process.exit(1);
}

// Determine which files were provided, and create absolute paths to them
var path = require( 'path' );

if (argv.snv_file)
	snvFile = path.normalize(__dirname + '/' + argv.snv_file)
else
	snvFile = null;

if (argv.cna_file)
	cnaFile = path.normalize(__dirname + '/' + argv.cna_file) || null;
else
	cnaFile = null;

// Add the dataset to the database
var mongoose = require( 'mongoose' );
Dataset.addDatasetFromFile( argv.db_name, argv.group_name || "", argv.sample_list, snvFile, cnaFile, true )
	.then(function(){
		mongoose.disconnect();
	});

