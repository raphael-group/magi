// Import required modules                                                                                                                               
Database = require('./db_sql');
Schemas = require('./annotations_schema.js');
var sql = require("sql");

//initialize table
exports.init = Schemas.initDatabase

// find all annotations given a structure with regexp
exports.geneFind = function(query, callback /*(err, results) */) {
    abers = Schemas.aberrations
    annos = Schemas.annotations
    votes = Schemas.votes

    console.log("query in geneFind: ", query)

    // todo: update $2 depending on how many args are passed in
    voteSubQueryText = 
	" (SELECT U.anno_id, upvotes, downvotes FROM " +
	" (SELECT anno_id, array_agg(voter_id) AS upvotes " +
	" FROM votes WHERE upvote = 1 group by anno_id)" +
	" AS U JOIN " +                          
	" (SELECT anno_id, array_agg(voter_id) AS downvotes FROM votes " +
	" WHERE downvote = 1 group by anno_id) as D " +
	" ON U.anno_id = D.anno_id) "
   
    selAnnosQuery = abers
//	.select(
     	// annos.u_id, 
     	// annos.reference,
     	// abers.gene,
     	// abers.mut_class,
     	// abers.mut_type,
     	// abers.protein_seq_change)
	.from(abers.join(annos).on(abers.anno_id.equals(annos.u_id)))
	.where(query)

    selQuerySplit = selAnnosQuery.toQuery().text.split("WHERE")

    wholeQueryText = selQuerySplit[0] + " LEFT JOIN " + 
	voteSubQueryText + " AS vote_ballots  " + 
	" ON vote_ballots.anno_id = annos.u_id WHERE " +
	selQuerySplit[1]
    // todo: fill out references, and up/down votes
    console.log("WHOLE QUERY:", wholeQueryText)

    Database.sql_query(wholeQueryText, selAnnosQuery.toQuery().values, function(err, result) {
	if (err) {
            console.log("Error selecting gene annotations: " + err);
	    console.log("Debug: full query:", selQuery.string) 
	    callback(err, null)	    
	} 
	
	callback(null, result.rows)
    })
}

// todo: Vote for a mutation
exports.vote = function mutationVote(fields, user_id){
    votes = Schemas.votes

    // Set up the promise
    var Q = require( 'q' ),
    d = Q.defer();

    //Create and execute the query
    var anno_id = fields.annotation_id, // FIXME: not guaranteed unique - better to use anno_id,
    valence;

    // todo: change existing vote if necessary
    if (fields.vote == "up") {
	valence = 1 
    } else if (fields.vote == "down") {
	valence = -1
    }

    voteQuery = votes.insert(votes.voter_id.value(user_id),
		 votes.direction.value(valence),
		 votes.anno_type.value("aber"),
		 votes.u_id.value(anno_id))
    Database.execute(voteQuery, function (err, result) {
	// Throw error and resolve if necessary
	if (err){
	    console.log("Error voting for mutation:", err)
	    throw new Error(err);
	}
	console.log("User", user_id, "voted for anno #",  anno_id);
	d.resolve();
    })

    return d.promise;
}

// upsert an aberration annotation into SQL                              
exports.upsert = function(data, callback){
    abers = Schemas.aberrations
    annos = Schemas.annotations

    annoInsertQuery = annos.insert([{
	user_id : data.user_id,
	reference : data.pmid,
	type : "aber" }]).returning(annos.u_id)

    handleErr = function(err, subresult, query) {
	if (err == null && subresult.rows.length == 0) {
	    err = Error("Did not return annotation ID")
	}
	if (err) {
            console.log("Error upserting gene annotation: " + err);
	    console.log("Debug: full query:", query.string) 
	    callback(err, null)
	}
    }

    // todo: transaction-ize w/ rollback (not necessary, just good to clean the annos table)
    Database.execute(annoInsertQuery, function(err, subresult) {
	handleErr(err, subresult, annoInsertQuery) 
	u_id = subresult.rows[0].u_id

	aberInsertQuery = abers.insert(
	    abers.gene.value(data.gene),
	    abers.mut_class.value(data.mutation_class),
	    abers.mut_type.value(data.mutation_type),
	    abers.protein_seq_change.value(data.change),
	    abers.comment.value(data.comment),
	    abers.source.value(data.source),
	    abers.anno_id.value(u_id)).returning(abers.anno_id) // we can re turn more if we want

	Database.execute(aberInsertQuery, function(err, result) {
	    handleErr(err, result, aberInsertQuery)
	    callback(null, result.rows[0]) // what do we want to return?
	})
    })
}

// todo:  Loads annotations into the database
exports.loadAnnotationsFromFile = function(filename, source, callback){
}
                                                                                                                                                          // todo: assemble annotations 
exports.geneTable = function (genes, support){
    // Assemble the annotations into a dictionary index by                                                                                                   
    // gene (e.g. TP53) and mutation class (e.g. missense or amp)                                                                                                // and then protein change (only applicable for missense/nonsense)                                                                                       
    // 1) Store the total number of references for the gene/class in "",                                                                                     
    // i.e. annotations['TP53'][''] gives the total for TP53 and                                                                                             
    // annotations['TP53']['snv'][''] gives the total for TP53 SNVs.                                                                                         
    // 2) Count the number per protein change.                                                                                                               
    // Combine references at the PMID level so that for each                                                                                                 
    // annotation type (gene, type, locus) we have a list of references                                                                                      
    // with {pmid: String, cancers: Array }. Then collapse at the cancer type(s)                                                                             
    // level so we have a list of PMIDs that all map to the same cancer type(s)  

    // todo: subfunction                                                         	// Combine references at the PMID level so that for each 
    // annotation type (gene, type, locus) we have a list of references
    // with {pmid: String, cancers: Array }. Then collapse at the cancer type(s)
    // level so we have a list of PMIDs that all map to the same cancer type(s)
    
    function combineCancers(objects){
    }
//return annotations;
}

