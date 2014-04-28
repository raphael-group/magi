// Load required modules
var mongoose = require('mongoose'),
	Dataset = require( "../model/datasets" );

// Renders account information, including the user's uploaded datasets
exports.account = function(req, res){
	var User = mongoose.model( 'User' );
	User.findOne({ googleId: req.session.passport.user}, function(err, user) {
		if(err) console.log(err);
		else {
			Dataset.datasetGroups({user_id: user._id}, function(err, groups){
				// Throw error (if necessary)
				if (err) throw new Error(err);

				// Render index page
				res.render('account', { user: user, groups: groups });

			});
		};
	});
}

// Update user
exports.update = function(req, res){
	// Load the posted form
	var User = mongoose.model( 'User' );

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