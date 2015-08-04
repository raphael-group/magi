// Load required modules
var mongoose = require('mongoose'),
Dataset = require( "../model/datasets" ),
Database = require('../model/db'),
Annos = require("../model/annotations"),
PPIs = require("../model/ppis");

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

// Renders account information, including the user's uploaded datasets
exports.account = function(req, res){
	var User = Database.magi.model( 'User' );
	User.findOne({ googleId: req.session.passport.user}, function(err, user) {
		if(err) console.log(err);
		else {
			Dataset.datasetGroups({user_id: user._id}, function(err, groups){
				// Throw error (if necessary)
				if (err) throw new Error(err);

			    // here call to postgres for all annotations:
			    Annos.geneFind({user_id: String(user._id)}, 'left', function(err, geneAnnos) {
				if (err) throw new Error(err);
				PPIs.ppiFind({user_id: String(user._id)}, 'left', function (err, ppiAnnos) {
				    if (err) throw new Error(err);
				    if (ppiAnnos.length > 0) {
					console.log(ppiAnnos[0]);
				    }
				// Render index page
				res.render('account',
					   { user: user,
					     groups: groups,
					     geneAnnos: geneAnnos,
					     ppiAnnos: ppiAnnos,
					     abbrToCancer: abbrToCancer,
					     cancerToAbbr: cancerToAbbr,
					     skip_requery: true});
				});
			    });
			});
		}
	});
}

// Update user
exports.update = function(req, res){
	// Load the posted form
	var User = Database.magi.model( 'User' );

	// Construct the query
	var update = {
			researcherType: req.body.researcherType,
			institution: req.body.institution,
			department: req.body.department,
			newsletter: "newsletter" in req.body,
			other: req.body.other
	};

	// Upsert the user, and reload the account page
	User.findOneAndUpdate({_id: req.user._id}, update, function(err, user) {
		if(err) throw new Error(err);
		res.redirect('/account');
	});
}

// Logs the user out and redirects to the home page
exports.logout = function(req, res){
	req.logout();
	res.redirect('/');
}

// Logs the user out and redirects to the home page
exports.login = function(req, res){
	res.render('login');
}
