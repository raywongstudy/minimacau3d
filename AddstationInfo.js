function AddstationInfo(map, location_data) {

    for (let index = 0; index < location_data.length; index++) {
        const location_element = location_data[index];
        
        map.addSource( `station_${location_element.stationCode}` , {
            'type': 'geojson',
            'data': {
                'type': 'FeatureCollection',
                'features': [
                    {
                        'type': 'Feature',
                        'properties': {
                            'description':
                                `<strong>${location_element.description}</strong><p>${location_element.bus_lists}</p>`
                        },
                        'geometry': {
                            'type': 'Point',
                            'coordinates': location_element.coordinate
                        }
                    }
                ]
            }
        });
        // Add a layer showing the places.
        map.addLayer({
            'id': `station_${location_element.stationCode}`,
            'type': 'circle',
            'source': `station_${location_element.stationCode}`,
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
    
        map.on('mouseenter', `station_${location_element.stationCode}`, (e) => {
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
    
        map.on('mouseleave', `station_${location_element.stationCode}`, () => {
            map.getCanvas().style.cursor = '';
            popup.remove();
        });






        
    }


}
