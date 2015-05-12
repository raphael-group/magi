var pg = require("pg");
var conString = 'postgres://postgres@' + process.env.POSTGRES_HOST + ':' + 
    process.env.POSTGRES_PORT + '/magi';

console.log('connection:', conString);

exports.execute = execute
exports.executeAppend = executeAppend
exports.sql_query = sql_query
//  a query built by SQL package
function execute(query, cb){
    q = query.toQuery()
    sql_query(q.text, q.values, cb)
}

// a query built by SQL package, with an extra modifier appended
function executeAppend(query, suffix, cb){
    q = query.toQuery()
    cmd = q.text.split(" ", 1)[0]
    
    if (cmd.toUpperCase() == "CREATE") {
	fullCmd = q.text.slice(0,q.text.length - 1) + ", " + suffix + ")"
	sql_query(fullCmd, q.values, cb)
    } else {
	sql_query(q.text + suffix, q.values, cb)
    }
}

// a straight parametrized query
function sql_query(text, values, cb){
    // gets a client from the client pool                  
//    console.log("plaintext query is:", text)
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

// todo: add transactions

// todo: support client model
