
const THREE = window.THREE;

function GenModelTransform(longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
  
    let modelOrigin = [longitude, latitude];
    let modelAltitude = 0;
    let modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
    );
    let modelTransform = {
        translateX: modelAsMercatorCoordinate.x,
        translateY: modelAsMercatorCoordinate.y,
        translateZ: modelAsMercatorCoordinate.z,
        rotateX: rotateX,
        rotateY: rotateY,
        rotateZ: rotateZ,
        scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
    };
    return modelTransform
}
  
function GencustomLayer(map, custom_id, sizeX = 3, sizeY = 2, sizeZ = 2, color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6], scaleSize= 1.4, longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
    let modelTransform = GenModelTransform(longitude, latitude, rotateX, rotateY, rotateZ)
    let customLayer ={
      id: custom_id,
      type: 'custom',
      renderingMode: '3d',
      onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        let geometry = new THREE.BoxGeometry( sizeX, sizeY, sizeZ ); //長x 高z 闊y
        let material = [
            new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[2]}), new THREE.MeshBasicMaterial({ color: color[2]})
        ];
        this.cube = new THREE.Mesh( geometry, material );
        this.cube.scale.x = scaleSize
        this.cube.scale.y = scaleSize
        this.cube.scale.z = scaleSize

        this.scene.add( this.cube );
        this.map = map;

        // use the Mapbox GL JS map canvas for three.js
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        });

        this.renderer.autoClear = false;
      },
      render: function (gl, matrix) {
            let rotationX = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(1, 0, 0),
                modelTransform.rotateX
            );
            let rotationY = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 1, 0),
                modelTransform.rotateY
            );
            let rotationZ = new THREE.Matrix4().makeRotationAxis(
                new THREE.Vector3(0, 0, 1),
                modelTransform.rotateZ
            );
  
            let m = new THREE.Matrix4().fromArray(matrix);
            let l = new THREE.Matrix4()
                .makeTranslation(
                    modelTransform.translateX,
                    modelTransform.translateY,
                    modelTransform.translateZ
                )
                .scale(
                    new THREE.Vector3(
                        modelTransform.scale,
                        -modelTransform.scale,
                        modelTransform.scale
                    )
                )
                .multiply(rotationX)
                .multiply(rotationY)
                .multiply(rotationZ);

            this.camera.projectionMatrix = m.multiply(l);
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);

            this.cube.rotation.x += 0.01;
            this.cube.rotation.y += 0.01;

            this.map.triggerRepaint();
        }
    }
    return customLayer
}

async function AddBusInMap(map, station_data) {

    // let station_features_lists = []
    let bus_api_link = "https://api.minimacau3d.com/bus_location_coordinates.json"
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );
    let customLayer = ''

    for (let bus_index = 0; bus_index < bus_api_data.length; bus_index++) {
        let route_element = bus_api_data[bus_index];
        for (let bus_idx = 0; bus_idx < route_element.busInfoList.length; bus_idx++) {
            let bus_element = route_element.busInfoList[bus_idx];
            customLayer = GencustomLayer(map, bus_element.busPlate, 3, 2, 2, [0xFFFFFF,route_element.color[0],route_element.color[0]], 6, bus_element.longitude, bus_element.latitude)
            map.addLayer(customLayer, 'waterway-label');
            map.moveLayer(customLayer.id); // make layer to the top side
        }
    }

}

// async function AddBusInMap(map, station_data) {

//     let bus_api_link = "https://api.minimacau3d.com/bus_location_coordinates.json"

//     let bus_element_id_lists = []
//     // 定義定時器
//     setInterval(async () => {

//         let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );
        
//         // 移除現有的自定義圖層
//         if(bus_element_id_lists.length != 0){
//             for (let id_lists_index = 0; id_lists_index < bus_element_id_lists.length; id_lists_index++) {
//                 map.removeLayer(bus_element_id_lists[id_lists_index]);
//             }
//             bus_element_id_lists = []
//         }
//         for (let bus_index = 0; bus_index < bus_api_data.length; bus_index++) {
//             let route_element = bus_api_data[bus_index];
//             for (let bus_idx = 0; bus_idx < route_element.busInfoList.length; bus_idx++) {
//                 let bus_element = route_element.busInfoList[bus_idx];
//                 // 更新自定義圖層的位置
//                 let customLayer = GencustomLayer(map, bus_element.busPlate, 3, 2, 2, [0xFFFFFF,route_element.color[0],route_element.color[0]], 2, bus_element.longitude, bus_element.latitude)
//                 bus_element_id_lists.push(bus_element.busPlate)
//                 map.addLayer(customLayer, 'waterway-label');
//                 map.moveLayer(bus_element.busPlate);
//             }
//         }
//         console.log('update')
//     }, 60000); // 每10秒觸發一次
// }




// async function AddBusInMap(map, station_data) {

//     let bus_api_link = "https://api.minimacau3d.com/bus_location_coordinates.json"
//     let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );

//     // Add data source for bus locations
//     map.addSource('bus-locations', {
//         type: 'geojson',
//         data: {
//             type: 'FeatureCollection',
//             features: []
//         }
//     });

//     for (let bus_index = 0; bus_index < bus_api_data.length; bus_index++) {
//         let route_element = bus_api_data[bus_index];
//         for (let bus_idx = 0; bus_idx < route_element.busInfoList.length; bus_idx++) {
//             let bus_element = route_element.busInfoList[bus_idx];
//             let feature = {
//                 type: 'Feature',
//                 geometry: {
//                     type: 'Point',
//                     coordinates: [bus_element.longitude, bus_element.latitude]
//                 },
//                 properties: {
//                     color: route_element.color[0],
//                     busPlate: bus_element.busPlate
//                 }
//             };
//             // Add bus location to data source
//             map.getSource('bus-locations').setData({
//                 type: 'FeatureCollection',
//                 features: [feature]
//             });

//             // Add custom layer to map to show bus location
//             let customLayer = GencustomLayer(map, bus_element.busPlate, 3, 2, 2, [0xFFFFFF, route_element.color[0], route_element.color[0]], 2, bus_element.longitude, bus_element.latitude)
//             map.addLayer(customLayer, 'waterway-label');
//             map.moveLayer(customLayer.id);
//         }
//     }

//     // Update bus locations every 10 seconds
//     setInterval(async () => {
//         bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );
//         let features = [];
//         for (let bus_index = 0; bus_index < bus_api_data.length; bus_index++) {
//             let route_element = bus_api_data[bus_index];
//             for (let bus_idx = 0; bus_idx < route_element.busInfoList.length; bus_idx++) {
//                 let bus_element = route_element.busInfoList[bus_idx];
//                 let feature = {
//                     type: 'Feature',
//                     geometry: {
//                         type: 'Point',
//                         coordinates: [bus_element.longitude, bus_element.latitude]
//                     },
//                     properties: {
//                         color: route_element.color[0],
//                         busPlate: bus_element.busPlate
//                     }
//                 };
//                 features.push(feature);
//             }
//         }
//         // Update bus locations in data source
//         map.getSource('bus-locations').setData({
//             type: 'FeatureCollection',
//             features: features
//         });
//         console.log(features)
//     }, 10000);
// }
