// Load required modules
var mongoose = require( 'mongoose' ),
formidable = require('formidable'),
annotations  = require( "../model/annotations_sql" ),
PPIs = require( "../model/ppis" ),
Database = require('../model/db')

// Create the table if it doesn't exist already
annotations.init()

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
    console.log('SQL proxy for: /annotations/gene, gene =', req.params.gene);

    // Parse params
    var geneRequested = req.params.gene.toUpperCase() || ""

    annotations.geneFind({gene: geneRequested}, function(err, result) {
	// Throw error (if necessary)
	if (err) throw new Error(err);

	// todo: check what annotations should look like on return and change render page
	console.log("annotations returned: ", result)

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

exports.saveMutation = function saveMutation(req, res) {
    console.log('SQL proxy for: /save/annotation/mutation')
    
    // Load the posted form
    var form = new formidable.IncomingForm({});

    // We ignore this if the user isn't logged in
    if (req.user && req.body){
	// Add the annotation

	// prefer abbreviation to full name given by form
	if (req.body.cancer != "undefined" &&
	    req.body.cancer.toLowerCase() in cancerToAbbr) {
	    req.body.cancer = cancerToAbbr[req.body.cancer.toLowerCase()];
	}
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
	    user_id: req.user._id,
	    source: "Community"
	};

	// TODO: test behavior on attempting to upsert identical annotation?
	annotations.upsert(query, function(err, annotation){
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

// Save a vote on a mutation
// FIXME: link here is not working...
exports.mutationVote = function mutationVote(req, res){
    // Only allow logged in users to vote
    if (req.isAuthenticated()){
	if (!req.body){
	    res.send({error: 'Empty vote body.'})
	    return;
	}

	// Add the annotation, forcing the user ID to be a string to make finding it in arrays easy
	annotations.vote(req.body, req.user._id + "")
	    .then(function(){
		res.send({ status: "Mutation vote saved successfully!" });
	    })
	    .fail(function(){
		res.send({ error: "Mutation vote could not be parsed." });
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

