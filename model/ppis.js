// Import required modules
var DjangoDatabase = require('./db_django'),
Schemas = require('./annotations_schema'),
Annotations = require('./annotations'),
 sql = require("sql");

// ************************************
// PPIs
// find all protein-protein interaction annotations given a structure with regexp
// and the ids of users who have submitted upvotes/downvotes on each
exports.ppiFind = function(query, dir, callback) {
    var ppis = Schemas.interactions,
    annos = Schemas.interaction_annotations;

    // Selects the desired ppi annotations according to the given filter
    var selPpisQuery = 
	ppis.from(ppis.join(annos).on(annos.interaction_id.equals(ppis.id)))
	.where(query);

    DjangoDatabase.execute(selPpisQuery, function(err, result) {
      if (err) {
        console.log("Error selecting ppi annotations: " + err);
        console.log("Debug: full query:", selPpisQuery.string)
        callback(err, null)
      } else {	  
	  callback(null, result.rows.map(function(record) {
	      record.downvotes = [];
	      record.downcomments = [];
	      record.upvotes = [];
	      record.upcomments = [];
	      return record;
	  }))
      }
    });
}

// A function for listing all the interactions for a particular gene
exports.ppilist = function (genes, callback){
    inGenes = [
	exports.inPPIClause('source_id', genes),
	exports.inPPIClause('target_id', genes)];
    exports.ppiFind(inGenes, 'right', function (err, ppis) {
	if(err) console.log(err);
	else callback("", ppis);
    })// end PPI.find
}// end exports.ppilist

// A replacement function for getting comments
exports.ppicomments = function ppicomments(ppis, user_id, callback){
    var annos = Schemas.interaction_annotations,
        votes = Schemas.votes;

    // get all u_ids of the ppis
    uids = ppis.map(function(p) {return p.id;});

    query = votes.select('*').where([ votes.reference_id.in(uids), votes.user_id.equals(user_id) ])

    DjangoDatabase.execute(query, function(err, result) {
      if (err) {
        console.log("Error getting ppi comments: " + err);
        console.log("Debug: full query:", query)
        callback(err, null);
        return;
      }
      if (result.rowCount == 0) {
        callback(null, []);
      } else {
        callback(null, result.rows);
      }
    });
}

exports.inPPIClause = Annotations.inClause(Schemas.interactions)
exports.remove = Annotations.annoDelete;
exports.vote = function (fields, user_id) {
    return Annotations.vote(fields, user_id, "ppi");
}
