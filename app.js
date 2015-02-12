var express = require('express'),
  bodyParser = require('body-parser'),
  fs = require('fs'),
  Trips = require('./api/trips'),
  mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/mtamdbustrack';

fs.readFile(__dirname + '/data/allRoutes.json', {
  encoding: 'UTF-8'
}, function read(err, data) {
  if (err) {
    console.log('Could not load route file', err);
    return;
  }

  mongo.Db.connect(mongoUri, {
    auto_reconnect: true
  }, function(err, db) {
    if (err) throw err;
    console.log("Connected to database");

    var app = express();

    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
      extended: true
    }));

    var server = app.listen(process.env.PORT || 5000, function() {
      var port = server.address().port;
      console.log("Node app listening on port " + port + "...");
    });

    app.get('/trips', function(req, res) {
      var trips = new Trips({
        allRoutes: JSON.parse(data),
        db: db,
        cacheLatency: 30
      });
      trips.getCurrent(req, res);
    });
  });
});