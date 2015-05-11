var pg = require("pg");
var conString = 'postgres://postgres@' + process.env.POSTGRES_PORT_5432_TCP_ADDR + ':5432/';

exports.execute = execute
exports.sql_query = sql_query

function execute(query, cb){
	q = query.toQuery()
	sql_query(q.text, q.values, cb)
}

function sql_query(text, values, cb){
    // gets a client from the client pool                  
    console.log("text = ", text, ", values = ", values)
    pg.connect(conString, function(err, client, done) {
        if(err) {
            return console.error('error fetching client from pool', err);
        }
        query = client.query(text, values, function(err, result) {
            done(); // releases the client back to the pool                                                                                                  
            cb(err, result);
        });
    })
}
