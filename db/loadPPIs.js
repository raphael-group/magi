// Load models
//var db = require('../model/db'),
	ppis = require('../model/ppis');
	pg = require('../model/db_sql');

// Validate args
var argv = require('optimist').argv;
if (!( argv.ppi_file)){
    usage  = "Usage: node loadPPIAnnotations.js --ppi_file=</path/to/ppi/file> --source=<source>"
    console.log(usage);
    process.exit(1);
}

// normalize the path to the annotations
// shouldn't this be the path from where the file was run?
var path  = require( 'path' ),
	filepath = path.normalize(__dirname + '/' + argv.ppi_file);

// test connection to postgres
pg.verify_connection()
    .then( function () {
	ppis.loadFromFile( filepath, argv.source, function(err){
	    if (err) throw new Error(err);
	})})
    .fail( function (err) {
	console.log("Connection failed:", err);
	console.log("Check POSTGRES environment variables.");
	process.exit(1);
    }).done(); // TODO: rollback?
