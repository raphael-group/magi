// Import required modules
Database = require('./db_sql');
Schemas = require('./annotations_schema');
Annotations = require('./annotations');
var sql = require("sql");

// for user added
exports.ADMIN_USER = "admin";

// initialize table
exports.init = Schemas.initDatabase

exports.inClause = function(table) {
    f = function (columnName, columnPoss) {
	return table[columnName].in(columnPoss);
    }
    return f;
}

// handle comments and upvotes
exports.normalize = function(anno) {
    var combine = function(votes, comments, voteDir) {
	var bound_comments = [];
	if (votes.length == comments.length) {
	    for(var i = 0; i < comments.length; i++) {
		bound_comments.push({user_id: votes[i], 
				     comment: comments[i],
				     direction: voteDir});
	    }
	}
	return bound_comments;
    }

    // convert null votes to []
    var comments = [];
    if (anno.upvotes == null) {
	anno.upvotes = []
	anno.upcomments = []
    } else {
	comments = comments.concat(combine(anno.upvotes, anno.upcomments, 'up'));
    }
    if (anno.downvotes == null) {
	anno.downvotes = []
	anno.downcomments = []
    } else {
	comments = comments.concat(combine(anno.downvotes, anno.downcomments, 'down'));
    }
    anno["comments"] = comments;
    return anno;
}

exports.parsePMID = function(pmid_field) {
    // parse PMIDs if necessary:
    if (pmid_field === undefined) 
	return ["none"]

    if (pmid_field.indexOf(",") == -1) 
	return [pmid_field];

    return pmid_field.split(",");
}

// join a query with the list of all user_ids who have voted on a particular annotation
exports.joinVoteListsToQuery = function(query) {
    // Retrieve upvotes and downvotes for every annotation
    upvotesQuery = "(SELECT anno_id, array_agg(voter_id) AS upvotes " +
	", array_agg(comment) AS upcomments " +
	" FROM votes WHERE direction =  1 group by anno_id) AS U";

    downvotesQuery = " (SELECT anno_id, array_agg(voter_id) AS downvotes " +
	", array_agg(comment) AS downcomments " +
	" FROM votes WHERE direction = -1 group by anno_id) as D ";

	selQuerySplit = query.toQuery().text.split("WHERE");

    // Join the upvote/downvote table within the annotation selection
    wholeQueryText = selQuerySplit[0] + " LEFT JOIN " +
	upvotesQuery + " ON U.anno_id = annos.u_id LEFT JOIN " +
	downvotesQuery + " ON D.anno_id = annos.u_id WHERE " +
    selQuerySplit[1];

	return wholeQueryText;
}

// delete a single mutation annotation 
exports.annoDelete = function(anno_id, user_id, callback) {
    annos = Schemas.annotations
    user_id = String(user_id)
    var Q = require( 'q' ),
    d = Q.defer();

    deleteQuery = annos.delete().where(annos.u_id.equals(anno_id), annos.user_id.equals(user_id))
    Database.execute(deleteQuery, function(err, result) {
	if (err) {
            console.log("Error deleting annotation: " + err);
//	    console.log("Debug: full query:", selQuery.string)
	    d.reject(err);
	}
	if (result.rowCount != 1) {
	    d.reject("Annotation not found for deletion");
	} else {
	    d.resolve();
	}
    });

    return d.promise;
}

function deleteVote(fields, user_id, anno_label_type) {
    votes = Schemas.votes

    // Set up the promise
    var Q = require( 'q' ),
    d = Q.defer();

    anno_id = fields._id;
    deleteQuery = votes.delete().where(
	votes.anno_id.equals(anno_id), 
	votes.voter_id.equals(user_id),
	votes.anno_type.equals(anno_label_type));

    Database.execute(deleteQuery, function (err, result) {
	// Throw error and resolve if necessary
	if (err) {
            console.log("Error deleting vote: " + err);
	    d.reject(err);
	}
	if (result.rowCount != 1) {
	    d.reject("Vote not found for deletion");
	} else {
	    d.resolve();
	}
    });
    return d.promise;
}

// todo: Vote for a mutation, and give the option to remove a vote as well
exports.vote = function mutationVote(fields, user_id, anno_label_type){
    votes = Schemas.votes;

    if (fields.vote == "remove") {
	return deleteVote(fields, user_id, anno_label_type)
    }

    // Set up the promise
    var Q = require( 'q' ),
    d = Q.defer();

    //Create and execute the query
    var anno_id = fields._id,    
    valence = (fields.vote == "up") ? 1 : -1 ;

    // change existing vote if necessary
    voteUpdateQuery = votes.update({
	direction : valence,
 	comment: fields.comment
    })
	.where(votes.voter_id.equals(user_id),
	       votes.anno_type.equals(anno_label_type),
	       votes.anno_id.equals(anno_id));

// todo: fill in correct type depending on vote type
    voteInsertQuery = votes.insert(votes.voter_id.value(user_id),
		 votes.direction.value(valence),
		 votes.anno_type.value(anno_label_type),
		 votes.anno_id.value(anno_id),
				   votes.comment.value(fields.comment));

    // todo: operate as transaction
    Database.execute(voteUpdateQuery, function (err, result) {
	// Throw error and resolve if necessary
	if (err) {
	    console.log("Error update voting for mutation:", err)
	    throw new Error(err);
	} else if (result.rowCount == 0 ){
	    Database.execute(voteInsertQuery, function (err, result) {
		if (err) {
		    console.log("Error insert voting for mutation:", err)
		    d.reject(err);
		} else { // vote was inserted
		    d.resolve();
		}
	    })
	} else { // vote was updated
	    d.resolve();
	}
    })
    return d.promise;
}
