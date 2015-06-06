// Load models
//var db = require('../model/db'),
	annotations = require('../model/annotations_sql');
	pg = require('../model/db_sql');

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

// test connection to postgres
pg.verify_connection()
    .then( function () {
	annotations.loadAnnotationsFromFile( filepath, argv.source, function(err){
	    if (err) throw new Error(err);	
	})})
    .fail( function (err) {
	console.log("Connection failed:", err);
	console.log("Check POSTGRES environment variables.");
	process.exit(1);
    }).done(); // TODO: rollback?
