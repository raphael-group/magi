var pg = require("pg");

pgDbName = 'magi'
var conString = 'postgres://postgres@' + process.env.POSTGRES_HOST + ':' + 
    process.env.POSTGRES_PORT + '/' + pgDbName;

console.log('Connecting to postgres at address', conString);

exports.execute = execute
exports.executeAppend = executeAppend
exports.sql_query = sql_query
exports.verify_connection = verify_connection;
//
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

// a straight parametrized query that uses the client pool
function sql_query(text, values, cb){
    // gets a client from the client pool                  
//    console.log("plaintext query is:", text)
//    console.log("plaintext values are:", values)
    pg.connect(conString, function(err, client, done) {
        if(err) {
            return console.error("error fetching client from pool:", err);
        }
        query = client.query(text, values, function(err, result) {
            done(); // releases the client back to the pool                                                                                                  
            cb(err, result);
        });
    })
}

// returns a promise: use with .then().fail()
function verify_connection() {
    var Q = require('q');
    d = Q.defer();
    pg.connect(conString, function(err, client, done) {
	if (err) {
	    d.reject(err);   
	} else if (!client) {
	    d.reject(new Error('Null client returned'));
	} else {
	    done();
	    d.resolve();
	}});
    return d.promise;
}
// todo: add transactions

// todo: support client model
