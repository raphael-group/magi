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
