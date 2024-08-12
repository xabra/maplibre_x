// Define the map syle (OpenStreetMap raster tiles)
const MAX_POINTS = 3000;
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

const geoj = {
    "type": "GeometryCollection",
    "geometries": [{
        "type": "Point",
        "coordinates": [-121.9386, 37.4056]
    }, {
        "type": "Point",
        "coordinates": [-121.93, 37.4056]
    }, {
        "type": "Point",
        "coordinates": [-121.94, 37.4056]
    },
    ]
};
// CORS problem here...
// fetch('http://127.0.0.1:3000/api/stations')
//     .then((response) => response.json())
//     .then((json) => console.log(json));

map.on('load', () => {
    fetch('./stations.json')
        .then((response) => response.json())
        .then((stations) => {
            const marker = [];
            add_station_markers(stations, marker);

            //Add a source and layer displaying a point which will be animated in a circle.
            map.addSource('stations_data', {
                'type': 'geojson',
                'data': geoj,
            });

            //var res = build_geojson_stations(stations);
            map.addLayer({
                'id': 'stations_layer',      // 'point' layer
                'source': 'stations_data',
                'type': 'circle',
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#ff6347',
                }
            });
        });
});


function add_station_markers(stations, marker) {
    var index = 0;
    for (const station of stations) {
        //console.log(">>>", index, station.station_name, station.longitude, station.latitude, station.station_id);
        if (station.station_id.substring(0, 2) == 'US' && index < MAX_POINTS) {
            marker[index] = new maplibregl.Marker({ color: "#FF0000", scale: 0.25 })
                .setLngLat([station.longitude, station.latitude])
                .addTo(map);
            index += 1;
        }

    }
}


// function build_geojson_stations(stations) {
//     geojson_geometries = [];
//     var index = 0;
//     for (const station of stations) {
//         //console.log(">>>", index, station.station_name, station.longitude, station.latitude, station.station_id);
//         if (station.station_id.substring(0, 2) == 'US' && index < 100) {
//             geojson_geometries.push({
//                 type: "Point",
//                 coordinates: [station.longitude, station.latitude]
//             });
//             index += 1;
//         }

//     }
//     console.log(geojson_geometries);
//     return 3.14;
// }
