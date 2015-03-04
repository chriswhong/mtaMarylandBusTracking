var request = require('request'),
	moment = require('moment');

moment().format();

var Trips = function(config) {
	this.init(config);
};

Trips.prototype.init = function(config) {
	for (var prop in config) this[prop] = config[prop];
	this.payloadString = {
		"version": "1.1",
		"method": "GetTravelPoints",
		"params": {
			"travelPointsReqs": this.allRoutes,
			"interval": 1
		}
	};
	this.trips = config.db.collection('trips');
	this.logs = config.db.collection('logs');
};

Trips.prototype.logData = function(req, res) {
	var ME = this;
	console.log("Logging Data!");
	ME.getCurrentFromMTAForSave(function(data) {
		console.log(data);
		response = ME.cleanDataForSave(data);

		console.log(response);

		response.forEach(function(tripLog){
			ME.logs.insert(tripLog, function() {
				console.log("Wrote a log to the DataBase");
			});
		})


		res.json({
			data: response
		});
	})
}



Trips.prototype.getCurrent = function(req, res) {
	var ME = this;

	this.getCurrentFromDB(function(data) {
		data = false; //force get from MTA while we sort out the data structure
		if (data === false) {
			ME.getCurrentFromMTA(function(data) {
				response = ME.cleanData(data);
				res.json({
					data: response
				});
			});
		} else {
			response = ME.cleanData(data);
			
			res.json({
				data: response
			});
		}
	});
};

Trips.prototype.export = function(req,res) {
	var ME = this;
	var route_id = req.params.route_id;

	// var query = { 
	// 	'lineId': parseInt(route_id)
	// }

	var query = {};

	console.log(query);

	this.logs.find(query).toArray(function(err, results) {
		console.log("Results: " + results.length);
		if (err) {
			//cb(false);
		}

		var result = [];

    res.contentType('csv');

    results.forEach(function(row) {
    	res.write(row.timestamp + ',');
    	res.write(row.location.lat + ',');
    	res.write(row.location.lon + ',');
    	res.write(row.lineId + ',');
    	res.write(row.directionId + ',');
    	res.write(row.tripId + ',');
    	res.write(row.vehicleNumber + ',');
    	res.write('\n');

    });

    res.end();

	});


};

//This endpoint serves up a count of real-time vehicles reporting during a given minute 
//over the last 24 hours
Trips.prototype.getGlobalHistory = function(req, res) {
	var ME = this;
	var route_id = req.params.route_id;


	var oneDayAgo = moment().subtract(24, 'hours');
	
	console.log(oneDayAgo.format());

	this.logs.aggregate([
	{  
    $match:{  
      timestamp:{  
        $gt:oneDayAgo.toDate()
      }
    }
  },  
  {  
    $group:{  
      _id:{  
        year:{  
          $year:"$timestamp"
        },
        month:{  
          $month:"$timestamp"
        },
        day:{  
          $dayOfMonth:"$timestamp"
        },
        hour:{  
          $hour:"$timestamp"
        },
        minute:{  
          $minute:"$timestamp"
        }
      },
      count:{  
        $sum:1
      }
    }
  }
],function (err, results){

		

		//format the results, combine the date components into a datestring.  Moment will help
		results.forEach(function(result) {
			var t = result._id;
			var timeString = t.year + "-" + t.month + "-" + t.day + " " + t.hour + ":" + t.minute + " -5:00";
 			result.timestamp = moment(timeString,"YYYY-MM-DD HH:mm ZZ").format();
 			delete result._id;
		});

		console.log(results);

		res.json({
				data: results
		});
	});

	
};


Trips.prototype.getHistory = function(req, res) {
	var ME = this;
	var route_id = req.params.route_id;

	//console.log(trip_id);

	//get time from 3 hours ago

	var fourHoursAgo = moment().subtract(4, 'hours');
	//console.log(time.format());

	// var query = { 
	// 	'timestamp': {$gt: fourHoursAgo.toISOString()},
	// 	'lineId': parseInt(route_id)
	//}

	//console.log(query);

	// this.logs.find(query).toArray(function(err, results) {
	// 	console.log(results);
	// 	if (err) {
	// 		//cb(false);
	// 	}
	// 	res.json({
	// 			data: results
	// 	});
	// });

	this.logs.aggregate([
	{	
		$match:{lineId:7379}
			
	},
	{
		$group:{
			_id:'$tripId',
			count: { $sum: 1 }
		}
	}
	],function (err, result){
		console.log(result);
		res.json({
				data: result
		});
	});

	
};

Trips.prototype.getCurrentFromMTAForSave = function(cb) {
	var ME = this;

	console.log(ME.payloadString.params.travelPointsReqs);

	request.post({
		headers: {
			'content-type': 'application/json'
		},
		url: 'http://realtimemap.mta.maryland.gov/RealTimeManager',
		body: JSON.stringify(ME.payloadString)
	}, function(error, response, body) {
		console.log(body);
		var data = JSON.parse(body);
		cb(data);
		//data.reqTime = new Date();
		//ME.trips.insert(data, function() {
		// 	console.log('inserted new trip data for ' + data.reqTime);
		// });
	});
};


Trips.prototype.getCurrentFromMTA = function(cb) {
	var ME = this;
	request.post({
		headers: {
			'content-type': 'application/json'
		},
		url: 'http://realtimemap.mta.maryland.gov/RealTimeManager',
		body: JSON.stringify(ME.payloadString)
	}, function(error, response, body) {
		console.log("From MTA: " + body);
		var data = JSON.parse(body);
		cb(data);
		data.reqTime = new Date();
		ME.trips.insert(data, function() {
			console.log('inserted new trip data for ' + data.reqTime);
		});
	});
};

Trips.prototype.getCurrentFromDB = function(cb) {
	var ME = this,
		current = new Date(),
		query = {
			reqTime: {
				"$gte": new Date(new Date().setSeconds(current.getSeconds() - ME.cacheLatency))
			}
		};
	this.trips.find(query).toArray(function(err, results) {
		if (err) {
			cb(false);
		}
		cb((results.length) ? results[0] : false);
	});
};

Trips.prototype.cleanData = function(rawData) {

	var ME = this,
		cleanData = []

	rawData.result.travelPoints.forEach(function(line) {
		if (line.EstimatedPoints) {
			var e = line.EstimatedPoints[0];
			lineInfo = ME.getLineInfo(line.EstimatedPoints[0].LineDirId);
			var vehicle = {
				timestamp: moment().format(),
				location: {
					lat: e.Lat,
					lon: e.Lon
				},
				heading: Math.round(e.Heading),
				lineId: Math.round(e.LineDirId/10),
				directionId: (e.LineDirId & 1) ? 1 : 0,
				direction: lineInfo.direction,
				number: lineInfo.number,
				name: lineInfo.name,
				tripId: e.TripId,
				vehicleNumber: line.VehicleNumber
			}

			cleanData.push(vehicle);
		};
	});

	return cleanData;
};

Trips.prototype.cleanDataForSave = function(rawData) {

	console.log(rawData);

	var ME = this,
		cleanData = [];

	rawData.result.travelPoints.forEach(function(line) {
		if (line.EstimatedPoints) {
			var e = line.EstimatedPoints[0];
			var vehicle = {
				timestamp: moment().toDate(),
				location: {
					lat: e.Lat,
					lon: e.Lon
				},
				lineId: Math.round(e.LineDirId/10),
				directionId: (e.LineDirId & 1) ? 1 : 0,
				tripId: e.TripId,
				vehicleNumber: parseInt(line.VehicleNumber)
			}

			cleanData.push(vehicle);
		};
	});

	return cleanData;
};


Trips.prototype.getLineInfo = function(lineDirId) {
	lineDirId = lineDirId + '';
	var lineInfo = {};
	this.allRoutes.forEach(function(line) {
		if (lineDirId === line.lineDirId) {
			lineInfo.name = line.name;
			lineInfo.number = line.number;
		}
	});
	return lineInfo
};

module.exports = Trips;