// Load required modules
var	mongoose = require( 'mongoose' ),
	formidable = require('formidable'),
	Annotations  = require( "../model/annotations" ),
	PPIs = require( "../model/ppis" ),
	Database = require('../model/db');

// Renders annotations for the given gene
exports.gene = function gene(req, res){
	console.log('/annotations/gene');

	// Parse params
	var gene = req.params.gene || "",
		Annotation = Database.magi.model( 'Annotation' );

	Annotation.find({gene: {$in: [gene]}}, function(err, support){
		// Throw error (if necessary)
		if (err) throw new Error(err);
		var annotations = Annotations.geneTable([gene], support)[gene][''],
			geneTable = annotations.refs,
			count = annotations.count;

		// Render the view
		res.render('annotations/gene', { user: req.user, count: count, geneTable: geneTable, gene: gene });
	});
}

// Renders annotations for the given cancer
exports.cancer = function cancer(req, res){
	console.log('/annotations/cancer');

	// Parse params
	var cancer = req.params.cancer.split("-").join(" ") || "",
		Annotation = Database.magi.model( 'Annotation' );

	Annotation.find({cancer: { $regex : new RegExp('^' + cancer + '$', 'i') }}, function(err, annotations){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Render the view
		res.render('annotations/cancer', { user: req.user, annotations: annotations, cancer: cancer });
	});
}

exports.savePPI = function savePPI(req, res){
	console.log("/save/annotation/ppi")

	if (req.user && req.body){
		PPIs.upsertInteraction(req.body.source, req.body.target, "Community", req.body.pmid,
							   req.body.comment, req.user._id + "", function(err){
			if (err) throw new Error(err);
		})
		.then(function(){
			res.send({ status: "Interaction saved successfully!" });
		})
		.fail(function(){
			console.log("FAIL")
			res.send({ error: "Interaction could not be parsed." });
		});
	}
	return;
}

exports.saveMutation = function saveMutation(req, res){
	console.log("/save/annotation/mutation")

	// Load the posted form
	var form = new formidable.IncomingForm({});

	// We ignore this if the user isn't logged in
	if (req.user && req.body){
		// Add the annotation
		var query = {
				gene: req.body.gene,
				cancer: req.body.cancer,
				mutation_class: req.body.aberration,
				mutation_type: req.body.mutation,
				change: req.body.locus,
				domain: req.body.domain
			};

		Annotations.upsertAnnotation(query, req.body.pmid, req.body.comment, req.user._id + "", function(err, annotation){
			if (err){
				res.send({ error: "Annotation could not be parsed. " + err });
				throw new Error(err);
			}
			res.send({ status: "Annotation saved successfully!", annotation: { _id: annotation._id } });
		});
	}
	else{
		res.send({ error: "You must be logged in to annotate." });
	}
}

// Save a vote on a mutation
exports.mutationVote = function mutationVote(req, res){
	console.log("/vote/mutation")

	// Only allow logged in users to vote
	if (req.user && req.body){
		// Add the annotation, forcing the user ID to be a string to make finding it in arrays easy
		Annotations.vote(req.body, req.user._id + "")
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

// Save a vote on a PPI
exports.ppiVote = function ppiVote(req, res){
	console.log("/vote/ppi")

	// Only allow logged in users to vote
	if (req.user && req.body){
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

// Save a comment on a PPI
exports.ppiComment = function ppiComment(req, res){
	console.log("/comment/ppi")

	// Only allow logged in users to vote
	if (req.user){
		// Load the posted form
		var form = new formidable.IncomingForm({});
		form.parse(req, function(err, fields, files) {
			// Add the annotation, forcing the user ID to be a string to make finding it in arrays easy
			PPIs.comment(fields.source, fields.target, fields.network, fields.pmid, fields.comment, req.user._id + "")
			.then(function(){
				res.send({ status: "PPI comment saved successfully!" });
			})
			.fail(function(){
				res.send({ error: "PPI comment could not be parsed." });
			});
		});
	}
	else{
		res.send({ error: "You must be logged in to vote." });
	}
}
