// Load required modules
var	mongoose = require( 'mongoose' ),
	formidable = require('formidable'),
	Annotations  = require( "../model/annotations" );

// Renders annotations for the given gene
exports.gene = function gene(req, res){
	console.log('/datasets/gene');

	// Parse params
	var gene = req.params.gene || "",
		Annotation = mongoose.model( 'Annotation' );

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
	var cancer = req.params.cancer || "",
		Annotation = mongoose.model( 'Annotation' );

	cancer = cancer.toLowerCase().split("-").join(" ");
	console.log(cancer)

	Annotation.find({cancer: cancer}, function(err, annotations){
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
    		support = fields.support;

		if (req.user){
	    	if (interaction == "interact"){
	    		res.send({ status: "Interactions not implemented yet." });
	    	}
	    	else{
		    	// Rename the form elements for easy understanding
		    	var cancer = interactor,
		    		mutation_class = interaction;

		    	// Add the annotation
				Annotations.upsertAnnotation(gene, cancer, mutation_class, support, req.user._id, function(err){
					if (err) throw new Error(err);
				})
				.then(function(){
					res.send({ status: "Data uploaded successfully!" });
				})
				.fail(function(){
					res.send({ error: "Data could not be parsed." });
				});
	    	}
	    }
	    else{
	    	res.send({ error: "You must be logged in to annotate." });
	    }
	});

}