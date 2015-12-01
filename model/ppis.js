// Import required modules
var Database = require('./db_sql'),
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

exports.upsertPPI = function(data, callback) {
  var ppis = Schemas.interactions,
      annos = Schemas.interaction_annotations;

  // insert into the annos
  annoInsertQuery = annos.insert(
    annos.user_id.value(data.user_id),
    annos.reference.value(data.pmid),
    annos.ref_source.value(data.anno_source),
    annos.comment.value(data.comment),
    annos.type.value('ppi')).returning(annos.u_id)

  handleErr = function(err, subresult, query) {
    if (err == null && subresult.rows.length == 0) {
      err = Error("Did not return ppi annotation ID")
    }
    if (err) {
      console.log("Error upserting ppi annotation: " + err);
      console.log("Debug: full query:", query.toQuery().text)
      console.log("Debug: full query:", query.toQuery().values)
      callback(err, null)
    }
  }


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
    });
  });
}

// Loads annotations into the database
exports.loadFromFile = function(filename, source, callback){
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
	    pmids = Annotations.parsePMID(fields[4]);
	    pmids.forEach(function (_pmid) {
		ppis.push({
		    source: fields[0],
		    target: fields[1],
		    weight: fields[2] == '' ? 1 : fields[2],
		    database: fields[3],
		    pmid: _pmid,
		    anno_source: source,
		    user_id: Annotations.ADMIN_USER
		});
	    });
	}
	console.log( "Loading " + ppis.length + " ppi annotations from file..." )

	// Save all the annotations
	 return Q.allSettled( ppis.map(function(query){
     var d = Q.defer();
     exports.upsertPPI(query, function(err, annotation){
       if (err) {
         throw new Error(err);
       }
       d.resolve();
     })
     return d.promise;
   }));
 }
 loadPPIFile().then( processAnnotations ).then( function(){ callback("") } );
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

    Database.execute(query, function(err, result) {
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
