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




  //call getData() once
  getData();

  function getData() {
    //clear markers before getting new ones
    markers.clearLayers();





    //use jQuery's getJSON() to call the SODA API for NYC 311
    $.getJSON('/trips', function(data) {

      console.log(data);

      $('#vehicles').text(data.length);

      //iterate over each 311 complaint, add a marker to the map
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

        markerItem.bindPopup(
          '<h4>Vehicle Number ' + marker.VehicleNumber + '</h4>' 
          + "Line Direction Id " + marker.LineDirId + '<br/>'
          + "Time " + marker.Time + '<br/>'
          + "Trip ID " + marker.TripId + '<br/>'
        );

        markers.addLayer(markerItem);
      }
      //.addTo(map);
      map.addLayer(markers);

      //fade out the loading spinner
      $('#spinnerBox').fadeOut();
    })
  
}

