// Handle save figure requests
var Q = require('q');
var fs = require('fs');
var childProcess = require('child_process');
var path = require('path');

// CONSTANTS
var tmpdir = path.normalize(path.join(__dirname + '/../tmp/'));
var fileName = 'figure';
var svgFileName = fileName + '.svg';
var svgFilePath = tmpdir + svgFileName;
var supportedExtensions = ['pdf', 'png', 'svg'];

// Use a call librsvg to convert the input (SVG) file to the given format
function convertFile(inputFile, outputFile, format){
  // Set up the system command to use rsvg-convert to convert the file
  var d = Q.defer();
  var msg, err = "", output = "";
  var cmd = 'rsvg-convert -f ' + format + ' -o ' + outputFile + ' ' + inputFile;

  // Execute the child process
  child = childProcess.exec(cmd);
  child.on('stdout', function(stdout){ output += stdout; });
  child.on('stderr', function(stderr){ err += stderr; });
  child.on('close', function(closeCode) { code = closeCode; });
  child.on('exit', function (exitCode) {
    console.log('Exit code:', exitCode)
    d.resolve();
  });

  return d.promise;
}

// Main route for saving and converting a figure
exports.figure = function (req, res) {
  if (req.body !== undefined && req.body.svg !== undefined){
    if (supportedExtensions.indexOf(req.body.format) !== -1){
      var outputFileName = fileName + '.' + req.body.format;
      fs.writeFile(svgFilePath, req.body.svg, function(err){
        if (err) return console.log(err);

        // Just send the SVG if that's what they want
        if (req.body.format === 'svg'){
          res.setHeader('Content-disposition', 'attachment; filename=' + svgFileName);
          res.sendFile(svgFilePath);
        // Otherwise, convert the file, then return it
        } else {
          var imgFilePath = tmpdir + outputFileName;
          convertFile(svgFilePath, imgFilePath, req.body.format).then(function(){
            res.setHeader('Content-disposition', 'attachment; filename=' + outputFileName);
            res.sendFile(imgFilePath);
          });
        }
      });
    } else{
      res.json({error: 'Format "' + req.body.format + '" not supported.'})
    }
  }
}
