
const THREE = window.THREE;

// 計算由原點經緯度, 到另外一個點的經緯度，之間Position 的差值
function calculateDistanceInDirection(lon1=113.5423229419, lat1=22.189168817131, lon2, lat2) {

    var dLat = Math.abs(lat2 - lat1); // 緯度差
    var dLon = Math.abs(lon2 - lon1); // 經度差
  
    if((lat2 - lat1) < 0){
      var distanceLat = dLat * 111; // 緯度方向上的實際移動距離（公里）
    }else if((lat2 - lat1) > 0){
      var distanceLat = -1 * dLat * 111; // 緯度方向上的實際移動距離（公里）
    }
  
    var avgLat = (lat1 + lat2) / 2; // 平均緯度
    
    //每一度經度在赤道附近的距離為 40030 / 360 = 111.194公里。 這是一個非常精確的值，但在許多場合為了簡化計算，我們使用了稍大一點的值 111.320公里作為近似值。
     //toRadian(degree) = degree * Math.PI / 180; 
    var distanceLon = dLon * 111.194 * Math.cos(avgLat* Math.PI / 180); // 經度方向上的實際移動距離（公里）
    
    if((lon2 - lon1) < 0){
      distanceLon = -distanceLon
    }
    return [distanceLat * 1000,distanceLon * 1000];
  }
  

//该函数接收经纬度和旋转角度作为参数，并使用这些数据计算出一个用于描述模型在地图上的位置和旋转角度的转换（transform）对象。
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


function GenAllCustomLayer(map, route_elements, sizeX = 3, sizeY = 2, sizeZ = 2, color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6], scaleSize= 1.4, longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
    let busInfoList = route_elements.busInfoList
    let bus_name = route_elements.bus_name + "_" + route_elements.dir

    let modelTransformLists = []
    modelTransform = GenModelTransform(113.5423229419, 22.189168817131, rotateX,rotateY ,rotateZ)

    let customLayer ={
        id: `bus_${bus_name}`,
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.scene = new THREE.Scene();

        let geometry = new THREE.BoxGeometry( sizeX, sizeY, sizeZ ); //長x 高z 闊y
        let material = [
            new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[2]}), new THREE.MeshBasicMaterial({ color: color[2]})
        ];
        this.cube_list = []

        for (let bus_idx = 0; bus_idx < busInfoList.length; bus_idx++) {
            let cube = new THREE.Mesh( geometry, material );
            cube.scale.x = scaleSize
            cube.scale.y = scaleSize
            cube.scale.z = scaleSize

            // Store initial and target positions for each bus
            cube.userData.initialPosition = calculateDistanceInDirection(parseFloat(busInfoList[bus_idx].longitude), parseFloat(busInfoList[bus_idx].latitude), longitude, latitude);
            cube.userData.targetPosition = cube.userData.initialPosition;
            cube.userData.busPlate = busInfoList[bus_idx].busPlate
            cube.userData.busSpeed = busInfoList[bus_idx].speed
            cube.userData.deltaPosition = [0,0]
            cube.userData.animation_number = 0
            
            console.log("cube.userData:", cube.userData)
            
            cube.position.set(-cube.userData.initialPosition[1], cube.userData.initialPosition[0], 0);

            this.cube_list.push(cube)
        }
        this.cube_list.forEach(cube_ele => {
            this.scene.add(cube_ele);
        });
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

            // cube animate
            this.cube_list.forEach(cube_ele => {
                // cube_ele.rotation.x += 0.01;
                // cube_ele.rotation.y += 0.01;
                // cube_ele.position.x += 0.01;
                // cube_ele.position.y += 0.01;
            });

            this.cube_list.forEach(cube_ele => {
                if( (cube_ele.userData.deltaPosition[0] > 0 && cube_ele.userData.animation_number > 0 )  ||  (cube_ele.userData.deltaPosition[1] > 0  && cube_ele.userData.animation_number > 0) ){
                    cube_ele.position.y +=  cube_ele.userData.deltaPosition[0];
                    cube_ele.position.x -=  cube_ele.userData.deltaPosition[1];
                    cube_ele.userData.animation_number -= 1;
                }else if(cube_ele.userData.animation_number <= 0){
                    cube_ele.position.y = cube_ele.userData.targetPosition[0];
                    cube_ele.position.x = - cube_ele.userData.targetPosition[1];
                }

            });
            
            this.map.triggerRepaint();
        },
        updateBusPositions: async function() {
            // console.log("======== run updateBusPositions! =======")
            let response_bus_data = await fetch('https://api.minimacau3d.com/bus_location_coordinates.json').then((response) => { return response.json()} );

            let filter_bus_lists = []
            if(filter_bus_lists.length != 0){
                response_bus_data = response_bus_data.filter(item => filter_bus_lists.includes(item.bus_name));
            }else{
                response_bus_data = response_bus_data
            }
            // console.log("filter update bus response_bus_data:",response_bus_data)
            for (let response_bus_index = 0; response_bus_index < response_bus_data.length; response_bus_index++) {
                let newBusInfoList = response_bus_data[response_bus_index].busInfoList;
                
                // get the new bus data and save the userData to the cube for the cube to move
                for (let bus_idx = 0; bus_idx < newBusInfoList.length; bus_idx++) {

                    let custom_cube = customLayer.cube_list.filter((cube_item) => {
                        return cube_item.userData.busPlate == newBusInfoList[bus_idx].busPlate
                    } )

                    if(custom_cube.length == 1){
                        animation_number = 900 // 取決於API的Speed不能大於API Speed |  animation_number = to the time , about 60 = around 1s , 1800 = around 30s, 900 = around 15s, 1500 = around 25s
                        // console.log("===========", newBusInfoList[bus_idx].busPlate, "===========")
                        custom_cube[0].userData.initialPosition = [custom_cube[0].position.y, -custom_cube[0].position.x];
                        custom_cube[0].userData.targetPosition = calculateDistanceInDirection(parseFloat(newBusInfoList[bus_idx].longitude), parseFloat(newBusInfoList[bus_idx].latitude), longitude, latitude);
                        custom_cube[0].userData.deltaPosition = [ (custom_cube[0].userData.targetPosition[0] - custom_cube[0].userData.initialPosition[0]) / animation_number, (custom_cube[0].userData.targetPosition[1] - custom_cube[0].userData.initialPosition[1]) / animation_number]
                        custom_cube[0].userData.busPlate =  newBusInfoList[bus_idx].busPlate
                        custom_cube[0].userData.speed =  newBusInfoList[bus_idx].speed
                        custom_cube[0].userData.animation_number = animation_number
                        // console.log("custom_cube[0].userData.initialPosition:", custom_cube[0].userData.initialPosition)
                        // console.log("custom_cube[0].userData.targetPosition:", custom_cube[0].userData.targetPosition)
                        // console.log("custom_cube[0].userData.deltaPosition:", custom_cube[0].userData.deltaPosition)
        
                        // console.log("======================");
                    }//else{
                        //console.log("the bus is finish , need to del it || can't find the bus plate ");
                        
                    //}
                }

            }



        }
    }

    // Update bus positions every 10 seconds
    setInterval(() => customLayer.updateBusPositions(), 10000);

    return customLayer
}


async function AddBusInMap(map, filter_bus_lists=[]) {

    // let station_features_lists = []
    let bus_api_link = "https://api.minimacau3d.com/bus_location_coordinates.json"
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );
    let customLayer = ''
    //filter the bus data lists

    if(filter_bus_lists.length != 0){
        filteredBusListsData = bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name));
    }else{
        filteredBusListsData = bus_api_data
    }
    console.log("filteredBusListsData:",filteredBusListsData)

    for (let bus_index = 0; bus_index < filteredBusListsData.length; bus_index++) {
        let route_elements = filteredBusListsData[bus_index];
        customLayer = GenAllCustomLayer(map,route_elements, 3, 2, 2, [0xFFFFFF,route_elements.color[0],route_elements.color[0]], 6)
        map.addLayer(customLayer, 'waterway-label');
        map.moveLayer(customLayer.id); // make layer to the top side

        // 用在marked 位置對比
        // for (let index = 0; index < route_elements.busInfoList.length; index++) {
        //     let element = route_elements.busInfoList[index];
        //     let popup = new mapboxgl.Popup().setText(`${element.latitude}, ${element.longitude} `).addTo(map);
        //     let marker = new mapboxgl.Marker({ color: 'blue'}).setLngLat([element.longitude, element.latitude]).addTo(map).setPopup(popup);
        // }

    }

}
