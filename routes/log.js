var Dataset  = require( "../model/log" );

exports.saveLog = function(req, res) {
  console.log('saveLog works!');
  console.log(req.body);
  //Log.saveLog(req['body'].log);
}