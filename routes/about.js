// Route for the terms page
exports.terms  = function terms(req, res){
	console.log('/terms')
	res.render('terms', {user: req.user});
}

// Route for the contact page
exports.contact  = function contact(req, res){
	console.log('/contact')
	res.render('contact', {user: req.user});
}

// Route for the support page
exports.support  = function support(req, res){
	console.log('/support')
	res.render('support', {user: req.user});
}

// Route for the privacy page
exports.privacy  = function privacy(req, res){
	console.log('/privacy')
	res.render('privacy', {user: req.user});
}

// Route for the acknowledgements page
exports.acknowledgements  = function privacy(req, res){
	console.log('/acknowledgements')
	res.render('acknowledgements', {user: req.user});
}

// Route for the abbreviations page
exports.abbreviations  = function privacy(req, res){
	console.log('/abbreviations')

	// Load the abbreviations from the database
	var	mongoose = require( 'mongoose' ),
		Cancers  = require( "../model/cancers" ),
		Cancer = mongoose.model( 'Cancer' );
	
	Cancer.find({}, function(err, cancers){
		if (err) throw new Error(err);
		cancers.sort(function(a, b){ return a.cancer > b.cancer ? 1 : -1; });
		res.render('abbreviations', {user: req.user, cancers: cancers });
	});
}
