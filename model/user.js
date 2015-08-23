// Load required modules
var mongoose = require( 'mongoose' ),
Database = require('./db'),
Q = require('q');

// create a user model
var UserSchema = new mongoose.Schema({
  googleId: Number,
  name: String,
  email: String,
  researcherType: String,
  newsletter: Boolean,
  institution: String,
  department: String,
  other: String,
  queries: { type: Array, required: false, default: [] },
});

var User = Database.magi.model( 'User', UserSchema );

// retrieve information for a single user
exports.findByGoogleId = function (google_id) {
    return find({googleId: google_id});
}

exports.findById = function (id) {
    return find({_id: id});
}

//var userCache = {}; // cache by 
function find(criteria) {
/*
    if (google_id in userCache) {
	return Q.fcall(function () {
	    return userCache[google_id];
	});
    } */
    d = Q.defer();

    User.findOne(criteria, function (err, user) {
	if(err) {
	    console.log(err);
	    throw new Error(err);
	} 
//	userCache[google_id] = user;
	d.resolve(user);
    });
    return d.promise;
}

