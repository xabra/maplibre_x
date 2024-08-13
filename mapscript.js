// Define the map syle (OpenStreetMap raster tiles)
const MAX_POINTS = 30000;
const MARKER_CIRCLE_RADIUS = 4;
const map_style = {
    "version": 8,
    "sources": {
        "osm": {
            "type": "raster",
            "tiles": ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            "tileSize": 256,
            "attribution": "&copy; OpenStreetMap Contributors",
            "maxzoom": 19
        }
    },
    "layers": [
        {
            "id": "osm",
            "type": "raster",
            "source": "osm" // This must match the source key above
        }
    ]
};

var map = new maplibregl.Map({
    container: 'map', // container id
    style: map_style, // Source of map data
    center: [-121.9386, 37.4056], // starting position [lng, lat]
    zoom: 8 // starting zoom
});



map.on('load', () => {
    fetch('./stations.json')        // CORS PROBLEM with this: fetch('http://127.0.0.1:3000/api/stations')
        .then((response) => response.json())
        .then((stations) => {
            const geo = build_geojson_stations(stations)
            console.log("Number of stations: ", geo.features.length)
            //Add a data source
            map.addSource('stations_data', {
                'type': 'geojson',
                'data': geo,
            });

            // Add layer to display data
            map.addLayer({
                'id': 'stations_layer',      // 'point' layer
                'source': 'stations_data',
                'type': 'circle',
                'paint': {
                    'circle-radius': MARKER_CIRCLE_RADIUS,
                    'circle-color': [   // Color the circle based on is_selected state
                        'match',
                        ['to-string', ["get", "is_selected"]],
                        'true',
                        '#FF0000',  // is_selected = true
                        'false',
                        '#0000FF',  // is_selected = false
                        '#000000'   // otherwise, use fallback
                    ]
                }
            });
        });
});

// When a click event occurs on a feature in the layer, open a popup at the
// location of the feature, with description HTML from its properties.
map.on('click', 'stations_layer', (e) => {
    let feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    const station_name = feature.properties.station_name;
    const id = feature.id;
    const station_id = feature.properties.station_id;
    console.log("Found ID: ", id);
    map.getSource('stations_data').getData()
        .then((geojson_data) => {
            let feature = geojson_data.features[id];
            const new_is_selected = !feature.properties.is_selected;
            feature.properties.is_selected = new_is_selected; // Toggle selected state
            console.log("New is_selected state: ", new_is_selected);
            map.getSource('stations_data').setData(geojson_data);   // Write the updated data

            // --- SHOW POPUP ---
            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
            new maplibregl.Popup()
                .setLngLat(coordinates)
                .setHTML(
                    `<pre><strong>Station:</strong> ${station_name}\n<strong>ID:</strong> ${station_id}\n<strong>Selected:</strong> ${new_is_selected}</pre>`)
                .addTo(map);
        });


});

// Change the cursor to a pointer when the mouse is over the places layer.
map.on('mouseenter', 'stations_layer', () => {
    map.getCanvas().style.cursor = 'pointer';
});

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'stations_layer', () => {
    map.getCanvas().style.cursor = '';
});

function build_geojson_stations(stations) {
    geojson_array = [];
    var index = 0;
    for (const station of stations) {
        //console.log(">>>", index, station.station_name, station.longitude, station.latitude, station.station_id, typeof station.station_id);
        if (index < MAX_POINTS) {       //snip-- && station.station_id.substring(0, 2) == 'US' 
            geojson_array.push(
                {
                    "type": "Feature",
                    "geometry": {
                        type: "Point",
                        coordinates: [station.longitude, station.latitude]
                    },
                    "id": index,    // Must be a number, not alphanumeric
                    "properties": {
                        station_name: station.station_name,
                        is_selected: false,
                        station_id: station.station_id,
                    }
                }
            );
            index += 1;
        }

    }
    // Embed the geometry array in the geojson header
    const geojson_obj = {
        type: "FeatureCollection",
        features: geojson_array,
    }
    return geojson_obj;
}

