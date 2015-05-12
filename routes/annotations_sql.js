// Load required modules
var mongoose = require( 'mongoose' ),
formidable = require('formidable'),
annotations  = require( "../model/annotations_sql" ),
PPIs = require( "../model/ppis" ),
Database = require('../model/db')

// Create the table if it doesn't exist already
annotations.init()

// todo: add post route to add genes
// Renders annotations for the given gene
exports.gene = function gene(req, res){
    console.log('SQL proxy for: /annotations/gene, gene =', req.params.gene);

    // Parse params
    var geneRequested = req.params.gene.toUpperCase() || "",
    Cancer = Database.magi.model( 'Cancer' );

    annotations.geneFind({gene: geneRequested}, function(err, result) {
	// Throw error (if necessary)
	if (err) throw new Error(err);

	// todo: check what annotations should look like on return and change render page
	console.log("annotations returned: ", result)
	Cancer.find({}, function(err, cancers){
	    if (err) throw new Error(err);
	    
	    // Make a map of cancers to abbreviations and vice versa
	    var abbrToCancer = {},
	    cancerToAbbr = {};
	    cancers.forEach(function(c){
		abbrToCancer[c.abbr] = c.cancer;
		cancerToAbbr[c.cancer.toLowerCase()] = c.abbr;
	    })

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
    console.log('SQL proxy for: /save/annotation/mutation')
    
    // Load the posted form
    var form = new formidable.IncomingForm({});

    // We ignore this if the user isn't logged in
    if (req.user && req.body){
	// Add the annotation
	var query = {
	    gene: req.body.gene,
	    cancer: req.body.cancer, // not used
	    mutation_class: req.body.mutationClass,
	    mutation_type: req.body.mutationType,
	    change: req.body.change,
	    domain: req.body.domain, // not used
	    pmid: req.body.pmid,
	    comment: req.body.comment,
	    user_id: req.user._id,
	    source: "Community"
	};

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
    // 
}
