// Import required modules                                                                                                                               
Database = require('./db_sql');
Schemas = require('./annotations_schema.js');
var sql = require("sql");

//initialize table
exports.init = Schemas.initDatabase

// find all annotations given a structure with regexp
exports.find = function(query, callback /*(err, results) */) {
    
}

// todo: Vote for a mutation
exports.vote = function mutationVote(fields, user_id){
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

