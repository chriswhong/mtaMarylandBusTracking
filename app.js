var express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  fs = require('fs');


var app = express();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

var server = app.listen(process.env.PORT || 5000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log("Node app listening on port " + port + "...");
});

var payloadString = {"version":"1.1","method":"GetTravelPoints","params":{"travelPointsReqs":[{"lineDirId":"70840"},{"lineDirId":"70841"},{"lineDirId":"70850"},{"lineDirId":"70851"},{"lineDirId":"70860"},{"lineDirId":"70861"},{"lineDirId":"70870"},{"lineDirId":"70871"},{"lineDirId":"70880"},{"lineDirId":"70881"},{"lineDirId":"70890"},{"lineDirId":"70891"},{"lineDirId":"70900"},{"lineDirId":"70901"},{"lineDirId":"70910"},{"lineDirId":"70911"},{"lineDirId":"70920"},{"lineDirId":"70921"},{"lineDirId":"70930"},{"lineDirId":"70931"},{"lineDirId":"70940"},{"lineDirId":"70941"},{"lineDirId":"70950"},{"lineDirId":"70951"},{"lineDirId":"70960"},{"lineDirId":"70961"},{"lineDirId":"70970"},{"lineDirId":"70971"},{"lineDirId":"70980"},{"lineDirId":"70981"},{"lineDirId":"70990"},{"lineDirId":"70991"},{"lineDirId":"71000"},{"lineDirId":"71001"},{"lineDirId":"71010"},{"lineDirId":"71011"},{"lineDirId":"71020"},{"lineDirId":"71021"},{"lineDirId":"71030"},{"lineDirId":"71031"},{"lineDirId":"71040"},{"lineDirId":"71041"},{"lineDirId":"71050"},{"lineDirId":"71051"},{"lineDirId":"71060"},{"lineDirId":"71061"},{"lineDirId":"71070"},{"lineDirId":"71080"},{"lineDirId":"71081"},{"lineDirId":"71090"},{"lineDirId":"71091"},{"lineDirId":"71100"},{"lineDirId":"71101"},{"lineDirId":"71110"},{"lineDirId":"71111"},{"lineDirId":"71120"},{"lineDirId":"71121"},{"lineDirId":"71130"},{"lineDirId":"71131"},{"lineDirId":"71140"},{"lineDirId":"71141"},{"lineDirId":"71150"},{"lineDirId":"71151"},{"lineDirId":"71160"},{"lineDirId":"71161"},{"lineDirId":"71170"},{"lineDirId":"71171"},{"lineDirId":"71180"},{"lineDirId":"71181"},{"lineDirId":"71190"},{"lineDirId":"71200"},{"lineDirId":"71201"},{"lineDirId":"71210"},{"lineDirId":"71211"},{"lineDirId":"71220"},{"lineDirId":"71221"},{"lineDirId":"71230"},{"lineDirId":"71231"},{"lineDirId":"71240"},{"lineDirId":"71241"},{"lineDirId":"71250"},{"lineDirId":"71251"},{"lineDirId":"71260"},{"lineDirId":"71261"},{"lineDirId":"71270"},{"lineDirId":"71271"},{"lineDirId":"71280"},{"lineDirId":"71281"},{"lineDirId":"71290"},{"lineDirId":"71291"},{"lineDirId":"71300"},{"lineDirId":"71301"},{"lineDirId":"71310"},{"lineDirId":"71311"},{"lineDirId":"71320"},{"lineDirId":"71321"},{"lineDirId":"71340"},{"lineDirId":"71341"},{"lineDirId":"71350"},{"lineDirId":"71351"},{"lineDirId":"71360"},{"lineDirId":"71370"},{"lineDirId":"71380"},{"lineDirId":"71381"},{"lineDirId":"71390"},{"lineDirId":"71391"},{"lineDirId":"71410"},{"lineDirId":"71411"},{"lineDirId":"71420"},{"lineDirId":"71421"},{"lineDirId":"71430"},{"lineDirId":"71431"},{"lineDirId":"71440"},{"lineDirId":"71441"},{"lineDirId":"71450"},{"lineDirId":"71451"},{"lineDirId":"71460"},{"lineDirId":"71461"},{"lineDirId":"71470"},{"lineDirId":"71471"},{"lineDirId":"71480"},{"lineDirId":"71481"},{"lineDirId":"71530"},{"lineDirId":"71531"},{"lineDirId":"71540"},{"lineDirId":"71541"},{"lineDirId":"71550"},{"lineDirId":"71551"},{"lineDirId":"71650"}],"interval":1}};

app.get('/trips',function (req, res) {

	request.post({
	  headers: {'content-type' : 'application/json'},
	  url:     'http://realtimemap.mta.maryland.gov/RealTimeManager',
	  body:    JSON.stringify(payloadString)
	}, function(error, response, body){
	  var routeJson = JSON.parse(body);
    //console.log(routeJson.result);
    response = transform(routeJson);
    res.json(response);
	});

  //res.status(204).json({});

});

function transform (rawData) {

  var cleanData = []

  rawData.result.travelPoints.forEach(function(line){
    if (line.EstimatedPoints) {
      line.EstimatedPoints[0].VehicleNumber = line.VehicleNumber;
      cleanData.push(line.EstimatedPoints[0]);
    };
  });

  console.log(cleanData);
  return cleanData;
};