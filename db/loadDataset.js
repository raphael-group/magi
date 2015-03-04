// Load models
var db = require('../../model/db'),
	Dataset = require('../../model/datasets');

// Validate args
var argv = require('optimist').argv;
if (!( argv.snv_file || argv.cna_file || argv.aberration_file )){
    usage  = "Usage: node loadSNVs.js --snv_file=</path/to/snvs|optional> "
    usage += "--cna_file=</path/to/cnas|optional> --aberration_file=</path/to/aberrations|optional> "
    usage += "--matrix_file=</path/to/matrix/file> --matrix_name=<name> "
    usage += "--sample_list=</path/to/samples|optional> --db_name=<name> "
    usage += "--cancer=</path/to/dataset/to/cancer/mapping [or] cancer name|optional> "
    usage += "--group_name=<name|optional> --color=<hex|optional> "
    usage += "--annotation_color_file=</path/to/annotation/to/color/file|optional>"
    console.log(usage);
    process.exit(1);
}

// Determine which files were provided, and create absolute paths to them
var path = require( 'path' );

if (argv.snv_file)
	var snvFile = path.normalize(__dirname + '/' + argv.snv_file)
else
	var snvFile = null;

if (argv.cna_file)
	var cnaFile = path.normalize(__dirname + '/' + argv.cna_file) || null;
else
	var cnaFile = null;

if (argv.aberration_file)
	var aberrationFile = path.normalize(__dirname + '/' + argv.aberration_file) || null;
else
	var aberrationFile = null;

if (argv.matrix_file){
	var matrixFile = path.normalize(__dirname + '/' + argv.matrix_file) || null;
	if (!argv.matrix_name){
		console.log("[err] A matrix name is required when passing in a matrix file.")
		process.exit(1);
	} else{
		var matrixName = argv.matrix_name;
	}
}
else{
	var matrixFile = null;
	var matrixName = "";
}

if (argv.annotation_color_file)
	var annotationColorFile = path.normalize(__dirname + '/' + argv.annotation_color_file) || null;
else
	var annotationColorFile = null;

// Verify the color is in hex
function isHexColor(c){
	return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(c)
}
var color;
if (argv.color){
	if (!isHexColor(argv.color)){
		console.log("[err] Color must be in hex format.")
    	process.exit(1);
	}
	else{
		var color = argv.color;
	}
}

// Add the dataset to the database
var mongoose = require( 'mongoose' );
Dataset.addDatasetFromFile( argv.db_name, argv.group_name || "", argv.sample_list,
							snvFile, cnaFile, aberrationFile, matrixFile, matrixName,
							annotationColorFile, argv.cancer, true, color )
	.then(function(){
		mongoose.disconnect();
	});

