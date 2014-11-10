// Import required modules
var mongoose = require( 'mongoose' ),
    Database = require('./db'),
    Genome = require('./genome');

// Create PPI schema and add it to Mongoose
var GeneSchema = new mongoose.Schema({
	start: Number,
	end: Number,
	chr: String,
	name: String
});

Database.magi.model( 'Gene', GeneSchema );

exports.addCNARegionData = function(genes, callback){
	var Gene = Database.magi.model( 'Gene' ),
		Q = require( 'q' );
		regions = {};

	Gene.find({name: {$in: genes}}, function (err, genes){
		Q.allSettled(
			genes.map(function(g){
				var d = Q.defer(),
					minX = g.start - 1000000, // return genes within 1Mb
					maxX = g.end + 1000000;
				Genome.getGenesinRange(g.chr, minX, maxX, function (err, neighbors){
					if(err) console.log(err);
					var datum = {gene: g.name, segments: [], neighbors: neighbors};
					datum.region = {chr: g.chr, minSegX: minX, maxSegX: maxX};
					regions[g.name] = datum;
					d.resolve();
				});
				return d.promise;
			})
		).then(function(){ callback("", regions); });
	});
}

exports.getGenesinRange = function(chr, start, end, callback){
	var Gene = Database.magi.model( 'Gene' );
	Gene.find({chr: chr, start: { $gt: start }, end: {$lt: end} }, function (err, neighbors) {
  		if(err) console.log(err);
  		else callback("", neighbors);
	})// end Gene.find

}

exports.loadGenomeFromFile = function(filename, callback){
	// Load required modules
	var fs = require( 'fs' ),
		Gene = Database.magi.model( 'Gene' ),
		Q = require( 'q' );

	// Read in the file asynchronously
	var data;
	function loadGenomeFile(){
		var d = Q.defer();
		fs.readFile(filename, 'utf-8', function (err, fileData) {
			// Exit if there's an error, else callback
			if (err) console.log(err)
			d.resolve();
			data = fileData;
		});
		return d.promise;
	}

	function addGenes(){
		// Load the lines, but skip the header (the first line)
		var lines = data.trim().split('\n');

		// Make sure there're some lines in the file
		if (lines.length < 2){
			console.log("Empty file (or just header). Exiting.")
			process.exit(1);
		}

		// Create objects to represent each interaction
		var genes = [];
		for (var i = 1; i < lines.length; i++){
			// Parse the line
			var fields = lines[i].split('\t'),
				geneData = {name: fields[0], chr: fields[1],
						    start: fields[2], end: fields[3] };

			// Save the interaction
			genes.push( geneData );
		}
		console.log( "Loaded " + genes.length + " genes." )

		// Save all the interactions
		return Q.allSettled( genes.map(function(g){
			var d = Q.defer();
			Gene.create(g, function(err){
				if (err) throw new Error(err);
				d.resolve();
			})
			return d.promise;
		}));
	}

	loadGenomeFile().then( addGenes ).then( function(){ callback("") } );
}