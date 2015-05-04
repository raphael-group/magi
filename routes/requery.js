var mongoose = require('mongoose'), 
    Dataset  = require( "../model/datasets" ),
    Database = require('../model/db');

exports.getDatasets = function(req, res) {
  Dataset.datasetGroups({is_public: true}, function(err, standardGroups){
    // Throw error (if necessary)
    if (err) throw new Error(err);

    ///////////////////////////////////////////////////////////////////////
    // Process the groups of datasets and assign each dataset a unique
    // checkbox ID

    // Store the checkbox IDs of all and the public datasets by group
    var datasetToCheckboxes = { all: [] },
      datasetDeselect = [],
      samples = [];

    function toCheckboxValue(_id, scope, title, gName){
      return ["db", scope, gName, title, _id].join(" ");
    }
    function initGroup(groups, scope) {
      // Assign each group a scope (public/private), and sort the dbs
      groups.forEach(function(g){ g.groupClass = scope; })
      groups.forEach(function(g){
        g.dbs = g.dbs.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
      });

      // Assign each dataset a checkbox ID
      groups.forEach(function(g){
        var groupName = g.name == "" ? "other" : g.name.toLowerCase();
        if (scope == "public") datasetToCheckboxes[groupName] = [];
        g.dbs.forEach(function(db){
          datasetToCheckboxes.all.push( db.checkboxValue = toCheckboxValue(db._id, scope, db.title, groupName) );
          if (scope == "public"){
            datasetToCheckboxes[groupName].push( db.checkboxValue );
            if (groupName == "tcga pan-cancer" && db.title == "GBM"){
              datasetToCheckboxes.gbm = [ db.checkboxValue ];
            } else if (groupName == "tcga publications"){
              datasetDeselect.push( db.checkboxValue );
            }
          }

          // Record each of the samples (required for sample search)
          db.samples.forEach(function(s){
            samples.push( {sample: s, cancer: db.title, groupName: g.name == "" ? "Other" : g.name })
          });
        })
      });
    }

    initGroup( standardGroups, 'public' )


    var viewData = {
      // user: req.user,
      groups: standardGroups,
      datasetToCheckboxes: datasetToCheckboxes,
      // recentQueries: [],
      datasetDeselect: datasetDeselect,
      samples: samples
    };
    // Load the user's datasets (if necessary)
    if (req.user){
      Dataset.datasetGroups({user_id: req.user._id}, function(err, userGroups){
        // Throw error (if necessary)
        if (err) throw new Error(err);

        // Append the groupClass standard to each group
        initGroup( userGroups, 'private' );
        viewData.groups = viewData.groups.concat(userGroups);

        // Load the user's recent queries
        var User = Database.magi.model( 'User' );
        User.findById(req.user._id, function(err, user){
          if (err) throw new Error(err);
          // viewData.recentQueries = user.queries ? user.queries : [];
          res.send(JSON.stringify(viewData));
        });

      });
    }
    else{
      res.send(JSON.stringify(viewData));
    }
  });
}