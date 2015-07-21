// Import required modules
Database = require('./db_sql');
Schemas = require('./annotations_schema.js');
var sql = require("sql");
var ADMIN_USER = "admin";

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
//        selAnnosQuery = annos.from(annos.joinTo(abers)).where(query);
        selAnnosQuery = annos.from(annos.joinTo(abers)).where(annos.user_id.equals(query.user_id));
    } else if (dir == 'right'){ // the query is for the aberrations (e.g. gene)
	selAnnosQuery = abers.from(abers.joinTo(annos)).where(query);
    }

    // TODO: use annos.table.columns to automatically separate
    Database.sql_query(joinVoteListsToQuery(selAnnosQuery), selAnnosQuery.toQuery().values, function(err, result) {
	if (err) {
            console.log("Error selecting gene annotations: " + err);
	    console.log("Debug: full query:", selAnnosQuery.string)
	    callback(err, null)
	}

	callback(null, result.rows.map(normalizeAnnotation))
    })
}

function normalizeAnnotation(anno) {
    // convert null votes to []
    if (anno.upvotes == null) {
	anno.upvotes = []
    }
    if (anno.downvotes == null) {
	anno.downvotes = []
    }
    return anno;
}

exports.inGeneClause = function(columnName, columnPoss) {
    abers = Schemas.aberrations
    return abers[columnName].in(columnPoss);
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
	    console.log("Debug: full query:", selQuery.string)
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

// find all protein-protein interaction annotations given a structure with regexp
// and the ids of users who have submitted upvotes/downvotes on each
exports.ppiFind = function(query, dir, callback) {
    ppis = Schemas.interactions
    annos = Schemas.annotations
    votes = Schemas.votes

    // Selects the desired ppi annotations according to the given filter
    if (dir == 'left'){ // the query is for the annotations (e.g. user_id)
        selAnnosQuery = annos.from(annos.joinTo(ppis)).where(query);
    } else if (dir == 'right'){ // the query is for the aberrations (e.g. gene)
	selAnnosQuery = ppis.from(ppis.joinTo(annos)).where(query);
    }

    Database.sql_query(joinVoteListsToQuery(selAnnosQuery), selAnnosQuery.toQuery().values, function(err, result) {
	if (err) {
            console.log("Error selecting ppi annotations: " + err);
	    console.log("Debug: full query:", selAnnosQuery.string)
	    callback(err, null)
	}

	callback(null, result.rows.map(normalizeAnnotation))
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
		    d.reject(err);
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

function parsePMID(pmid_field) {
    // parse PMIDs if necessary:
    if (pmid_field === undefined) 
	return ["none"]

    if (pmid_field.indexOf(",") == -1) 
	return [pmid_field];

    return pmid_field.split(",");

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
	    references = parsePMID(fields[7])
	    
	    references.forEach(function(pmid) {
		annotations.push({
		    gene: fields[0],
		    transcript: fields[1] == '' ? null : fields[1], // not used
		    cancer: fields[2] == '' ? null : fields[2],
		    mutation_class: fields[3],
		    mutation_type: fields[4],
		    locus: fields[5] == '' ? null : fields[5], // not used
		    change: fields[6] == '' ? null : fields[6],
		    reference: pmid, //pmid
		    comment: fields.length > 8 ? fields[8] : null,
		    source: source
		});
	    });
	}
	console.log( "Loading " + annotations.length + " aberration annotations from file..." )

	// Save all the annotations
	return Q.allSettled( annotations.map(function(A){
	    var d = Q.defer();

	    var query = {
		gene: A.gene,
		cancer: A.cancer.toUpperCase(),
		change: A.change,
		transcript: A.transcript,
		mut_class: A.mutation_class,
		mut_type: A.mutation_type,
		pmid: A.reference,
		comment: A.comment,
		source: source,
		user_id: ADMIN_USER
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

//    console.log("Submitting upsert query: ", annoInsertQuery.toQuery().text)

    // todo: test update case
    // todo: transaction-ize w/ rollback (not necessary, just good to clean the annos table)
    Database.execute(annoInsertQuery, function(err, subresult) {
	// retrieve the unique ID for the annotation
	handleErr(err, subresult, annoInsertQuery)
	u_id = subresult.rows[0].u_id

	// database, type, weight, directed, tissue are all unspecified on front-end
	ppiInsertQuery = ppis.insert(
	    ppis.source.value(data.source),
	    ppis.target.value(data.target),
	    ppis.weight.value(data.weight),
	    ppis.database.value(data.database),	    
	    ppis.anno_id.value(u_id)).returning(ppis.anno_id) // we can return more if we want

	Database.execute(ppiInsertQuery, function(err, result) {
	    handleErr(err, result, ppiInsertQuery)
	    callback(null, result.rows[0])
	})
    })
}

// Loads annotations into the database
exports.loadPPIsFromFile = function(filename, source, callback){
    // Load required modules
    var fs = require( 'fs' ),
    Q  = require( 'q' );

    // Read in the file asynchronously
    var data;
    function loadPPIFile(){
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
	var ppis = [];
	for (var i = 1; i < lines.length; i++){ // first line should be the header	    
	    var fields = lines[i].split('\t');
	    pmids = parsePMID(fields[4]);
	    pmids.forEach(function (_pmid) {
		ppis.push({
		    source: fields[0],
		    target: fields[1], 
		    weight: fields[2] == '' ? 1 : fields[2],
		    database: fields[3],
		    pmid: _pmid,
		    user_id: ADMIN_USER
		}); 
	    }); 
	}
	console.log( "Loading " + ppis.length + " ppi annotations from file..." )

	// Save all the annotations
	return Q.allSettled( ppis.map(function(query){
	    var d = Q.defer();
	    
	    exports.upsertPPI(query, function(err, annotation){
		if (err) {
		    console.log("error, query: ");
		    console.log(query)
		    throw new Error(err);
		}
		d.resolve();
	    })
	    return d.promise;
	}));
    }

    loadPPIFile().then( processAnnotations ).then( function(){ callback("") } );
}

exports.geneTable = function (genes, support){
	// Assemble the annotations into a dictionary index by 
	// gene (e.g. TP53) and mutation class (e.g. missense or amp)
	// and then protein change (only applicable for missense/nonsense)
	// 1) Store the total number of references for the gene/class in "",
	//    i.e. annotations['TP53'][''] gives the total for TP53 and 
	//    annotations['TP53']['snv'][''] gives the total for TP53 SNVs.
	// 2) Count the number per protein change.
	var annotations = {};

	genes.forEach(function(g){ annotations[g] = { "": [] }; });

	support.forEach(function(A){
		// We split SNVs into two subclasses: nonsense or missense.
		// We also remove the "_mutation" suffix sometimes present in the
		// mutation types
		var mClass = A.mut_class.toLowerCase(),
			mType = A.mut_type ? A.mut_type.toLowerCase().replace("_mutation", "") : "";
		if (mClass == "snv" && (mType == "missense" || mType == "nonsense")){ mClass = mType; }
		
		// Add the class if it hasn't been seen before
		if (typeof(annotations[A.gene][mClass]) == 'undefined'){
			annotations[A.gene][mClass] = {"" : [] };
		}

		// If we know the mutaton class, we might also want to add
		// the protein sequence change
		if (mClass == "snv" || mClass == "missense" || mClass == "nonsense"){
			if (A.protein_seq_change){
				A.protein_seq_change = A.protein_seq_change.replace("p.", "");
				if (typeof(annotations[A.gene][mClass][A.protein_seq_change]) == 'undefined'){
					annotations[A.gene][mClass][A.protein_seq_change] = [];
				}

			    annotations[A.gene][mClass][A.protein_seq_change].push({ pmid: A.reference, cancer: A.cancer });

			}
		}
	    annotations[A.gene][mClass][""].push({ pmid: A.reference, cancer: A.cancer });
	    annotations[A.gene][""].push({ pmid: A.reference, cancer: A.cancer });
	});

	// Combine references at the PMID level so that for each 
	// annotation type (gene, type, locus) we have a list of references
	// with {pmid: String, cancers: Array }. Then collapse at the cancer type(s)
	// level so we have a list of PMIDs that all map to the same cancer type(s)
	function combineCancers(objects){
		var objToIndex = [],
			combinedCancer = [];

		// First combine at the cancer level
		objects.forEach(function(d){
			d.cancer = d.cancer ? d.cancer.toUpperCase() : "Cancer";
			if (typeof(objToIndex[d.pmid]) == 'undefined'){
				objToIndex[d.pmid] = combinedCancer.length;
				combinedCancer.push( { pmid: d.pmid, cancers: [d.cancer] } );
			} else {
				var index = objToIndex[d.pmid];
				if (combinedCancer[index].cancers.indexOf(d.cancer) === -1)
					combinedCancer[index].cancers.push( d.cancer )
			}
		});

		// Then combine at the PMID level
		var groups = {};
		combinedCancer.forEach(function(d){
			var key = d.cancers.sort().join("");
			if (typeof(groups[key]) === 'undefined') groups[key] = [];
			groups[key].push(d)
		});

		var combined = Object.keys(groups).map(function(k){
			var datum = {pmids: [], cancers: groups[k][0].cancers };
			groups[k].forEach(function(d){ datum.pmids.push(d.pmid); });
			return datum;
		});

		return {refs: combined, count: combinedCancer.length};
	}

	genes.forEach(function(g){
		Object.keys(annotations[g]).forEach(function(ty){
			if (ty == ""){
				annotations[g][ty] = combineCancers(annotations[g][ty]);
			} else {
				Object.keys(annotations[g][ty]).forEach(function(c){
					annotations[g][ty][c] = combineCancers(annotations[g][ty][c]);
				});
			}
		});
	});

	return annotations;

}