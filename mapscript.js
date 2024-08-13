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

// Create a popup, but don't add it to the map yet.
const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false
});

map.on('load', () => {
    fetch('./stations.json')
        //fetch('http://127.0.0.1:3000/api/stations') // CORS PROBLEM with this
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

// When a click event occurs on a feature in the layer toggle it's is_selected property
map.on('click', 'stations_layer', (e) => {
    // Get the id (index) of the clicked feature from the event
    const id = e.features[0].id;

    // Get the geojson data from the map source
    map.getSource('stations_data').getData()
        .then((geojson_data) => {
            // Find the clicked feature by id
            let feature = geojson_data.features[id];

            // Toggle it's is_selected state
            const new_is_selected = !feature.properties.is_selected;
            feature.properties.is_selected = new_is_selected;
            console.log(`User clicked feature ID: ${id}.  Selected = ${new_is_selected}`);

            // Write updated data to map source
            map.getSource('stations_data').setData(geojson_data);   // Write the updated data
        });
});

// Change the cursor to a pointer when the mouse is over the places layer.
map.on('mouseenter', 'stations_layer', (e) => {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = 'pointer';

    let feature = e.features[0];
    const coordinates = feature.geometry.coordinates.slice();
    const station_name = feature.properties.station_name;
    //const id = feature.id;
    const station_id = feature.properties.station_id;
    //const selected = feature.properties.is_selected;

    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    }

    // Populate the popup and set its coordinates
    // based on the feature found.
    popup.setLngLat(coordinates).setHTML(`<pre>${station_name}\n${station_id}</pre>`).addTo(map);
});

// Change it back to a pointer when it leaves.
map.on('mouseleave', 'stations_layer', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
});

function build_geojson_stations(stations) {
    geojson_array = [];
    var index = 0;
    for (const station of stations) {
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

