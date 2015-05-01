var pg = require("pg");

var conString = 'postgres://postgres@' + process.env.POSTGRES_PORT_5432_TCP_ADDR + ':5432/';

exports.sql_query = function sql_query(text, values, cb){
    // gets a client from the client pool                                                                                                                    
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

