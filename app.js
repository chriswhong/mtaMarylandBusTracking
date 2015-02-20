var express = require('express'),
  bodyParser = require('body-parser'),
  fs = require('fs'),
  Trips = require('./api/trips'),
  mongo = require('mongodb'),
  gtfs = require('./gtfs'),
  jsonxml = require('jsontoxml'),
  request = require('request'),
  xml2js = require('xml2js'),
  moment = require('moment');

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

    app.get('/save', function(req, res) {
      var trips = new Trips({
        allRoutes: JSON.parse(data),
        db: db,
        cacheLatency: 30
      });
      trips.logData(req, res);
    });

    app.get('/history/:route_id', function(req, res) {
      var trips = new Trips({
        allRoutes: JSON.parse(data),
        db: db,
        cacheLatency: 30
      });
      trips.getHistory(req,res);
    });

    //proxy API for getBusTimes
    app.get('/bustimes/:stop_id', function(req, res) {
      getBusTimes(req,res);
    });

    function getBusTimes(req,res) {
      console.log(req.params);
    

      var payload = {
        'GetBusTimes' : {
          'LinesRequest' : {
            'StopId': req.params.stop_id,
            'Radius': 0,
            'GetStopTimes': 1,
            'Date': moment().format('MM-DD-YYYY'),
            'NumStopTimes': 20,
            'GetStopTripInfo': 1,
            'SuppressLinesUnloadOnly': 1,
            'FromTime':moment().format('h:mma').slice(0,-1), //time now as h:mma
            'ToTime': '4:59a',
            'Client':'InfoWeb'
          }
        }
      }

      var xml = jsonxml(payload);

      var xmlStartString = '<?xml version="1.0" encoding="UTF-8"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><SOAP-ENV:Body>';
      var xmlEndString = '</SOAP-ENV:Body></SOAP-ENV:Envelope>'

      var xmlPayload = xmlStartString + xml + xmlEndString;
      xmlPayload = xmlPayload.replace('<Date>','<Date tcftype="1e0210">')
        .replace('<FromTime>','<FromTime tcftype="140010">')
        .replace('<ToTime>','<ToTime tcftype="140010">');

      console.log(xmlPayload);

      request.post({
        headers: {
          'content-type': 'text/xml; charset=UTF-8'
        },
        url: 'http://mybustracker.mta.maryland.gov/InfoWeb',
        body: xmlPayload
      }, function(error, response, body) {
        var parser = new xml2js.Parser();
        parser.parseString(body, function (err, result) {
          console.log(result);
          res.send(result);
        });
        
      });


 
// var parser = new xml2js.Parser();
// fs.readFile(__dirname + '/foo.xml', function(err, data) {
//     parser.parseString(data, function (err, result) {
//         console.dir(result);
//         console.log('Done');
//     });
// });

      // <GetBusTimes>
      //    <LinesRequest>
      //       <StopId>103</StopId>
      //       <Radius>0</Radius>
      //       <GetStopTimes>1</GetStopTimes>
      //       <Date tcftype="1e0210">02-20-2015</Date>
      //       <NumStopTimes>20</NumStopTimes>
      //       <GetStopTripInfo>1</GetStopTripInfo>
      //       <SuppressLinesUnloadOnly>1</SuppressLinesUnloadOnly>
      //       <FromTime tcftype="140010">10:44a</FromTime>
      //       <ToTime tcftype="140010">4:59a</ToTime>
      //       <Client>InfoWeb</Client>
      //    </LinesRequest>
      // </GetBusTimes>



    }

    //Adding endpoints from the node-gtfs example app.  I need some help putting them into their own external file.
       
    app.get('/agencies', function(req, res, next) {
      gtfs.agencies(function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No agencies in database'});
      });
    });

    app.get('/agenciesNearby/:lat/:lon/:radiusInMiles', function(req, res, next) {
      var lat = req.params.lat,
          lon = req.params.lon,
          radius = req.params.radiusInMiles;
      gtfs.getAgenciesByDistance(lat, lon, radius, function(e, data){
        if(e) return next(e);
        res.send( data || {error: 'No agencies within radius of ' + radius + ' miles'});
      });
    });


    app.get('/agenciesNearby/:lat/:lon', function(req, res, next) {
      var lat = req.params.lat,
          lon = req.params.lon;
      gtfs.getAgenciesByDistance(lat, lon, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No agencies within default radius'});
      });
    });


    /* Routelist */
    app.get('/routes/:agency', function(req, res, next) {
      var agency_key = req.params.agency;
      gtfs.getRoutesByAgency(agency_key, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No routes for agency_key ' + agency_key});
      });
    });


    app.get('/routesNearby/:lat/:lon/:radiusInMiles', function(req, res, next) {
      var lat = req.params.lat,
          lon = req.params.lon,
          radius = req.params.radiusInMiles;
      gtfs.getRoutesByDistance(lat, lon, radius, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No routes within radius of ' + radius + ' miles'});
      });
    });


    app.get('/routesNearby/:lat/:lon', function(req, res, next) {
      var lat = req.params.lat,
          lon = req.params.lon;
      gtfs.getRoutesByDistance(lat, lon, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No routes within default radius'});
      });
    });


    /* Shapes */
    app.get('/shapes/:agency/:route_id/:direction_id', function(req, res, next) {
      var agency_key = req.params.agency,
          route_id = req.params.route_id,
            direction_id = parseInt(req.params.direction_id,10);
      gtfs.getShapesByRoute(agency_key, route_id, direction_id, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No shapes for agency/route/direction combination.'});
      });
    });


    app.get('/shapes/:agency/:route_id', function(req, res, next) {
      var agency_key = req.params.agency,
          route_id = req.params.route_id
      gtfs.getShapesByRoute(agency_key, route_id, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No shapes for agency/route combination.'});
      });
    });


    /* Stoplist */
    app.get('/stops/:route_id/:direction_id', function(req, res ,next) {
      var agency_key = "maryland-transit-administration",
          route_id = req.params.route_id,
            direction_id = parseInt(req.params.direction_id,10);
      gtfs.getStopsByRoute(agency_key, route_id, direction_id, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No stops for agency/route/direction combination.'});
      });
    });


    app.get('/stops/:agency/:route_id', function(req, res, next) {
      var agency_key = req.params.agency,
          route_id = req.params.route_id;
      gtfs.getStopsByRoute(agency_key, route_id, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No stops for agency/route combination.'});
      });
    });


    app.get('/stopsNearby/:lat/:lon/:radiusInMiles', function(req, res, next) {
      var lat = req.params.lat
          lon = req.params.lon
            radius = req.params.radiusInMiles;
      gtfs.getStopsByDistance(lat, lon, radius, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No stops within radius of ' + radius + ' miles'});
      });
    });


    app.get('/stopsNearby/:lat/:lon', function(req, res, next) {
      var lat = req.params.lat,
          lon = req.params.lon;
      gtfs.getStopsByDistance(lat, lon, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No stops within default radius'});
      });
    });


    /* Times */
    app.get('/times/:agency/:route_id/:stop_id/:direction_id', function(req, res, next) {
      var agency_key = req.params.agency,
          route_id = req.params.route_id,
          stop_id = req.params.stop_id,
          direction_id = parseInt(req.params.direction_id,10);
      gtfs.getTimesByStop(agency_key, route_id, stop_id, direction_id, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No times for agency/route/stop/direction combination.'});
      });
    });


    app.get('/times/:agency/:route_id/:stop_id', function(req, res, next) {
      var agency_key = req.params.agency,
          route_id = req.params.route_id,
            stop_id = req.params.stop_id;
      gtfs.getTimesByStop(agency_key, route_id, stop_id, function(e, data) {
        if(e) return next(e);
        res.send( data || {error: 'No times for agency/route/stop combination.'});
      });
    });

    //Custom GTFS endpoint to get today's trips for a single route, will be used
    //to show the scheduled trips.

    app.get('/schedule/:route_id', function(req, res, next) {
      var route_id = req.params.route_id;

      gtfs.getSchedule('maryland-transit-administration', route_id, function(e, data) {
        //console.log(data);
        if(e) return next(e);
        res.send( data || {error: 'ERROR'});
      });
    });


  });
});