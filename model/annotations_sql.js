// Import required modules                                                                                                                               
Database = require('./db_sql');
Schemas = require('./annotations_schema.js');
var sql = require("sql");

//initialize table
tables = Schemas.tables

exports.init = Schemas.initDatabase

exports.dumpAll = function(callback){
    aberrations = tables.aberrations
    query = aberrations.select(aberrations.gene).select(aberrations.mut_class)
    Database.execute(query, function(err, result) {
	if (err) {
	    console.log("Error dumping gene annotation table: " + err);
	    return
	}
	pkg_result = {
	    rows: result.rows
	};
	callback(null, pkg_result)
    });
};

// todo: Vote for a mutation
exports.vote = function mutationVote(fields, user_id){
}

exports.getAnnotations = function (genes, callback) {
    aberrations = tables.aberrations
    console.log("in model:", genes)
    query = aberrations.where(aberrations.gene.in(genes)).select(aberrations.gene).select(aberrations.mut_class)
    Database.execute(query, function(err, result) {
	if (err) {
	    console.log("Error getting annotations for specific genes");
	    console.log(err)
	    return
	}
	pkg_result = {
	    rows:result.rows
	};
	callback(null, pkg_result);
    });
};

// upsert an aberration annotation into SQL                              
exports.upsert = function(anno, callback){
    aberrations = tables.aberrations
    // todo: prepared statements                                                                                                                                query = aberrations.insert(aberrations.gene.value(anno.gene))
//    aberrations.mut_class.value(anno.mutation_class),
//    aberrations.reference.value(anno.pmid),
//    aberrations.source.value(anno.source),
//    aberrations.user_id.value(anno.user_id))

console.log("upserting ", anno.gene);
sql_result = Database.execute(query, function(err, result) {
    if (err) {
        console.log("Error upserting gene annotation: " + err);
	console.log("full query:", query.string) 
	callback(err, null)
    }                                                                                                                                                    
    callback(null, result) // what is result of upsert?                                                                                                  
}); // check status                                                                                                                                      

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

