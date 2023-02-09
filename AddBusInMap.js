function AddBusInMap(map, station_data) {
    let station_features_lists = []
    let bus_api_link = "http://api.minimacau3d.com/bus_location_coordinates.json"
    fetch(bus_api_link)
        .then((response) => response.json())
        .then((data) => console.log(data));


}
