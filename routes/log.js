var mongoose = require( 'mongoose' ),
    Log  = require( "../model/log" );

exports.saveLog = function(req, res) {
  var user_id = req.user ? req.user._id : null;
  Log.saveLog(req['body'], user_id);
  res.send();
}

exports.isLoggingEnabled = function(req, res) {
  res.send(Log.isLoggingEnabled());
}