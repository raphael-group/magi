// Load required modules
var	mongoose = require( 'mongoose' ),
	formidable = require('formidable'),
	Annotations  = require( "../model/annotations" ),
	PPIs = require( "../model/ppis" ),
	Database = require('../model/db');

// Renders annotations for the given gene
exports.gene = function gene(req, res){
	console.log('/datasets/gene');

	// Parse params
	var gene = req.params.gene || "",
		Annotation = Database.magi.model( 'Annotation' );

	Annotation.find({gene: gene}, function(err, annotations){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Render the view
		res.render('annotations/gene', { user: req.user, annotations: annotations, gene: gene });
	});
}

// Renders annotations for the given cancer
exports.cancer = function cancer(req, res){
	console.log('/datasets/cancer');

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

exports.save = function save(req, res){
	console.log("/save/annotation")

	// Load the posted form
	var form = new formidable.IncomingForm({});

    form.parse(req, function(err, fields, files) {
    	// Parse the form variables into shorter handles
    	var gene = fields.gene,
    		interaction = fields.interaction,
    		interactor = fields.interactor,
    		position = fields.position,
    		mutation_type = fields.mutationType,
    		domainName = fields.domainName,
    		support = fields.support,
    		comment = fields.comment;

		if (req.user){
	    	if (interaction == "interact"){
	    		var source = gene,
	    			target = interactor;
				PPIs.upsertInteraction(source, target, "Community", support, comment, req.user._id + "", function(err){
					if (err) throw new Error(err);
				})
				.then(function(){
					res.send({ status: "Interaction saved successfully!" });
				})
				.fail(function(){
					res.send({ error: "Interaction could not be parsed." });
				});
	    	}
	    	else{
		    	// Add the annotation
		    	var query = {
		    			gene: gene,
		    			cancer: interactor,
		    			mutation_class: interaction,
		    			mutation_type: mutation_type,
		    			position: position,
		    			domain: domainName
		    		};
				Annotations.upsertAnnotation(query, support, comment, req.user._id + "", function(err, annotation){
					if (err){
						res.send({ error: "Annotation could not be parsed. " + err });
						throw new Error(err);
					}
					res.send({ status: "Annotation saved successfully!", annotation: { _id: annotation._id } });
				});
	    	}
	    }
	    else{
	    	res.send({ error: "You must be logged in to annotate." });
	    }
	});

}

// Save a vote on a mutation
exports.mutationVote = function mutationVote(req, res){
	console.log("/vote/mutation")

	// Only allow logged in users to vote
	if (req.user){
		// Load the posted form
		var form = new formidable.IncomingForm({});
	    form.parse(req, function(err, fields, files) {
			// Add the annotation, forcing the user ID to be a string to make finding it in arrays easy
			Annotations.vote(fields, req.user._id + "")
			.then(function(){
				res.send({ status: "Mutation vote saved successfully!" });
			})
			.fail(function(){
				res.send({ error: "Mutation vote could not be parsed." });
			});
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
	if (req.user){
		// Load the posted form
		var form = new formidable.IncomingForm({});
	    form.parse(req, function(err, fields, files) {
			// Add the annotation, forcing the user ID to be a string to make finding it in arrays easy
			PPIs.vote(fields.source, fields.target, fields.network, fields.pmid, fields.vote, req.user._id + "")
			.then(function(){
				res.send({ status: "PPI vote saved successfully!" });
			})
			.fail(function(){
				res.send({ error: "PPI vote could not be parsed." });
			});
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
