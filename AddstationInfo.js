function AddstationInfo(map, location_data) {
    let station_features_lists = []
    for (let index = 0; index < location_data.length; index++) {
        const location_element = location_data[index];
        station_features_lists.push({
            'type': 'Feature',
            'properties': {
                'description':
                    `<strong>${location_element.description}</strong><p>${location_element.bus_lists}</p>`
            },
            'geometry': {
                'type': 'Point',
                'coordinates': location_element.coordinate
            }
        })
    }

    map.addSource( 'bus_station' , {
        'type': 'geojson',
        'data': {
            'type': 'FeatureCollection',
            'features': station_features_lists
        }
    });
    // Add a layer showing the places.
    map.addLayer({
        'id': `bus_station`,
        'type': 'circle',
        'source': `bus_station`,
        'paint': {
            'circle-color': 'black',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#4264fb',
            'circle-opacity': .4
        }
    });

    // Create a popup, but don't add it to the map yet.
    const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false
    });

    map.on('mouseenter', `bus_station`, (e) => {
        // Change the cursor style as a UI indicator.
        map.getCanvas().style.cursor = 'pointer';

        // Copy coordinates array.
        const coordinates = e.features[0].geometry.coordinates.slice();
        const description = e.features[0].properties.description;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Populate the popup and set its coordinates
        // based on the feature found.
        popup.setLngLat(coordinates).setHTML(description).addTo(map);
    });

    map.on('mouseleave', 'bus_station', () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
    });


}
