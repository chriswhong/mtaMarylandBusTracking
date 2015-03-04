var express = require('express'),
  bodyParser = require('body-parser'),
  fs = require('fs'),
  Trips = require('./api/trips'),
  mongo = require('mongodb'),
  gtfs = require('./gtfs'),
  request = require('request'),
  moment = require('moment');

var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/mtamdbustrack';

fs.readFile(__dirname + '/data/routes.txt', {
  encoding: 'UTF-8'
}, function read(err, data) {
  if (err) {
    console.log('Could not load route file', err);
    return;
  }

  // low brow CSV parsing
  var routes = [],
    dataRows = data.split('\n');

  dataRows.forEach(function(row) {
    var rowData = row.split(',');
    if (parseInt(rowData[0],10) !== NaN) {
      routes.push({
        lineDirId: rowData[0] + '0',
        number: rowData[2],
        name: rowData[3]
      });
      routes.push({
        lineDirId: rowData[0] + '1',
        number: rowData[2],
        name: rowData[3]
      });
    }
  });

  mongo.Db.connect(mongoUri, {
    auto_reconnect: true
  }, function(err, db) {
    if (err) throw err;
    console.log("Connected to database");

    var app = express();

    app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    app.use(express.static(__dirname + '/public'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
      extended: true
    }));



    var server = app.listen(process.env.PORT || 5000, function() {
      var port = server.address().port;
      console.log("Node app listening on port " + port + "...");
    });

    app.get('/vehicles', function(req, res) {
      var trips = new Trips({
        allRoutes: routes,
        db: db,
        cacheLatency: 30
      });
      trips.getCurrent(req, res);
    });

    app.get('/save', function(req, res) {
      var trips = new Trips({
        allRoutes: routes,
        db: db,
        cacheLatency: 30
      });
      trips.logData(req, res);
    });

    app.get('/history', function(req, res) {
      var trips = new Trips({
        allRoutes: routes,
        db: db,
        cacheLatency: 30
      });
      trips.getGlobalHistory(req,res);
    });

    app.get('/history/:route_id', function(req, res) {
      var trips = new Trips({
        allRoutes: routes,
        db: db,
        cacheLatency: 30
      });
      trips.getHistory(req,res);
    });

    //export from realtime logs for a given route
    app.get('/export/:route_id', function(req, res) {
      var trips = new Trips({
        allRoutes: routes,
        db: db,
        cacheLatency: 30
      });
      trips.export(req,res);
    });

    //proxy API for getBusTimes
    app.get('/stoptimes/:stop_id', function(req, res) {
      getStopTimes(req,res);
    });

    function getStopTimes(req,res) {
      console.log(req.params);
    
      //build a payload to POST
      var payload =  {  
        "version":"1.1",
        "method":"GetBusTimes",
        "params":{  
          "stopId":req.params.stop_id,
          "Radius":-1,
          "NumTimesPerLine":5,
          "NumStopTimes":20
        }
      }

      //POST it
      request.post({
        headers: {
          'content-type': 'application/json'
        },
        url: 'http://realtimemap.mta.maryland.gov/InfoWeb',
        body: JSON.stringify(payload)
      }, function(error, response, body) {

        console.log(body);

        body = JSON.parse(body);

        if(body.result[0].StopTimeResult[0].StopTimes) { //TODO figure out how to validate the response, this keeps crashing

        var stops = body.result[0].StopTimeResult[0].StopTimes;

        var cleanStops = [];

        //clean up the stops data
        stops.forEach(function(stop){
          var newStop = {
            'route_number': stop.LineAbbr,
            'route_name': stop.LineName,
            'direction_name': stop.DirectionName,
            'route_id': parseInt(stop.LineDirId.toString().slice(0,-1)),
            'stop_time': moment().zone(300).startOf('day').add(stop.ETime,'seconds').format(), //if between midnight and 4:59 am, need to roll back to previous day's start?
            'realtime' : realTimeStatus(stop)
          }

          cleanStops.push(newStop);

        });

        //build a new object to response, stops data from above is a child object
        var stopInfo = {
          'stop_id': req.params.stop_id,
          'stop_name': body.result[0].StopTimeResult[0].Lines[0].StopName,
          'stop_times': cleanStops,
          'timestamp': moment().format()
        }

        res.json(stopInfo);

        //This is some trickery to figure out whether there is real-time data available
        //it compares the stops from stopTimes[] with those in RealTimeResults[]
        //Basically mimicking the technique used by the vendor in 
        //http://realtimemap.mta.maryland.gov/file/apps/fixedroute/customerinfo/javascript/info_realtime.js line 623

        function realTimeStatus(stop) {
          var realTimeStops = body.result[0].RealTimeResults;

          for (var i=0; i<realTimeStops.length; i++) {
            var s = stop;
            var r = realTimeStops[i];
            if((s.TripId == r.TripId) && (s.BlockId == r.BlockId) && (r.Lat != 0 && r.Lon != 0) && !r.IgnoreAdherence) {
              return true
            }
          }

          return false;

        }

        } else { 
          res.send('no buses for this stop ');
        }
      });
    }
  });
});