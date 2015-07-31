// Load models
//var db = require('../model/db'),
	annotations = require('../model/annotations_sql');
	pg = require('../model/db_sql');

// Validate args
var argv = require('optimist').argv;
if (!( argv.ppis_file)){
    usage  = "Usage: node loadPPIAnnotations.js --ppis_file=</path/to/ppi/file>"
    console.log(usage);
    process.exit(1);
}

// normalize the path to the annotations
// shouldn't this be the path from where the file was run?
var path  = require( 'path' ),
	filepath = path.normalize(__dirname + '/' + argv.ppis_file);

// test connection to postgres
pg.verify_connection()
    .then( function () {
	annotations.loadPPIsFromFile( filepath, argv.source, function(err){
	    if (err) throw new Error(err);	
	})})
    .fail( function (err) {
	console.log("Connection failed:", err);
	console.log("Check POSTGRES environment variables.");
	process.exit(1);
    }).done(); // TODO: rollback?
