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
	console.log('/annotations/add_gene')
	
	// 
}
