// This example shows how to use the bounding box of a leaflet view to create a
// SODA within_box query, pulling data for the current map view from a Socrata dataset
var currentData, 
  currentRoutes;
  //initialize the leaflet map, set options, view, and basemap
  var map = L.map('map', {
      //zoomControl: false,
      //scrollWheelZoom: false
    })
    .setView([39.2833, -76.6167], 12);

  L.tileLayer(
    'http://openmapsurfer.uni-hd.de/tiles/roadsg/x={x}&y={y}&z={z}', {
      minZoom: 0,
      maxZoom: 19,
      attribution: 'Imagery from <a href="http://giscience.uni-hd.de/">GIScience Research Group @ University of Heidelberg</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

  var markers = new L.FeatureGroup();
  var lines = new L.FeatureGroup();

  var prevPoints = {};
  var curPoints = {};

  loadRoutes();



  //call getData() every 30 seconds
  setInterval(getData, 1000 * 30);

  function getData() {

    //use jQuery's getJSON() to call the trips endpoint
    $.getJSON('/vehicles', function(resp) {

      currentData = resp.data;

      markers.clearLayers();      

      $('#vehicles').text(currentData.length);

      //iterate over each bus, add a marker to the map
      for (var i = 0; i < currentData.length; i++) {

        var marker = currentData[i];
        //console.log(marker);
        var markerItem = L.circleMarker(
          [marker.location.lat,marker.location.lon], {
            radius: 4,
            fillColor: "steelblue",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.9,
            className: "circlePath " + marker.lineId.toString()
          });

         if (marker.tripId && curPoints['bus' + marker.tripId]){
           prevPoints['bus' + marker.tripId] = JSON.parse(JSON.stringify(curPoints['bus' + marker.tripId]));
         }

        if (marker.tripId && marker.location.lat && marker.location.lon) {
          curPoints['bus' + marker.tripId] = [marker.location.lat,marker.location.lon];
        }

      

        markerItem.bindPopup(
          '<h4>Vehicle Number ' + marker.vehicleNumber + '</h4>' 
          + "Name " + marker.number + " " + marker.name + '<br/>'
          + "Direction " + marker.direction + '<br/>'
          + "Trip ID " + marker.tripId + '<br/>'
        );

        if (marker.tripId && prevPoints['bus' + marker.tripId] && (prevPoints['bus' + marker.tripId][0] !== curPoints['bus' + marker.tripId][0] || prevPoints['bus' + marker.tripId][1] !== curPoints['bus' + marker.tripId][1])){

          lines.addLayer(L.polyline([ prevPoints['bus' + marker.tripId], curPoints['bus' + marker.tripId] ], {
            color: 'blue'
          })).addTo(map);

        }

        markers.addLayer(markerItem);
      }
      //.addTo(map);
      map.addLayer(markers);
      map.addLayer(lines);

      //fade out the loading spinner
      $('#spinnerBox').fadeOut();
    })
  
}

//load routes from geoJSON
function loadRoutes() {
  var svg = d3.select(map.getPanes().overlayPane).append("svg"),
    g = svg.append("g").attr("class", "leaflet-zoom-hide");

  $.getJSON("./data/localRoutesCleaned.geojson", function(data){
    currentRoutes = data;
    data.features.forEach(function(feature){
      $('#rightSideBar').append(buildRouteListItem(feature.properties));
    });
    

    //listeners created AFTER the sidebar is populated
    $('.route').hover(function() {
      $(this).toggleClass('highlight');
      var selectedRoute = $(this).attr('route_id');
      filterMap(selectedRoute);
    });

    // var geojsonLayer = L.geoJson(data,{
    //   style: function(feature) {
    //     console.log(feature);
    //     return {
    //       "color": "#" + feature.properties.color,
    //       "weight": 1.5,
    //       "opacity": 0.5
    //     };
    //   }
    // }).addTo(map);

var transform = d3.geo.transform({point: projectPoint}),
      path = d3.geo.path().projection(transform);

  var feature = g.selectAll("path")
      .data(data.features)
    .enter()
    .append("path")
    .attr('stroke',function(d){
      return '#' + d.properties.color;
    })
    .attr('class',function(d){
      return 'routePath ' + d.properties.Route_ID;
    });

  map.on("viewreset", reset);
  reset();

  // Reposition the SVG to cover the features.
  function reset() {
    var bounds = path.bounds(data),
        topLeft = bounds[0],
        bottomRight = bounds[1];

    svg .attr("width", bottomRight[0] - topLeft[0])
        .attr("height", bottomRight[1] - topLeft[1])
        .style("left", topLeft[0] + "px")
        .style("top", topLeft[1] + "px");

    g   .attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

    feature.attr("d", path);
  }

  // Use Leaflet to implement a D3 geometric transformation.
  function projectPoint(x, y) {
    var point = map.latLngToLayerPoint(new L.LatLng(y, x));
    this.stream.point(point.x, point.y);
  }


  });  //getJSON

    getData();
}

function buildRouteListItem(p) {
  var textColor;
  (p.color == 'FFFF00') ? textColor = '#444' : textColor = '';

  var s = '';
  s += '<div class ="route route' + p.Route_ID + '" route_id=' + p.Route_ID + '>';
  s += '<span class = "routeNumber" style = "background-color:#'+ p.color +';color:' + textColor + '">' + p.Route_Numb + '</span>';
  s += '<span class = "routeName">' + p.Route_Name + '</span>';
  s += '</div>';
  return s;

}


function filterMap(route_id) {
  $('.routePath, .circlePath').not('.' + route_id).fadeOut(200);
  $('.' + route_id).fadeIn(200);

  $('#routeName').text(getRouteName(route_id));

  $('#buses').text(countVehicles(route_id));

}

function getRouteName(route_id) {
  for(var i=0;i<currentRoutes.features.length;i++) {
    var f = currentRoutes.features[i].properties;
    if (f.Route_ID==route_id) {
      return f.Route_Numb + " " + f.Route_Name;
    }
  }
}

function countVehicles(route_id) {
  var count = 0;
  for(var i=0; i<currentData.length; i++) {
    if (currentData[i].lineId == route_id) {
      count++;
    }
  }
  return count;
}

//D3 Line Chart based on http://bl.ocks.org/mbostock/3902569
var margin = {top: 20, right: 20, bottom: 40, left: 40},
    width = $('#chartBox').width() - margin.left - margin.right,
    height = $('#chartBox').height() - margin.top - margin.bottom;

    console.log(height);

var parseDate = d3.time.format.iso.parse,
    bisectDate = d3.bisector(function(d) { return d.timestamp; }).left;
    // formatValue = d3.format(",.2f"),
    // formatCurrency = function(d) { return "$" + formatValue(d); };

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .interpolate("basis") 
    .x(function(d) { return x(d.timestamp); })
    .y(function(d) { return y(d.count); });

var svg2 = d3.select("#chartBox").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.json("/history", function(error, data) {
  console.log(data.data);

  data = data.data;

  data.forEach(function(d) {

    d.timestamp = parseDate(d.timestamp);

  });

  data.sort(function(a, b) {
    return a.timestamp - b.timestamp;
  });

  x.domain([data[0].timestamp, data[data.length - 1].timestamp]);
  y.domain(d3.extent(data, function(d) { return d.count; }));

  svg2.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg2.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Buses Reporting");

  svg2.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);

  var focus = svg2.append("g")
      .attr("class", "focus")
      .style("display", "none");

  focus.append("circle")
      .attr("r", 4.5);

  focus.append("text")
      .attr("x", 9)
      .attr("dy", ".35em");

  svg2.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", height)
      .on("mouseover", function() { focus.style("display", null); })
      .on("mouseout", function() { focus.style("display", "none"); })
      .on("mousemove", mousemove);

  function mousemove() {
    var x0 = x.invert(d3.mouse(this)[0]),
        i = bisectDate(data, x0, 1),
        d0 = data[i - 1],
        d1 = data[i],
        d = x0 - d0.timestamp > d1.timestamp - x0 ? d1 : d0;
    focus.attr("transform", "translate(" + x(d.timestamp) + "," + y(d.count) + ")");
    focus.select("text").text(d.count);
  }
});

