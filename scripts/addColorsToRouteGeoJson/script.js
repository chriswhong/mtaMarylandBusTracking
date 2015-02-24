var csv = require("fast-csv");
var fs = require("fs");
var source = require('./local.json');


var stream = fs.createReadStream(__dirname + '/routes.txt');

routes = [];

//read each line of routes.txt, push each to routes[],


csv
 .fromStream(stream, {headers : true})
 .on("data", function(data){
     routes.push(data);
 })
 .on("end", function(){
   source.features.forEach(function(feature) {
    var p = feature.properties;
    delete p.OBJECTID;

    var newData = lookupColor(p.Route_Numb);
    p.Route_ID = newData.route_id;
    p.color = newData.color;

    feature.properties = p;

    console.log(feature);


  });

  fs.writeFile(__dirname + '/localRoutesCleaned.geojson', JSON.stringify(source));

 });


function lookupColor(route_numb) {
  console.log(route_numb);
  for(var i=0; i<routes.length; i++) {
    if(routes[i].route_short_name == route_numb) {
      console.log("Found a match for route number " + route_numb);
      var newData = {
        'color':routes[i].route_color,
        'route_id':routes[i].route_id
      }
      return newData;
    }
  }
}



