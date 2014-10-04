var mongoose = require( 'mongoose' ),
    Log  = require( "../model/log" ),
    Database = require('../model/db')
    crypto = require('crypto');

exports.saveLog = function(req, res) {
  var user_id = req.user ? req.user._id : null;
  Log.saveLog(req['body'], user_id);
  res.send();
}

exports.isLoggingEnabled = function(req, res) {
  res.send(Log.isLoggingEnabled());
}

exports.logConsent = function(req, res) {
  // TODO: error handling on client
  if(req.user == undefined) {
    res.send();
    return;
  }
  var LogPermission = Database.logDB.model('LogPermission'),
      enableState = req['body'].enable == 'true' ? true : false,
      user = req.user || {},
      userId = user._id || 'undefined',
      userIdStr = userId.toString(),
      hasher = crypto.createHash('sha1');

  hasher.update(userIdStr);
  var hash = hasher.digest('hex');

  // Store the user's logging consent response
  LogPermission.find({userHash: hash}, function(err, entries) {
    if (err) console.log('Could not find userHash and logging enabling info.');
    if(entries.length == 0) {
      LogPermission.create({userHash: hash, enable:enableState}, function(e, s) {
        if(e) console.log('Undefined log permission creation');
      });
    } else {
      LogPermission.update({userHash: hash}, { $set: { enable: enableState }}, function(e, r) {});
    }
  });

  res.send();
}

// Return false if logging consent is not given, true if is given
exports.userGaveConsent = function(req, res) {
  var LogPermission = Database.logDB.model('LogPermission'),
      user = req.user || {},
      userId = user._id || 'undefined',
      userIdStr = userId.toString(),
      hasher = crypto.createHash('sha1');

  hasher.update(userIdStr);
  var hash = hasher.digest('hex');

  LogPermission.find({userHash:hash}, function(err, entries) {
    if (err) res.send(false);
    if(entries.length == 0) { // if the user hasn't filled out information, disable logging
      res.send(false);
    } else { // if the user has filled out information, return the user's consent response
      var consentStatus = (entries[0].enable).toString();
      res.send(consentStatus);
    }
  });
}