// Load required modules
var mongoose = require( 'mongoose' ),
formidable = require('formidable'),
Base_annotations = require( "../model/annotations" ),
Aberrations = require("../model/aberrations"),
PPIs  = require( "../model/ppis" ),
Database = require('../model/db'),
User = require('../model/user'),
Utils = require('../model/util'),
Q = require('q');

// Create the tables if they don't exist already
Base_annotations.init()

// on init: create map between cancers and abbrs
var abbrToCancer = {}, cancerToAbbr = {};
var anonymizeIds = true;

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

	// calculate the mode of each aberration
	var cols = ["cancer", "is_germline", "measurement_type", "characterization"];
	result.forEach(function (aber) {
	    cols.forEach(function(col) {
		aber[col + "_mode"] =
		    Utils.getMode(aber.sourceAnnos.map(function(c) {return c[col];}));
	    });
	});
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
}

exports.mutation = function mutation(req, res) {
    console.log('/annotation/mutation, id =', req.params.u_id)
    var anno_id = req.params.u_id;
    Aberrations.geneFind({u_id: anno_id}, 'right', function(err, result) {
	// Throw error (if necessary)
	if (err) throw new Error(err);
	else if (!result || result.length == 0) {
	    res.render('annotations/mutation', {
				error: 'No such annotation',
				annotation_id: anno_id
		});
	    return;
	}
	var single_anno = result[0];
	var pkg = {
	    user: req.user,
	    annotation: single_anno,
	    abbrToCancer: abbrToCancer,
	    cancerToAbbr: cancerToAbbr
	};
	res.render('annotations/mutation', pkg);
    });
};

exports.updateMutation = function updateMutation(req, res) {
    console.log('update /annotation/mutation, id =', req.params.u_id)
    var anno_id = req.params.u_id;
    if (req.user && req.body) {
	console.log("adding: ", req.body);
	Aberrations.update(req.body, function(err, result) {
	    // Throw error (if necessary)
	    if (err) {
		res.send({ error: "Annotation could not be updated. " + err });
		// todo: handle error: interpret or pass up if critical (no database, no table)
		throw new Error(err);
	    }
	    res.send({ status: "Annotation updated successfully!", annotation: { _id: anno_id } });
	});
    } else {
	res.send({ error: "You must be logged in to update annotations." });
    }

};

exports.saveMutation = function saveMutation(req, res) {
    console.log('save /annotation/mutation')

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
	    if (err) {
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

// remove a source annotation
exports.removeSourceAnno = function removeMutation(req, res) {
    console.log("/annotation/mutation/" + req.params.aber_id + "/source/" + req.params.source_id)
    if (req.user) { // ensure that a user is logged in
	console.log("user logged in");
	Aberrations.deleteSourceAnno({'aber_id': req.params.aber_id,
				      'asa_u_id': req.params.source_id})
	    .then(function() {
		res.send({ status: "Annotation deleted successfully!" });
	    }).fail(function(err) {
		res.send({ error: err});
	    }).done();
    } else {
	res.send({ error: "You must be logged in as the user who annotated the mutation to delete"})
    }
}

exports.removeMutation = function removeMutation(req, res) {
    console.log("delete /annotation/mutation/" + req.params.u_id)
    removeAnnotation(req, res)
}

exports.removePpi = function removePpi(req, res) {
    console.log("/annotation/interaction/" + req.params.u_id)
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
	res.send({ error: "You must be logged in as the user who annotated the mutation to delete"})
    }
}

// Save a vote on a mutation
// FIXME: link here is not working...
exports.mutationVote = function mutationVote(req, res){
    console.log("/vote/mutation/");
    // Only allow logged in users to vote
    if (req.isAuthenticated()){
	if (!req.body){
	    res.send({error: 'Empty vote body.'})
	    return;
	}

	var data = req.body;
	data.user_id = String(req.user._id);
	Object.keys(data).forEach(function (field) {
	    if (data[field] === 'null') data[field]=undefined;
	}); // fixme: not sure why this isn't translated outside...
	Aberrations.upsertSourceAnno(data, function(err, result) {
	    if(err){
		res.send({ error: "Source annotation could not be committed" });
	    } else {
		res.send({ status: "Source annotation saved successfully!" });
	    }
	});
    }
    else {
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

exports.savePpi = function savePpi(req, res){
	console.log("/annotation/interaction")

	if (req.user && req.body){
	    /* fields already in req.body: source, target, pmid, comment */
	    query = req.body;
	    query.anno_source = "Community"
	    query.user_id = req.user._id + ""
	    PPIs.upsertPPI(query, function(err, annotation){
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
