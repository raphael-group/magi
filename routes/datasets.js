// Load required modules
var	mongoose = require( 'mongoose' ),
	Dataset  = require( "../model/datasets" );

// Renders list of all datasets
exports.index = function index(req, res){
	console.log('/datasets/index')
	Dataset.datasetGroups({is_standard: true}, function(err, standardGroups){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Append the groupClass standard to each group
		standardGroups.forEach(function(g){ g.groupClass = "standard"; })
		standardGroups.forEach(function(g){
			g.dbs = g.dbs.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
		});


		// Load the user's datasets (if necessary)
		if (req.user){
			Dataset.datasetGroups({user_id: req.user._id}, function(err, userGroups){
				// Throw error (if necessary)
				if (err) throw new Error(err);

				// Append the groupClass standard to each group
				userGroups.forEach(function(g){ g.groupClass = "user"; });
				userGroups.forEach(function(g){
					g.dbs = g.dbs.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
				});

				res.render('datasets/index', { user: req.user, groups: userGroups.concat(standardGroups) });
			});
		}
		else{
			res.render('datasets/index', { user: req.user, groups: standardGroups });
		}
	});
}

exports.view = function view(req, res){
	// Parse params
	var dbID = req.params.datasetID || "";

	// Retrieve the dataset
	var MongoDataset = mongoose.model( 'Dataset' );
	MongoDataset.findById(dbID, function(err, db){
		// Throw error (if necessary)
		if (err){
			res.redirect('/datasets');
			return;
		}

		// Check if the dataset is standard, and render it if it is
		if (db.is_standard || db.user_id == req.user._id){
			res.render('datasets/view', { user: req.user, db: db });
		}
		else{
			res.redirect('/datasets');
		}
	});
}