var mongoose = require( 'mongoose' ),
    Database = require('./db');

var QueryHashSchema = new mongoose.Schema({
  queryHash: String, // sha1 hash for each user
  query: String // true if logging enabled; false if disabled
});

// Register the Schema with mongoose
Database.magi.model('QueryHash', QueryHashSchema);