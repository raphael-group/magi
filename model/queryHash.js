var mongoose = require( 'mongoose' ),
    db = require('./db');

var QueryHashSchema = new mongoose.Schema({
  queryHash: String, // sha1 hash for each user
  query: String // true if logging enabled; false if disabled
});

// Register the Schema with mongoose
db.magi.model('QueryHash', QueryHashSchema);