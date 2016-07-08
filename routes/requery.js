var mongoose = require('mongoose'),
	Dataset  = require( "../model/datasets" ),
	Database = require('../model/db');

exports.queryGetDatasetsAndGenes = function(req, res) {
	function getDatasetResponseData(geneDataCallback) {
		// Load all public datasets plus the user's datasets
		if (req.user){
			var query = {$or: [{is_public: true}, {user_id: req.user._id }]}
		} else{
			var query = {is_public: true};
		}
  		Dataset.datasetGroups(query, function(err, groups, samples){
	  		// Throw error (if necessary)
	  		if (err) throw new Error(err);

	  		// Store the checkbox IDs of all and the public datasets by group
	  		var userGroups = req.user ? groups.filter(function(g){ return g.user_id == req.user._id; }) : [],
	  			publicGroups = groups.filter(function(g){ return g.is_public; }),
	  			publicGroupToDatasets = {},
	  			checkboxes = [];

	  		publicGroups.forEach(function(g){
	  			publicGroupToDatasets[g.name.toLowerCase()] = {};
                checkboxes = checkboxes.concat( g.datasets.map(function(d){ return d._id; }))
	  			g.datasets.forEach(function(d){
	  				publicGroupToDatasets[g.name.toLowerCase()][d.title.toLowerCase()] = d._id;
	  			});
	  		});

    		userGroups.forEach(function(g){
    			checkboxes = checkboxes.concat( g.datasets.map(function(d){ return d._id; }))
    		});

			var responseData = {
				groups: groups,
                publicGroupToDatasets: publicGroupToDatasets,
                checkboxes: checkboxes
			};

			if (req.user){
				// Load the user's recent queries
				var User = Database.magi.model( 'User' );
				User.findById(req.user._id, function(err, user){
					if (err) throw new Error(err);
					responseData.recentQueries = user.queries ? user.queries : [];
					geneDataCallback(responseData, checkboxes);
				});
			} else{
				geneDataCallback(responseData, checkboxes);
			}
        });
	}

  function getGeneResponseData(responseData, dbIdList) {
	var MutGene = Database.magi.model('MutGene');
	MutGene.find({ 'dataset_id' : { $in : dbIdList} })
	  .distinct('gene', function(error, genes) {
		var finalResponseData = {genes: genes, datasets: responseData };

		if(responseData.recentQueries) {
		  finalResponseData.recentQueries = responseData.recentQueries;
		}

		res.send(finalResponseData);
	  });
  }

  getDatasetResponseData(getGeneResponseData);
};


exports.getSessionLatestQuery = function(req, res) {
  var gs = req.session.genes,
	  ds = req.session.datasets;
  res.send({datasets: ds, genes: gs});
};
