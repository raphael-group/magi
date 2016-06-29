// Load required modules
var	mongoose = require( 'mongoose' ),
	Database = require('../model/db'),
	Dataset  = require( "../model/datasets" );

// Renders a list of manifests
exports.manifests = function manifests(req, res){
	console.log('/manifests');
	res.render('manifests', { user: req.user });
}

// Renders list of all datasets
exports.index = function index(req, res){
	console.log('/datasets/index')
	// Load all public datasets plus the user's datasets
	if (req.user){
		var query = {$or: [{is_public: true}, {user_id: req.user._id }]}
	} else{
		var query = {is_public: true};
	}

	Dataset.datasetGroups(query, function(err, groups){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Sort the datasets in each group
		groups.forEach(function(g){
			g.datasets = g.datasets.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
		});

		// Append the groupClass public to each group
		// Store the checkbox IDs of all and the public datasets by group
		var userGroups = req.user ? groups.filter(function(g){ return (g.user_id + "") == (req.user._id + ""); }) : [],
			publicGroups = groups.filter(function(g){ return g.is_public; });

		var groupData = [{groups: publicGroups, ty: "public"}];

		if (userGroups.length > 0){
			groupData.push({groups: userGroups, ty: "user"});
		}

		res.render('datasets/index', { user: req.user, groupClasses: groupData });
	});
}

exports.view = function view(req, res){
	// Parse params
	var dbID = req.params.datasetID || "";

	// Retrieve the dataset
	var MongoDataset = Database.magi.model( 'Dataset' ),
		MongoGroup   = Database.magi.model('DatasetGroup');
	MongoDataset.findById(dbID, function(err, db){
		// Throw error (if necessary)
		if (!db || err){
			res.redirect('/datasets');
			return;
		}

		// Check if the dataset is standard, and render it if it is
		// or if the user owns the database (add the "" to make sure)
		// the id is a string and not an ObjectId
		if (!db.is_public && (!req.user || (db.user_id + "") != (req.user._id + ""))){
			res.redirect('/datasets');
		} else {
			if (db.group_id){
				MongoGroup.findById(db.group_id, function(err, group){
					if (err) console.err(err);
					res.render('datasets/view', { user: req.user, db: db, group: group });
				});
			} else{
				res.render('datasets/view', { user: req.user, db: db, group: {} });
			}
		}
	});
}
