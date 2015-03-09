// Load mongoose and all models to register their schemas
var mongoose = require( 'mongoose' );

// Create dbURI
var dbHost = process.env.MONGO_HOST || "localhost"
var dbURI = "mongodb://" + dbHost + "/magi";

// Create the database connection
//mongoose.connect(dbURI);
var magi = mongoose.createConnection(dbURI);

var logDB = magi.useDb('magi-logging');

exports.magi = magi;
exports.logDB = logDB;

// CONNECTION EVENTS
// When successfully connected
magi.on('connected', function () {
  console.log('Mongoose default connection open to ' + dbURI);
});

// If the connection throws an error
magi.on('error',function (err) {
  console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
magi.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function() {
  magi.close(function () {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});
