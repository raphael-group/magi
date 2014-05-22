// Routes for the view
exports.view  = function view(req, res){
	console.log('view');
	res.render('view', {user: req.user});
}