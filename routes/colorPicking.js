var http = require('http');

exports.makePalette = function sampleView(req, res) {
  console.log(req.body);
  var data = JSON.stringify({
    paletteSize: req.body.paletteSize ? req.body.paletteSize : 1
  });

  var header = {
    host: 'localhost',
    port: 8888,
    path: '/color/makePalette',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  var httpreq = http.request(header, function(response) {
    response.setEncoding('utf8');
    response.on('data',function(data){
      data = JSON.parse(data);
      console.log(data.palette);
      res.json({palette: data.palette.map(function(d) {
        return {l:d[0], a:d[1], b:d[2]}; // returns in CIELAB color space
      })});
    });
  });
  httpreq.write(data);
  httpreq.end();
}
