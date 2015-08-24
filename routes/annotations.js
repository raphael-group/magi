// Load required modules
var mongoose = require( 'mongoose' ),
formidable = require('formidable'),
Base_annotations = require( "../model/annotations" ),
Aberrations = require("../model/aberrations"),
PPIs  = require( "../model/ppis" ),
Database = require('../model/db'),
User = require('../model/user'),
Q = require('q');

// Create the tables if they don't exist already
Base_annotations.init()

// on init: create map between cancers and abbrs
var abbrToCancer = {}, cancerToAbbr = {};
Cancer = Database.magi.model( 'Cancer' );

Cancer.find({}, function(err, cancers){
    if (err) throw new Error(err);

    // Make a map of cancers to abbreviations and vice versa
    cancers.forEach(function(c){
	abbrToCancer[c.abbr] = c.cancer;
	cancerToAbbr[c.cancer.toLowerCase()] = c.abbr;
    })
})

// todo: add post route to add genes
// Renders annotations for the given gene
exports.gene = function gene(req, res){
    console.log('/annotations/gene, gene =', req.params.gene);

    // Parse params
    var geneRequested = req.params.gene.toUpperCase() || ""

    Aberrations.geneFind({gene: geneRequested}, 'right', function(err, result) {
	// Throw error (if necessary)
	if (err) throw new Error(err);

	var resolveNames = function(comments) {
	    if (comments.length > 0) {		
		var names = Q.all(comments.map(function (comment) {
		    return User.findById(comment.user_id);
		}));
		console.log("in resolve: names = ", names);
		return names;
	    } else {
		return Q.fcall(function() {return [];});
	    }
	};

	// get all the unique user ids within comments
	uniqueIds = {};
	result.forEach(function(row) {
	    row.upcomments.forEach(function (comment) {
		if (comment.user_id in uniqueIds) {
		    uniqueIds[comment.user_id].push(comment);
		} else {
		    uniqueIds[comment.user_id] = [comment];
		}});
	    row.downcomments.forEach(function (comment) {
		if (comment.user_id in uniqueIds) {
		    uniqueIds[comment.user_id].push(comment);
		} else {
		    uniqueIds[comment.user_id] = [comment];
		}});
	});

	var promises = [];
	for(user_id in uniqueIds) {
	    promises.push(User.findById(user_id)
		.then(function (user) {
		    var theseComments = uniqueIds[user._id];
	 	    console.log("unblocked with user ", user._id);
		    theseComments.forEach(function(comment) {
			comment.user_name = user.name;
		    });
		    console.log("done with ", user._id, ", count = ", theseComments.length);
		    return true;
		}).fail(function (err) {
		    console.log("Error:", err);
		}));
	}

	Q.allSettled(promises).done(function (done_promises) {
	    console.log("ok, rendering...");
	    result.forEach(function(row) {
		if (row.upcomments.length > 0 || row.downcomments.length > 0) {
		    console.log(row.u_id, row.upcomments.concat(row.downcomments));
		}});

	    // Render the view
	    var pkg = {
		user: req.user,
		annotations: result,
		gene: geneRequested,
		abbrToCancer: abbrToCancer,
		cancerToAbbr: cancerToAbbr
	    };
	    res.render('annotations/gene', pkg);
	});
    });
}

exports.saveMutation = function saveMutation(req, res) {
    console.log('/save/annotation/mutation')

    // Load the posted form
    var form = new formidable.IncomingForm({});

    // We ignore this if the user isn't logged in
    if (req.user && req.body){
	// Add the annotation

	// prefer abbreviation to full name given by form
	if (req.body.cancer && req.body.cancer != "undefined" &&
	    req.body.cancer.toLowerCase() in cancerToAbbr) {
	    req.body.cancer = cancerToAbbr[req.body.cancer.toLowerCase()];
	}

	// more direct?
//	query = req.body;

	var query = {
	    gene: req.body.gene,
	    cancer: req.body.cancer,
	    transcript: req.body.transcript,
	    mut_class: req.body.mutationClass,
	    mut_type: req.body.mutationType,
	    protein_seq_change: req.body.change,
	    domain: req.body.domain, // not used: which field should this go in?
	    pmid: req.body.pmid,
	    comment: req.body.comment,
	    user_id: req.user._id + "",
	    source: "Community"
	};

	// TODO: test behavior on attempting to upsert identical annotation?
	Aberrations.upsertAber(query, function(err, annotation){
	    if (err){
		res.send({ error: "Annotation could not be parsed. " + err });
		// todo: handle error: interpret or pass up if critical (no database, no table)
		throw new Error(err);
	    }
	    res.send({ status: "Annotation saved successfully!", annotation: { _id: annotation.u_id } });
	});
    }
    else{
	res.send({ error: "You must be logged in to annotate." });
    }

}

exports.removeMutation = function removeMutation(req, res) {
    console.log("/delete/annotations/mutation/" + req.params.u_id)
    removeAnnotation(req, res)
}

exports.removePpi = function removePpi(req, res) {
    console.log("/delete/annotations/interaction/" + req.params.u_id)
    removeAnnotation(req, res)
}

function removeAnnotation(req, res){
    if (req.user) { // ensure that a user is logged in 
	Base_annotations.annoDelete(req.params.u_id, req.user._id)
	    .then(function() {
		res.send({ status: "Annotation deleted successfully!" });
	    }).fail(function(err) {
		res.send({ error: err });
	    }).done();
    } else {
	console.log("req: " + req)
	res.send({ error: "You must be logged in as the user who annotated the mutation to delte"})
    }
}

// Save a vote on a mutation
// FIXME: link here is not working...
exports.mutationVote = function mutationVote(req, res){
    console.log("/vote/mutation/" + req.body._id)
    // Only allow logged in users to vote
    if (req.isAuthenticated()){
	if (!req.body){
	    res.send({error: 'Empty vote body.'})
	    return;
	}

	// Add the annotation, forcing the user ID to be a string to make finding it in arrays easy
	var action = (req.body.vote == "remove") ? "removed" : "saved";
	Aberrations.vote(req.body, req.user._id + "")
	    .then(function(){
		res.send({ status: "Mutation vote " + action + " successfully!" });
	    })
	    .fail(function(err){
		res.send({ error: "Mutation vote could not be " + action + "." });
	    });
    }
    else{
	res.send({ error: "You must be logged in to vote." });
    }
}

// Save a vote on a PPI
exports.ppiVote = function mutationVote(req, res){
    // Only allow logged in users to vote
    if (req.isAuthenticated()){
	if (!req.body){
	    res.send({error: 'Empty vote body.'})
	    return;
	}

	// Add the annotation, forcing the user ID to be a string to make finding it in arrays easy
	PPIs.vote(req.body, req.user._id + "")
	    .then(function(){
		res.send({ status: "PPI vote saved successfully!" });
	    })
	    .fail(function(){
		res.send({ error: "PPI vote could not be parsed." });
	    });
    }
    else{
	res.send({ error: "You must be logged in to vote." });
    }
}

// Renders annotations for the given cancer
exports.cancer = function cancer(req, res){
    // todo: this route how
	console.log('/annotations/cancer');

	// Parse params
	var cancer = req.params.cancer.split("-").join(" ") || "",
		Annotation = Database.magi.model( 'Annotation' );

	annotation.geneFind({cancer: { $regex : new RegExp('^' + cancer + '$', 'i') }}, function(err, annotations){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Render the view
		res.render('annotations/cancer', { user: req.user, annotations: annotations, cancer: cancer });
	});
}

exports.savePPI = function savePPI(req, res){
	console.log("/save/annotation/ppi")

	if (req.user && req.body){
	    /* fields already in req.body: source, target, pmid, comment */
	    query = req.body;
	    query.anno_source = "Community"
	    query.user_id = req.user._id + ""
	    ppis.upsertPPI(query, function(err, annotation){
		if (err) {
		    res.send({ error: "Interaction could not be parsed." });
		    throw new Error(err)
		}
		res.send({ status: "Interaction saved successfully!" , annotation: { _id: annotation.u_id }});
	    })
	} else {
	    res.send({ error: "You must be logged in to annotate." });
	}
	return;
}
