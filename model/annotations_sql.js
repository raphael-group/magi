// Import required modules
Database = require('./db_sql');
Schemas = require('./annotations_schema.js');
var sql = require("sql");

//initialize table
exports.init = Schemas.initDatabase

// find all mutation annotations given a structure with regexp
// and the ids of users who have submitted upvotes/downvotes on each
exports.geneFind = function(query, dir, callback) {
    abers = Schemas.aberrations
    annos = Schemas.annotations
    votes = Schemas.votes

    // Selects the desired annotations according to the given filter
    if (dir == 'left'){ // the query is for the annotations (e.g. user_id)
        selAnnosQuery = annos.from(annos.joinTo(abers)).where(query);
    } else if (dir == 'right'){ // the query is for the aberrations (e.g. gene)
      selAnnosQuery = abers.from(abers.joinTo(annos)).where(query);
    }


    Database.sql_query(joinVoteListsToQuery(selAnnosQuery), selAnnosQuery.toQuery().values, function(err, result) {
	if (err) {
            console.log("Error selecting gene annotations: " + err);
	    console.log("Debug: full query:", selQuery.string)
	    callback(err, null)
	}

	// convert null votes to []
	for (var i = 0; i < result.rows.length; i++) {
	    if (result.rows[i].upvotes == null) {
		result.rows[i].upvotes = []
	    }
	    if (result.rows[i].downvotes == null) {
		result.rows[i].downvotes = []
	    }
	}
	callback(null, result.rows)
    })
}

// join a query with the list of all user_ids who have voted on a particular annotation
function joinVoteListsToQuery(query) {
    // Retrieve upvotes and downvotes for every annotation
    upvotesQuery = "(SELECT anno_id, array_agg(voter_id) AS upvotes " +
	" FROM votes WHERE direction =  1 group by anno_id) AS U";

    downvotesQuery = " (SELECT anno_id, array_agg(voter_id) AS downvotes " +
	" FROM votes WHERE direction = -1 group by anno_id) as D ";

    selQuerySplit = query.toQuery().text.split("WHERE");

    // Join the upvote/downvote table within the annotation selection
    wholeQueryText = selQuerySplit[0] + " LEFT JOIN " +
	upvotesQuery + " ON U.anno_id = annos.u_id LEFT JOIN " +
	downvotesQuery + " ON D.anno_id = annos.u_id WHERE " +
	selQuerySplit[1];

    return wholeQueryText;
}

// find all mutation annotations given a structure with regexp
// and the ids of users who have submitted upvotes/downvotes on each
exports.ppiFind = function(query, callback) {
    ppis = Schemas.interactions
    annos = Schemas.annotations
    votes = Schemas.votes

    // Selects the desired annotations according to the given filter
    selPpisQuery = ppis
	.from(ppis.join(annos).on(ppis.anno_id.equals(annos.u_id)))
	.where(query)

    Database.sql_query(joinVoteListsToQuery(selPpisQuery), selAnnosQuery.toQuery().values, function(err, result) {
	if (err) {
            console.log("Error selecting ppi annotations: " + err);
	    console.log("Debug: full query:", selQuery.string)
	    callback(err, null)
	}

	// convert null votes to []
	for (var i = 0; i < result.rows.length; i++) {
	    if (result.rows[i].upvotes == null) {
		result.rows[i].upvotes = []
	    }
	    if (result.rows[i].downvotes == null) {
		result.rows[i].downvotes = []
	    }
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
    var anno_id = fields._id, // FIXME: not guaranteed unique - better to use anno_id,
    valence = (fields.vote == "up") ? 1 : -1 ;

    // change existing vote if necessary
    voteUpdateQuery = votes.update({
	direction : valence
    })
	.where(votes.voter_id.equals(user_id),
	       votes.anno_type.equals("aber"),
	       votes.anno_id.equals(anno_id))

    voteInsertQuery = votes.insert(votes.voter_id.value(user_id),
		 votes.direction.value(valence),
		 votes.anno_type.value("aber"),
		 votes.anno_id.value(anno_id))

    // todo: operate as transaction
    Database.execute(voteUpdateQuery, function (err, result) {
	// Throw error and resolve if necessary
	if (err) {
	    console.log("Error voting for mutation:", err)
	    throw new Error(err);
	} else if (result.rowCount == 0 ){
	    Database.execute(voteInsertQuery, function (err, result) {
		if (err) {
		    console.log("Error voting for mutation:", err)
		    throw new Error(err);
		}
	    })
	} else {
	    console.log("vote submission Result: ", result)
	}
	console.log("User", user_id, "voted for anno #",  anno_id);
	d.resolve();
    })

    return d.promise;
}

// upsert an aberration annotation into SQL
exports.upsertAber = function(data, callback){
    abers = Schemas.aberrations
    annos = Schemas.annotations

    annoInsertQuery = annos.insert([{
	user_id : data.user_id,
	reference : data.pmid,
	comment : data.comment,
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

    // todo: test update case
    // todo: transaction-ize w/ rollback (not necessary, just good to clean the annos table)
    Database.execute(annoInsertQuery, function(err, subresult) {
	handleErr(err, subresult, annoInsertQuery)
	u_id = subresult.rows[0].u_id
//	console.log("Returned on upsert u_id: ", u_id)
	aberInsertQuery = abers.insert(
	    abers.gene.value(data.gene),
	    abers.cancer.value(data.cancer),
	    abers.transcript.value(data.transcript),
	    abers.mut_class.value(data.mut_class),
	    abers.mut_type.value(data.mut_type),
	    abers.protein_seq_change.value(data.change),
	    abers.source.value(data.source),
	    abers.anno_id.value(u_id)).returning(abers.anno_id) // we can re turn more if we want

	Database.execute(aberInsertQuery, function(err, result) {
	    handleErr(err, result, aberInsertQuery)
	    callback(null, result.rows[0]) // what do we want to return?
	})
    })
}

// Loads annotations into the database
exports.loadAnnotationsFromFile = function(filename, source, callback){
    // Load required modules
    var fs = require( 'fs' ),
    Q  = require( 'q' );

    // Read in the file asynchronously
    var data;
    function loadAnnotationFile(){
	var d = Q.defer();
	fs.readFile(filename, 'utf-8', function (err, fileData) {
	    // Exit if there's an error, else callback
	    if (err) console.log(err)
	    d.resolve();
	    data = fileData;
	});
	return d.promise;
    }

    function processAnnotations(){
	// Load the lines, but skip the header (the first line)
	var lines = data.trim().split('\n');

	// Make sure there're some lines in the file
	if (lines.length < 2){
	    console.log("Empty file (or just header). Exiting.")
	    process.exit(1);
	}

	// Create objects to represent each annotation
	var annotations = [];
	for (var i = 1; i < lines.length; i++){
	    // Parse the line
	    var fields = lines[i].split('\t'),
	    support = {
		gene: fields[0],
		transcript: fields[1] == '' ? null : fields[1], // not used
		cancer: fields[2] == '' ? null : fields[2],
		mutation_class: fields[3],
		mutation_type: fields[4],
		locus: fields[5] == '' ? null : fields[5], // not used
		change: fields[6] == '' ? null : fields[6],
		reference: fields[7], //pmid
		comment: fields.length > 8 ? fields[8] : null,
		source: source
	    }
	    annotations.push( support );
	}
	console.log( "Loading " + annotations.length + " annotations from file..." )

	// Save all the annotations
	return Q.allSettled( annotations.map(function(A){
	    var d = Q.defer();

	    var query = {
		gene: A.gene,
		cancer: A.cancer,
		change: A.change,
		transcript: A.transcript,
		mut_class: A.mutation_class,
		mut_type: A.mutation_type,
		pmid: A.reference,
		comment: A.comment,
		source: source,
		user_id: "admin_user"
	    };

	    exports.upsertAber(query, function(err, annotation){
		if (err) throw new Error(err);
		d.resolve();
	    })
	    return d.promise;
	}));
    }

    loadAnnotationFile().then( processAnnotations ).then( function(){ callback("") } );
}

// ************************************
// PPIs
exports.upsertPPI = function(data, callback) {
    ppis = Schemas.interactions
    annos = Schemas.annotations
    console.log("Retrieved record: ", data)

    // insert into the annos
    annoInsertQuery = annos.insert([{
	user_id : data.user_id,
	reference : data.pmid,
	comment : data.comment,
	type : "ppi" }]).returning(annos.u_id)

    handleErr = function(err, subresult, query) {
	if (err == null && subresult.rows.length == 0) {
	    err = Error("Did not return ppi annotation ID")
	}
	if (err) {
            console.log("Error upserting ppi annotation: " + err);
	    console.log("Debug: full query:", query.string)
	    callback(err, null)
	}
    }

    console.log("Submitting query: ", annoInsertQuery.string)
    // todo: test update case
    // todo: transaction-ize w/ rollback (not necessary, just good to clean the annos table)
    Database.execute(annoInsertQuery, function(err, subresult) {
	// retrieve the unique ID for the annotation
	handleErr(err, subresult, annoInsertQuery)
	u_id = subresult.rows[0].u_id
	console.log("Returned on upsert ppi u_id: ", u_id)

	ppiInsertQuery = ppis.insert(
	    ppis.source.value(data.source),
	    ppis.target.value(data.target),
	    // nothing else can be specified currently in front end
	    // database, type, weight, directed, tissue all blank
	    ppis.anno_id.value(u_id)).returning(ppis.anno_id) // we can return more if we want

	Database.execute(ppiInsertQuery, function(err, result) {
	    handleErr(err, result, ppiInsertQuery)
	    callback(null, result.rows[0])
	})
    })
}
