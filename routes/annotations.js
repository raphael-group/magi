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
}

exports.updateMutation = function updateMutation(req, res) {
    console.log('/annotation/mutation, id =', req.params.u_id)
    var anno_id = req.params.u_id;
    if (req.user && req.body) {
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
	annotation.geneFind({cancer: { $regex : new RegExp('^' + cancer + '$', 'i') }}, function(err, annotations){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Render the view
		res.render('annotations/cancer', { user: req.user, annotations: annotations, cancer: cancer });
	});
}
