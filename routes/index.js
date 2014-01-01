// Main routes
var dataset = require( "../model/datasets" );

exports.index = function index(req, res){
	dataset.datasetGroups(function(err, groups){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Render index page
		res.render('index', { groups: groups });

	});
}

exports.queryhandler = function queryhandler(req, res){
	// Parse params
	var genes = req.body.genes || "";

	/* Extract datasets */
	// Dataset checkboxes are prepended with db- to ensure no starts their
	// dataset name with a non-letter (which would break HTML rules)
	var checkedDatasets = Object.keys( req.body).filter(function(n){
		return n.substr(0, 3) == 'db-'
	});

	// Extract the true dataset title from the names
	var datasets = checkedDatasets.map(function(n){return n.split("db-")[1]; });

	// Split genes up
	genes = genes.replace(/(\r\n|\n|\r)/gm, "-");

	// Make query string
	var querystring = require( 'querystring' )
	, query = querystring.stringify( {genes: genes, datasets: datasets.join("-") } )

	// Redirect to view
    res.redirect('/view#!/?' + query);

}

exports.view  = function view(req, res){
	res.render('view');
}

exports.partials =  function partials(req, res){
	console.log( req.params.name );
	var name = req.params.name;
	res.render('partials/' + name);
}

// Subroutes
exports.bundler = require('./bundler');

