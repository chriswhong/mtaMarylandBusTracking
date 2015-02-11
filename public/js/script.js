// This example shows how to use the bounding box of a leaflet view to create a
// SODA within_box query, pulling data for the current map view from a Socrata dataset

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

  // intial data load
  getData();

  //call getData() every 30 seconds
  setInterval(getData, 1000 * 30);

  function getData() {

    //use jQuery's getJSON() to call the trips endpoint
    $.getJSON('/trips', function(data) {

      markers.clearLayers();      

      console.log(data);

      $('#vehicles').text(data.length);

      //iterate over each bus, add a marker to the map
      for (var i = 0; i < data.length; i++) {

        var marker = data[i];
        var markerItem = L.circleMarker(
          [marker.Lat,marker.Lon], {
            radius: 5,
            fillColor: "steelblue",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,
          });

        if (marker.VehicleNumber && curPoints['bus' + marker.VehicleNumber]){
          prevPoints['bus' + marker.VehicleNumber] = JSON.parse(JSON.stringify(curPoints['bus' + marker.VehicleNumber]));
        }

        if (marker.VehicleNumber && marker.Lat && marker.Lon) {
          curPoints['bus' + marker.VehicleNumber] = [marker.Lat,marker.Lon];
        }

        markerItem.bindPopup(
          '<h4>Vehicle Number ' + marker.VehicleNumber + '</h4>' 
          + "Line Direction Id " + marker.LineDirId + '<br/>'
          + "Time " + marker.Time + '<br/>'
          + "Trip ID " + marker.TripId + '<br/>'
        );

        if (marker.VehicleNumber && prevPoints['bus' + marker.VehicleNumber] && (prevPoints['bus' + marker.VehicleNumber][0] !== curPoints['bus' + marker.VehicleNumber][0] || prevPoints['bus' + marker.VehicleNumber][1] !== curPoints['bus' + marker.VehicleNumber][1])){

          lines.addLayer(L.polyline([ prevPoints['bus' + marker.VehicleNumber], curPoints['bus' + marker.VehicleNumber] ], {
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

