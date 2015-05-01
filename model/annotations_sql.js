// Import required modules                                                                                                                                   
Database = require('./db_sql');

//                                                                                                                                                           
// initialize table                                                                                                                                          

exports.init = function() {
    Database.sql_query("CREATE TABLE IF NOT EXISTS aberrations " +
              "(gene varchar(15), " + //ref gene table?                                                                                                      
              "transcript varchar(20), " +
              "mut_class varchar(15), " + // ref a small table 
              "mut_type varchar(15), " + // ref a small table                                                                                                
              "protein_seq_change varchar(15), " +
              "reference varchar(25), " +
              "source varchar(20), " +
              "is_germline boolean, " +
              "measurement_type varchar(10), " +
              "comment varchar(5000), " +
              "user_id varchar(20));", [],  // key is gene, mut_class, ref, source, user_id?                                                       
		function(err, result) {
			if (!err) {
				console.log("Initialized aberrations table in postgres");
			}
		});		
}

exports.dumpAll = function(callback){
    Database.sql_query('SELECT gene, mut_class, reference, source, user_id FROM aberrations', [],
                 function(err, result) {
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

exports.getAnnotations = function (genes, callback) {
	console.log("in model:", genes)
	query = "SELECT gene, mut_class, reference, source, user_id FROM aberrations " +
		"WHERE gene IN $1 ORDER BY gene;"
	Database.sql_query(query, genes, function(err, result) {
		if (err) {
			console.log("Error getting annotations for specific genes");
			return
		}
		pkg_result = {
			rows:result.rows
		};
		callback(null, pkg_result);
	});
};

// upsert an aberration annotation into MongoDB                                                                                                              
exports.upsert = function(anno, callback){
    // todo: prepared statements                                                                                                                             
    // don't need this unpacking step, but requires persistent client                                                                                        

    unpacked = [anno.gene, anno.mut_class, anno.reference, anno.source, anno.user_id];
    query_str = 'INSERT INTO aberrations (gene, mut_class, reference, source, user_id) VALUES ($1, $2, $3, $4, $5)';
    console.log("upserting ", anno.gene);
    sql_result = Database.sql_query(query_str, unpacked, function(err, result) {
        if (err) {
            console.log("Error upserting gene annotation: " + err);
            return //FIXME - where should errors be handled?                                                                                                 
        }                                                                                                                                                    
        callback(null, result) // what is result of upsert?                                                                                                  
    }); // check status                                                                                                                                      
}

/*
// Vote for a mutation                                                                                                                                       
exports.vote = function mutationVote(fields, user_id){
}
// Loads annotations into the database                                                                                                                       
exports.loadAnnotationsFromFile = function(filename, source, callback){
}
//                                                                                                                                                           
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
    function combineCancers(objects){
        });
    });
    return annotations;
}

*/
