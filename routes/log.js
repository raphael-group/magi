var mongoose = require( 'mongoose' ),
    Log  = require( "../model/log" );

exports.saveLog = function(req, res) {
  console.log('saveLog works!');
  // console.log(req.body);
  var user_id = req.user ? req.user._id : null;
  Log.saveLog(req['body'], user_id);
  res.send();
}