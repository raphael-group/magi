// Load required modules
var	mongoose = require( 'mongoose' ),
formidable = require('formidable'),
annotations  = require( "../model/annotations_sql" ),
PPIs = require( "../model/ppis" ),
Database = require('../model/db_sql');

// Create the table if it doesn't exist already
annotations.init()

// Renders annotations for the whole table:
exports.getAll = function gene(req, res) {
    annotations.dumpAll(function(err, result) {
	if(!err) {
	    res.render('annotations/blanktable', result);
	}	
    });
}

// todo: add post route to add genes
// Renders annotations for the given gene
exports.gene = function gene(req, res){
    console.log('/annotations/gene_sql');

    // Parse params
    var gene = req.params.gene.toUpperCase() || ""
    //		Annotation = Database.magi.model( 'Annotation' ),
    //		Cancer = Database.magi.model( 'Cancer' );
    annotations.getAnnotations([gene], function(err, result) {
	if(!err) {
	    res.render('annotations/blanktable', result);
	}
    });
}

exports.addAnnotation = function gene(req, res) {
    console.log('/annotations/gene_sql/add')
    console.log('req:', req)
    console.log('req.body:', req.body)
    
    console.log("proxy for: /save/annotation/mutation")

    // Load the posted form
    var form = new formidable.IncomingForm({});

    // We ignore this if the user isn't logged in
    if (req.user && req.body){
	// Add the annotation
	var query = {
	    gene: req.body.gene,
	    cancer: req.body.cancer,
	    mutation_class: req.body.mutationClass,
	    mutation_type: req.body.mutationType,
	    change: req.body.change,
	    domain: req.body.domain,
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
	    res.send({ status: "Annotation saved successfully!", annotation: { _id: annotation._id } });
	});
    }
    else{
	res.send({ error: "You must be logged in to annotate." });
    }
    // 
}
