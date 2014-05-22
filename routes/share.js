// Load models
var mongoose = require( 'mongoose' ),
  QueryHash = require('../model/queryHash'),
  crypto = require('crypto');

exports.saveShareURL = function(req, res) {
  console.log('Sharing is caring');
  console.log(req.body.url);
  var url = req.body.url,
      hasher = crypto.createHash('sha1').update(''),
      hash = hasher.digest('hex');
  console.log(hash);

  var QueryHash = mongoose.model('QueryHash');

  console.log('created', {query: url, queryHash:hash});
  // Store hash if it doesn't exist
  QueryHash.find({query: url, queryHash:hash}, function(err, entries) {
    if (err) {
      console.log('Could not find queryHash due to error.');
      res.send('');
    }
    if(entries.length == 0) {
      QueryHash.create({query: url, queryHash:hash}, function(e, s) {
        if(e) console.log('Undefined log permission creation');
      });
    }
  });

  res.send(hash);
}