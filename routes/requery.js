var mongoose = require('mongoose'),
    Dataset  = require( "../model/datasets" ),
    Database = require('../model/db');

exports.queryGetDatasetsAndGenes = function(req, res) {
  function getDatasetResponseData(geneDataCallback) {
    Dataset.datasetGroups({is_public: true}, function(err, standardGroups){
      if (err) throw new Error(err);

      // Process the groups of datasets and assign each dataset a unique
      // checkbox ID

      // Store the checkbox IDs of all and the public datasets by group
      var datasetToCheckboxes = { all: [] },
          datasetDeselect = [],
          samples = [],
          dbIdList = [];

      // Fn to create a group of datasets for a dropdown multiselect
      // e.g., food multiselect -> [ sandwiches -> [pbj, blt], juices -> [oj] ]
      function initDatasetGroup(groups, scope) {
        // Assign each group a scope (public/private), and sort the dbs
        groups.forEach(function(g){ g.groupClass = scope; });
        groups.forEach(function(g){
          g.dbs = g.dbs.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
        });

        // Assign each dataset a checkbox ID
        groups.forEach(function(g){
          var groupName = g.name === null || g.name === "" ? "other" : g.name.toLowerCase();
          if (scope == "public") datasetToCheckboxes[groupName] = [];

          // Generate a hash ID provided dataset id, scope, title, and name
          function toCheckboxValue(_id, scope, title, gName){
            return ["db", scope, gName, title, _id].join(" ");
          }
          g.dbs.forEach(function(db) {
            // add each dataset id to a list for quick lookup
            dbIdList.push(db._id);

            // Determine the hash and push it to the list of all hashes
            datasetToCheckboxes.all.push( db.checkboxValue = toCheckboxValue(db._id, scope, db.title, groupName) );
            if (scope == "public"){
              datasetToCheckboxes[groupName].push( db.checkboxValue );
              if (groupName == "tcga pan-cancer" && db.title == "GBM"){
                datasetToCheckboxes.gbm = [ db.checkboxValue ];
              } else if (groupName == "tcga publications"){
                datasetDeselect.push( db.checkboxValue );
              }
            }
          });
        });
      }

      initDatasetGroup(standardGroups, 'public');

      var responseData = {
        groups: standardGroups,
        datasetToCheckboxes: datasetToCheckboxes,
        datasetDeselect: datasetDeselect
      };
      // Load the user's datasets (if necessary)
      if (req.user){
        Dataset.datasetGroups({user_id: req.user._id}, function(err, userGroups){
          if (err) throw new Error(err);

          // Append the groupClass standard to each group
          initDatasetGroup( userGroups, 'private' );
          responseData.groups = responseData.groups.concat(userGroups);

          // Load the user's recent queries
          var User = Database.magi.model( 'User' );
          User.findById(req.user._id, function(err, user){
            if (err) throw new Error(err);
            responseData.recentQueries = user.queries ? user.queries : [];
            geneDataCallback(responseData, dbIdList);
          });
        });
      } else {
        geneDataCallback(responseData, dbIdList);
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
