// Load required modules
var mongoose = require( 'mongoose' ),
formidable = require('formidable'),
Base_annotations = require( "../model/annotations" ),
Aberrations = require("../model/aberrations"),
PPIs  = require( "../model/ppis" ),
Database = require('../model/db'),
User = require('../model/user'),
Utils = require('../model/util'),
Q = require('q'),
url = require('url');

// Create the tables if they don't exist already
//Base_annotations.init()

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
	// redirect to the annotations site (todo: provide user session and backward reference)
	var redirectURL = req.app.locals.annotationsURL + '/annotations/' + req.params.gene;
    console.log('/annotations/gene, gene =', req.params.gene, ", redirecting to django app at ", redirectURL);
	res.redirect(redirectURL);
};


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
