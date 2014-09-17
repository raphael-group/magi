// Import required modules
var mongoose = require( 'mongoose' ),
    db = require('./db');

// Create domain schema and add it to Mongoose
var DomainSchema = new mongoose.Schema({
	transcript: {type: String, required: true},
	domains: { type: {}, required: true},
	created_at: { type: Date, default: Date.now, required: true }
});

var DomainDatasetSchema = new mongoose.Schema({
	name: {type: String, required: true },
	updated_at: { type: Date, default: Date.now, required: true }
});

db.magi.model( 'Domain', DomainSchema );
db.magi.model( 'DomainDataset', DomainDatasetSchema );

// A function for listing all the interactions for a particular gene
function domainlist(transcripts, callback){
	var Domain = mongoose.model( 'Domain' );
	Domain.find({ transcript: { $in: transcripts } }, function (err, domains) {
  		if(err) console.log(err);
  		else callback("", domains);
	})// end Domain.find
}// end exports.domainlist

exports.domainlist = domainlist;

// A function for listing all the domain database names
function domainDBList(callback){
	var DomainDB = mongoose.model( 'DomainDataset' );
	DomainDB.find({}, 'name', function(err, res){
		if (err) throw new Errror(err);
		callback("", res.map(function(r){ return r.name; }));
	});
}// end exports.domainNameList

exports.domainDBList = domainDBList;

// Loads a set of domains into the database
exports.addDomainsFromFile = function(filename, callback){
	// Load required modules
	var fs = require( 'fs' )
	, Q    = require('q');

	// Read in the file asynchronously
	var data; // global to store file data
	function loadDomainFile(){	
		// Set up our promise
		var d = Q.defer();

		// Read the file and resolve the promise once it's loaded
		fs.readFile(filename, 'utf-8', function (err, fileData) {
			// Exit if there's an error
			if (err) console.log(err)
			data = fileData;
			d.resolve();
		});

		return d.promise;
	}

	function createDomains(){
		// Load the lines, but skip the header (the first line)
		var lines = data.trim().split('\n');
		
		// Make sure there're some lines in the file
		if (lines.length < 2){
			console.log("Empty file (or just header). Exiting.")
			process.exit(1);
		}
		// Create an array of new domains
		var transcript2domains = {}
		, domainDBs = [];
		for (var i = 1; i < lines.length; i++){
			// Parse the line
			var fields   = lines[i].split('\t')
			, db         = fields[0]
			, transcript = fields[1]
			, name       = fields[2]
			, start      = fields[3] * 1
			, end        = fields[4] * 1;

			// Record the database
			if (domainDBs.indexOf(db) == -1)
				domainDBs.push( db );

			// Initialize the data structures to store the transcript's domain
			// information (if necessary)
			if (!(transcript in transcript2domains))
				transcript2domains[transcript] = {};

			if (!(db in transcript2domains[transcript]))
				transcript2domains[transcript][db] = [];

			transcript2domains[transcript][db].push( {name: name, start: start, end: end} );

		}

		// Flatten the transcript2domains object for easy saving
		var newDomains = []
		, transcripts  = Object.keys( transcript2domains );
		for (var t in transcript2domains){
			newDomains.push( {transcript: t, domains: transcript2domains[t] });
		}

		// Save the domain datasets
		var DomainDB = mongoose.model( 'DomainDataset' );
		function saveDomainDBs(){
			return Q.allSettled(domainDBs.map(function(db){
					var d = Q.defer(),
						update = {name: db, updated_at: Date.now()};
					DomainDB.findOneAndUpdate({name: db}, update, {upsert: true}, function(err, res){
						if (err) throw new Error(err);
						d.resolve();
					});
					return d.promise;
				})
			);
		}

		// Save all the domains simultaneously, and then resolve the promise
		var Domain = mongoose.model( 'Domain' );

		return saveDomainDBs().then(function(){
			var d = Q.defer();
			Domain.remove({transcript: {$in: transcripts}}, function(err){
				if (err) throw new Error(err);

				return Q.allSettled( newDomains.map(function(D){
					var domain = new Domain(D);
					var defer  = Q.defer();
					domain.save(function(err){
						if (err) throw new Error(err);
						defer.resolve();
					})
					return defer.promise;
				})).then(function(){ d.resolve(); });
			});
			return d.promise;
		});

	}

	loadDomainFile().then( function(){ return createDomains(); }).then( callback );

}