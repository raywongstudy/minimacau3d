
// This function mainly for use the bus_corrdinates.js traffic_data to draw the route in the map
function addRouteToMap(map, traffic_data){

    for (let index = 0; index < traffic_data.length; index++) {
        const traffic_element = traffic_data[index];
        let traffic_element_id_name = traffic_element.routeCode + traffic_element.direction
        console.log(traffic_element_id_name)
        map.addSource( traffic_element_id_name, {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates': traffic_element.coordinate
                }
            }
        });
        map.addLayer({
            'id': traffic_element_id_name,
            'type': 'line',
            'source': traffic_element_id_name,
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': traffic_element.line_color,
                // 'line-width': traffic_element.line_width,
                'line-width': 8,
                // 'line-opacity': traffic_element.line_opacity
                'line-opacity': .4
            }
        });
    }

}