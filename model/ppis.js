// Import required modules
var mongoose = require( 'mongoose' );

// Create PPI schema and add it to Mongoose
var PPISchema = new mongoose.Schema({
	source: String,
	target: String,
	weight: Number,
	network: String,
	reference: String
});

mongoose.model( 'PPI', PPISchema );

// A function for listing all the interactions for a particular gene
exports.ppilist = function ppilist(genes, callback){
	var PPI = mongoose.model( 'PPI' );
	PPI.find({source: { $in: genes }, target: { $in: genes } }, function (err, ppis) {
  		if(err) console.log(err);
  		else callback("", ppis);
	})// end PPI.find
}// end exports.ppilist

// Format PPIs for gd3
exports.formatPPIs = function formatPPIs(ppis, callback){
	var edgeNames = {};
	for (var i = 0; i < ppis.length; i++){
		// Parse interaction and create unique ID
		var ppi   = ppis[i]
		, ppiName = [ppi.source, ppi.target].sort().join("*");

		// Append the current network for the given edge
		if (ppiName in edgeNames)
		edgeNames[ppiName].push( ppi.network );
		else
		edgeNames[ppiName] = [ ppi.network ];
	}

	// Create edges array by splitting edgeNames
	var edges = [];
	for (var edgeName in edgeNames){
		var  arr   = edgeName.split("*")
		, source   = arr[0]
		, target   = arr[1]
		, networks = edgeNames[edgeName];

		edges.push({ source: source, target: target, weight: 1, networks: networks });
	}

	// Execute callback
	callback("", edges);

}

// Loads a PPI into the database
exports.insertNetworkFromFile = function(filename, callback){
	// Load required modules
	var fs = require( 'fs' )
	, PPI  = mongoose.model( 'PPI' )
	, Q    = require( 'q' );

	// Read in the file asynchronously
	var data;
	function loadPPIFile(){	
		var d = Q.defer();
		fs.readFile(filename, 'utf-8', function (err, fileData) {
			// Exit if there's an error, else callback
			if (err) console.log(err)
			d.resolve();
			data = fileData;
		});
		return d.promise;
	}

	function processPPIs(){
		// Load the lines, but skip the header (the first line)
		var lines = data.trim().split('\n');

		// Make sure there're some lines in the file
		if (lines.length < 2){
			console.log("Empty file (or just header). Exiting.")
			process.exit(1);
		}

		// Create objects to represent each interaction
		var interactions = [];
		for (var i = 1; i < lines.length; i++){
			// Parse the line
			var fields = lines[i].split('\t')
			, ppiData  = {source: fields[0], target: fields[1], weight: fields[2],
						  network: fields[3], reference: fields[4] };

			// Save the interaction
			interactions.push( ppiData );
		}
		console.log( "Loaded " + interactions.length + " interactions." )

		// Save all the interactions
		return Q.allSettled( interactions.map(function(ppi){
			var d = Q.defer();
			PPI.create(ppi, function(err){
				if (err) throw new Error(err);
				d.resolve();
			})
			return d.promise;
		}));
	}

	loadPPIFile().then( processPPIs ).then( function(){ callback("") } );
}