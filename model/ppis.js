// Import required modules
var mongoose = require( 'mongoose' ),
    Database = require('./db');

// Create PPI schema and add it to Mongoose
var PPISchema = new mongoose.Schema({
	source: String,
	target: String,
	weight: Number,
	network: String,
	references: { type: Array, required: false},
	support: { type: Array, required: false}
});

Database.magi.model( 'PPI', PPISchema );

// Create PPI schema and add it to Mongoose
var PPIVoteSchema = new mongoose.Schema({
	user_id: { type: mongoose.Schema.Types.ObjectId, required: true},
	ppi_id: { type: mongoose.Schema.Types.ObjectId, required: true},
	pmid: String,
	comment: String,
	vote: String
});

Database.magi.model( 'PPIVote', PPIVoteSchema );

// A function for listing all the interactions for a particular gene
exports.ppilist = function ppilist(genes, callback){
	var PPI = Database.magi.model( 'PPI' );
	PPI.find({source: { $in: genes }, target: { $in: genes } }, function (err, ppis) {
  		if(err) console.log(err);
  		else callback("", ppis);
	})// end PPI.find
}// end exports.ppilist

// Create a dictionary of all the comments a user has made on a set of PPIs
exports.ppicomments = function ppicomments(ppis, user_id, callback){
	// Define the models
	var PPI = Database.magi.model( 'PPI' ),
		PPIVote = Database.magi.model( 'PPIVote' );

	// Create a map of IDs to PPIs and initialize the dictionary of comments
	// with blank comments for each PPI's references
	var idToPPI = {},
		comments = {};
	ppis.forEach(function(ppi){
		idToPPI[ppi._id] = ppi;
		// Sort the names so we don't have to copy the data twice
		var sortedNames = [ppi.source, ppi.target].sort(),
			source= sortedNames[0],
			target = sortedNames[1];

		if (!(source in comments)) comments[source] = {};
		if (!(target in comments[source])) comments[source][target] = {};
		if (!(ppi.network in comments[source][target])) comments[source][target][ppi.network] = {};
		ppi.references.forEach(function(ref){
			comments[source][target][ppi.network][ref.pmid] = "";
		})
	});

	// Find all the user's votes about these PPIs
	var ppiIDs = ppis.map(function(ppi){ return ppi._id; });
	PPIVote.find({user_id: user_id, ppi_id: {$in: ppiIDs} }, function (err, votes) {
  		if(err) console.log(err);
  		
  		// Iterate through the votes
  		votes.forEach(function(vote){
  			if (vote.comment){
  				ppi = idToPPI[vote.ppi_id];
	  			comments[ppi.source][ppi.target][ppi.network][vote.pmid] = vote.comment;
	  		}
  		});

  		// Execute the callback
  		callback("", comments);

	})// end PPIVote.find
}// end exports.ppicomments

// upsert an interaction
exports.upsertInteraction = function(source, target, network, ref, comment, user_id, callback){
	var PPI = Database.magi.model( 'PPI' );
		Q = require( 'q' );

	var d = Q.defer();

	PPI.findOneAndUpdate(
		{source: source, target: target, network: network},
		{$push: {support: {pmid: ref, comment: comment, user_id: user_id}}},
		{safe: true, upsert: true},
		function(err, ppi) {
			// throw error if necessary
			if (err) throw new Error(err);

			// Determine if this reference already exists			
			var inReferences = false;
			ppi.references.forEach(function(d){
				if (d.ref == ref) inReferences = true;
			});

			// Save the reference if it hasn't already been saved
			if (!inReferences){
				ppi.references.push( {pmid: ref, upvotes: [], downvotes: [], annotation: true})
	
				// Save the PPI
				ppi.save(function(err, model){
					console.log(err);
					d.resolve();
				});
			}
			else{
				d.resolve();
			}

		}
	);

	return d.promise;
}

// Record a user's vote for an interaction
exports.vote = function ppiVote(source, target, network, pmid, vote, user_id){
	// Set up the promise
	var PPI = Database.magi.model( 'PPI' ),
		PPIVote = Database.magi.model( 'PPIVote' ),
		Q = require( 'q' ),
		d = Q.defer();

	//Create and execute the query
	var query = {
		source: {$in: [source, target]},
		target: {$in: [source, target]},
		network: network
	};
	PPI.findOne(query, function(err, ppi){
		// Throw error and resolve if necessary
		if (err){
			throw new Error(err);
			d.resolve();
		}

		// Update the vote for the reference
		var userVote;
		ppi.references.forEach(function(ref){
			if (ref.pmid == pmid){
				var upIndex = ref.upvotes.indexOf( user_id ),
					downIndex = ref.downvotes.indexOf( user_id );
				if (vote == "up"){
					if (upIndex == -1) ref.upvotes.push( user_id );
					else ref.upvotes.splice(upIndex, 1);
					if (downIndex != -1) ref.downvotes.splice(downIndex, 1);
				}
				else if (vote == "down"){
					if (downIndex == -1) ref.downvotes.push( user_id );
					else ref.downvotes.splice(downIndex, 1);
					if (upIndex != -1) ref.upvotes.splice(upIndex, 1);
				}
				ppi.markModified('references');
				userVote = ref.upvotes.indexOf( user_id ) != -1 ? "up" : ref.downvotes.indexOf( user_id ) != -1 ? "down" : "none";
			}
		})

		// Then save the PPI
		ppi.save(function(err){
			if (err) throw new Error(err);

			// Update the user's vote
			var query = { user_id: user_id, ppi_id: ppi._id, pmid: pmid };
			if (userVote == "none"){
				PPIVote.remove(query, function(err){
					if (err) throw new Error(err);
					d.resolve();
				});
			}
			else{
				PPIVote.update(query, { vote: vote }, {upsert: true}, function(err){
					if (err) throw new Error(err);
					d.resolve();
				});
			}			
		});
	});

	return d.promise;
}

exports.comment = function ppiComment(source, target, network, pmid, comment, user_id){
	// Set up the promise
	var PPI = Database.magi.model( 'PPI' ),
		PPIVote = Database.magi.model( 'PPIVote' ),
		Q = require( 'q' ),
		d = Q.defer();

	//Create and execute the query
	var query = {
		source: {$in: [source, target]},
		target: {$in: [source, target]},
		network: network
	};

	PPI.findOne(query, function(err, ppi){
		// Throw error and resolve if necessary
		if (err){
			throw new Error(err);
			d.resolve();
		}

		// Update the user's comment on this particular interaction
		var query = { user_id: user_id, ppi_id: ppi._id, pmid: pmid };
		PPIVote.update(query, { comment: comment }, function(err){
			if (err) throw new Error(err);
			d.resolve();
		});
	});

	return d.promise;
}

// Format PPIs for gd3
exports.formatPPIs = function formatPPIs(ppis, user_id, callback){
	var edgeNames = {};
	for (var i = 0; i < ppis.length; i++){
		// Parse interaction and create unique ID
		var ppi   = ppis[i],
			ppiName = [ppi.source, ppi.target].sort().join("*");

		// Append the current network for the given edge
		if (ppiName in edgeNames){
			edgeNames[ppiName].push( {name: ppi.network, refs: ppi.references } );
		}
		else{
			edgeNames[ppiName] = [ {name: ppi.network, refs: ppi.references } ];
		}
	}

	// Create edges array by splitting edgeNames
	var edges = [],
		refs = {};
	for (var edgeName in edgeNames){
		var  arr   = edgeName.split("*"),
			source   = arr[0],
			target   = arr[1],
			networks = edgeNames[edgeName].map(function(d){ return d.name; });
		
		// Create a map of each network to its references
		var references = {};
		networks.forEach(function(n){ references[n] = []; });
		edgeNames[edgeName].forEach(function(d){
			references[d.name] = references[d.name].concat( d.refs );
		});

		// Update the map of each network's edge's references to
		// its votes and whether or not it was voted for by the current user
		networks.forEach(function(n){
			// Initialize the hashs for each component of this edge (if necessary)
			if (!(n in refs)) refs[n] = {};
			if (!(source in refs[n])) refs[n][source] = {};
			if (!(target in refs[n][source])) refs[n][source][target] = {};

			references[n].forEach(function(ref){
				// Record the score
				var score = ref.upvotes.length - ref.downvotes.length;
				refs[n][source][target][ref.pmid] = { vote: null, score: score };

				//  Record the user's vote for the current reference (if neccessary)
				if (user_id && ref.upvotes.indexOf(user_id) != -1){
					refs[n][source][target][ref.pmid].vote = "up";
				}
				else if (user_id && ref.downvotes.indexOf(user_id) != -1){
					refs[n][source][target][ref.pmid].vote = "down";
				}
			});
		});

		edges.push({ source: source, target: target, weight: 1, networks: networks, references: references });
	}

	// Execute callback
	callback("", edges, refs);

}

// Loads a PPI into the database
exports.insertNetworkFromFile = function(filename, callback){
	// Load required modules
	var fs = require( 'fs' )
		PPI = Database.magi.model( 'PPI' ),
		Q  = require( 'q' );

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
			var fields = lines[i].split('\t'),
				ppiData  = {
								source: fields[0],
								target: fields[1],
								weight: fields[2],
								network: fields[3],
								references: fields[4] ? fields[4].split(",") : []
							};

			// Create objects for each reference that store the fact that these
			// are "official" references and currently have no votes
			ppiData.references = ppiData.references.map(function(r){
				return { pmid: r, annotation: false, upvotes: [], downvotes: []}
			});

			// Save the interaction
			interactions.push( ppiData );
		}
		console.log( "Loaded " + interactions.length + " interactions." )

		///////////////////////////////////////////////////////////////////////
		// Save all the interactions in batches
		function savePPIs(start, end){
			var d = Q.defer();
			PPI.create(interactions.slice(start, end), function(err){
				if (err) throw new Error(err);
				d.resolve();
			});
			return d.promise;
		}

		// Split the interactions into different bins, and save them sequentially
		var funcs = [],
			increment = 10000;

		for (var i = 1; i < interactions.length / 10000; i++){
			var start = i * increment,
				end = Math.min(interactions.length, (i+1)*increment);
			funcs.push( savePPIs(start, end) );
		}
		return funcs.reduce(Q.when, savePPIs(0, Math.min(interactions.length, increment)));

	}

	loadPPIFile().then( processPPIs ).then( function(){ callback("") } );
}