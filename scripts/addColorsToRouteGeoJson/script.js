var csv = require("fast-csv");
var fs = require("fs");
var source = require('./local.json');


var stream = fs.createReadStream(__dirname + '/data/routes.txt');

routes = [];

csv
 .fromStream(stream, {headers : true})
 .on("data", function(data){
     routes.push(data);
 })
 .on("end", function(){
   source.features.forEach(function(feature) {
    var p = feature.properties;
    delete p.OBJECTID;

    p.color = lookupColor(p.Route_ID);


    feature.properties = p;


  });

  fs.writeFile(__dirname + '/public/data/localRoutesCleaned.geojson', JSON.stringify(source));

 });


function lookupColor(route_id) {
  console.log(route_id);
  for(var i=0; i<routes.length; i++) {
    if(routes[i].route_id == route_id) {
      console.log("Found a match for route_id " + route_id);
      return routes[i].route_color;
    }
  }
}



