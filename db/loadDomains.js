// Load models
var db    = require('../model/db')
, domains = require('../model/domains');

// Validate args
var argv = require('optimist').argv;
if (!( argv.domain_file )){
    usage  = "Usage: node loadDomains.js --domain_file=</path/to/domains>"
    console.log(usage);
    process.exit(1);
}

// Insert the network into the database
var path   = require( 'path' )
, filepath = path.normalize(__dirname + '/' + argv.domain_file);

domains.addDomainsFromFile( filepath, function(err){
	// Finish up
	var mongoose = require( 'mongoose' );
	mongoose.disconnect();
});

