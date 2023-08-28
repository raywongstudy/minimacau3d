
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
            
            // console.log("cube.userData:", cube.userData)
            
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

        updateBusPositions: async function(response_bus_data) {
            // console.log("======== run updateBusPositions! =======")
            let filter_bus_lists = [] //如果要選擇單一線看用
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
                        animation_number = 90 // 取決於API的Speed不能大於API Speed |  animation_number = to the time , about 60 = around 1s , 1800 = around 30s, 900 = around 15s, 1500 = around 25s
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


    return customLayer
}


async function AddBusInMap(map, filter_bus_lists=[]) {

    // let station_features_lists = []
    let bus_api_link = "https://api.minimacau3d.com/bus_location_coordinates.json"
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );
    let customLayer = ''
    let customLayers = []
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
        customLayers.push(customLayer);
        // 用在marked 位置對比
        // for (let index = 0; index < route_elements.busInfoList.length; index++) {
        //     let element = route_elements.busInfoList[index];
        //     let popup = new mapboxgl.Popup().setText(`${element.latitude}, ${element.longitude} `).addTo(map);
        //     let marker = new mapboxgl.Marker({ color: 'blue'}).setLngLat([element.longitude, element.latitude]).addTo(map).setPopup(popup);
        // }

    }
    
    // 按下按鈕時呼叫此函數
    function RunHistoryData() {
        clearInterval(autoGetBusDataId);
        alert("現時數據設置為歷史測試數據～\n數據來自澳門2023年8月28日早上10點00分-10點10分巴士數據")
        console.log("bus_location_coordinates_lists.length",bus_location_coordinates_lists.length)
        simulateTimeFlow("2023-08-28T10:00:00", "2023-08-28T10:10:00", (33) ); // 改左上時間加速模擬功能
        document.querySelector("#demo-data-button").style.display = "none"
        for (let list_index = 0; list_index < bus_location_coordinates_lists.length; list_index++) {
            let list_element = bus_location_coordinates_lists[list_index];
            setTimeout(async () => {
                console.log("Delayed for "+list_index+" second.");
                fetch_list_element_url = "https://api.minimacau3d.com/20230828/" + list_element.split("_")[0] + "_location_coordinates_" + list_element.split("_")[1]
                let response_bus_data = await fetch(fetch_list_element_url).then((response) => { return response.json()} );
                customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
                if(list_index+1 == bus_location_coordinates_lists.length){
                    document.querySelector("#demo-data-button").style.display = "flex"
                    alert("歷史數據展示完成！\n現時數據設置為實時數據～")
                    let autoGetBusDataId = setInterval(async () => {
                        let response_bus_data = await fetch('https://api.minimacau3d.com/bus_location_coordinates.json').then((response) => { return response.json()} );
                        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
                    }, 3000);
                }
                }, list_index * 1000);
        }
    }
    // Update bus positions every 10 seconds在 setInterval | 函數中儲存 ID
    let autoGetBusDataId = setInterval(async () => {
        let response_bus_data = await fetch('https://api.minimacau3d.com/bus_location_coordinates.json').then((response) => { return response.json()} );
        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data));
    }, 5000);

    document.querySelector("#demo-data-button").addEventListener("click", RunHistoryData); 
  
    // Update bus positions every 1 seconds use the data lists
    let autoHistoryBusDataId;
    let bus_location_coordinates_lists = ["bus_20230828T100016.json", "bus_20230828T100037.json", "bus_20230828T100056.json", "bus_20230828T100115.json", "bus_20230828T100134.json", "bus_20230828T100153.json", "bus_20230828T100214.json", "bus_20230828T100233.json", "bus_20230828T100254.json", "bus_20230828T100314.json", "bus_20230828T100333.json", "bus_20230828T100352.json", "bus_20230828T100413.json", "bus_20230828T100432.json", "bus_20230828T100451.json", "bus_20230828T100512.json", "bus_20230828T100531.json", "bus_20230828T100550.json", "bus_20230828T100611.json", "bus_20230828T100630.json", "bus_20230828T100649.json", "bus_20230828T100709.json", "bus_20230828T100727.json", "bus_20230828T100746.json", "bus_20230828T100806.json", "bus_20230828T100825.json", "bus_20230828T100846.json", "bus_20230828T100906.json", "bus_20230828T100926.json", "bus_20230828T100945.json", "bus_20230828T101005.json", "bus_20230828T101024.json", "bus_20230828T101044.json", "bus_20230828T101105.json"]
    // let bus_location_coordinates_lists = ["bus_20230828T100016.json", "bus_20230828T100037.json", "bus_20230828T100056.json", "bus_20230828T100115.json", "bus_20230828T100134.json", "bus_20230828T100153.json", "bus_20230828T100214.json", "bus_20230828T100233.json", "bus_20230828T100254.json", "bus_20230828T100314.json", "bus_20230828T100333.json", "bus_20230828T100352.json", "bus_20230828T100413.json", "bus_20230828T100432.json", "bus_20230828T100451.json", "bus_20230828T100512.json", "bus_20230828T100531.json", "bus_20230828T100550.json", "bus_20230828T100611.json", "bus_20230828T100630.json", "bus_20230828T100649.json", "bus_20230828T100709.json", "bus_20230828T100727.json", "bus_20230828T100746.json", "bus_20230828T100806.json", "bus_20230828T100825.json", "bus_20230828T100846.json", "bus_20230828T100906.json", "bus_20230828T100926.json", "bus_20230828T100945.json", "bus_20230828T101005.json", "bus_20230828T101024.json", "bus_20230828T101044.json", "bus_20230828T101105.json", "bus_20230828T101123.json", "bus_20230828T101142.json", "bus_20230828T101202.json", "bus_20230828T101222.json", "bus_20230828T101241.json", "bus_20230828T101300.json", "bus_20230828T101319.json", "bus_20230828T101338.json", "bus_20230828T101357.json", "bus_20230828T101417.json", "bus_20230828T101437.json", "bus_20230828T101456.json", "bus_20230828T101516.json", "bus_20230828T101536.json", "bus_20230828T101555.json", "bus_20230828T101615.json", "bus_20230828T101634.json", "bus_20230828T101654.json", "bus_20230828T101714.json", "bus_20230828T101735.json", "bus_20230828T101754.json", "bus_20230828T101814.json", "bus_20230828T101834.json", "bus_20230828T101854.json", "bus_20230828T101915.json", "bus_20230828T101935.json", "bus_20230828T101954.json", "bus_20230828T102014.json", "bus_20230828T102034.json", "bus_20230828T102053.json", "bus_20230828T102113.json", "bus_20230828T102132.json", "bus_20230828T102152.json", "bus_20230828T102214.json", "bus_20230828T102233.json", "bus_20230828T102253.json", "bus_20230828T102313.json", "bus_20230828T102332.json", "bus_20230828T102352.json", "bus_20230828T102413.json", "bus_20230828T102432.json", "bus_20230828T102452.json", "bus_20230828T102511.json", "bus_20230828T102530.json", "bus_20230828T102550.json", "bus_20230828T102611.json", "bus_20230828T102630.json", "bus_20230828T102650.json", "bus_20230828T102711.json", "bus_20230828T102731.json", "bus_20230828T102750.json", "bus_20230828T102811.json", "bus_20230828T102830.json", "bus_20230828T102850.json", "bus_20230828T102911.json", "bus_20230828T102931.json", "bus_20230828T102951.json", "bus_20230828T103010.json", "bus_20230828T103031.json", "bus_20230828T103051.json", "bus_20230828T103111.json", "bus_20230828T103131.json", "bus_20230828T103150.json", "bus_20230828T103213.json", "bus_20230828T103233.json", "bus_20230828T103254.json", "bus_20230828T103315.json", "bus_20230828T103334.json", "bus_20230828T103354.json", "bus_20230828T103414.json", "bus_20230828T103434.json", "bus_20230828T103453.json", "bus_20230828T103514.json", "bus_20230828T103536.json", "bus_20230828T103555.json", "bus_20230828T103615.json", "bus_20230828T103635.json", "bus_20230828T103654.json", "bus_20230828T103715.json", "bus_20230828T103734.json", "bus_20230828T103754.json", "bus_20230828T103815.json", "bus_20230828T103834.json", "bus_20230828T103854.json", "bus_20230828T103914.json", "bus_20230828T103934.json", "bus_20230828T103956.json", "bus_20230828T104015.json", "bus_20230828T104035.json", "bus_20230828T104055.json", "bus_20230828T104115.json", "bus_20230828T104135.json", "bus_20230828T104154.json", "bus_20230828T104215.json", "bus_20230828T104235.json", "bus_20230828T104254.json", "bus_20230828T104315.json", "bus_20230828T104334.json", "bus_20230828T104353.json", "bus_20230828T104413.json", "bus_20230828T104433.json", "bus_20230828T104452.json", "bus_20230828T104512.json", "bus_20230828T104533.json", "bus_20230828T104552.json", "bus_20230828T104612.json", "bus_20230828T104631.json", "bus_20230828T104651.json", "bus_20230828T104711.json", "bus_20230828T104730.json", "bus_20230828T104749.json", "bus_20230828T104809.json", "bus_20230828T104828.json", "bus_20230828T104847.json", "bus_20230828T104907.json", "bus_20230828T104927.json", "bus_20230828T104946.json", "bus_20230828T105006.json", "bus_20230828T105025.json", "bus_20230828T105045.json", "bus_20230828T105105.json", "bus_20230828T105124.json", "bus_20230828T105143.json", "bus_20230828T105203.json", "bus_20230828T105222.json", "bus_20230828T105242.json", "bus_20230828T105303.json", "bus_20230828T105322.json", "bus_20230828T105341.json", "bus_20230828T105400.json", "bus_20230828T105419.json", "bus_20230828T105438.json", "bus_20230828T105458.json", "bus_20230828T105518.json", "bus_20230828T105537.json", "bus_20230828T105555.json", "bus_20230828T105614.json", "bus_20230828T105634.json", "bus_20230828T105653.json", "bus_20230828T105712.json", "bus_20230828T105731.json", "bus_20230828T105753.json", "bus_20230828T105812.json", "bus_20230828T105831.json", "bus_20230828T105851.json", "bus_20230828T105911.json", "bus_20230828T105930.json", "bus_20230828T105950.json", "bus_20230828T110010.json", "bus_20230828T110029.json", "bus_20230828T110049.json", "bus_20230828T110108.json", "bus_20230828T110128.json", "bus_20230828T110147.json", "bus_20230828T110206.json", "bus_20230828T110225.json", "bus_20230828T110245.json", "bus_20230828T110304.json", "bus_20230828T110323.json", "bus_20230828T110342.json", "bus_20230828T110402.json", "bus_20230828T110421.json", "bus_20230828T110442.json", "bus_20230828T110502.json", "bus_20230828T110522.json", "bus_20230828T110542.json", "bus_20230828T110602.json", "bus_20230828T110621.json", "bus_20230828T110640.json", "bus_20230828T110700.json", "bus_20230828T110720.json", "bus_20230828T110742.json", "bus_20230828T110803.json", "bus_20230828T110823.json", "bus_20230828T110842.json", "bus_20230828T110902.json", "bus_20230828T110922.json", "bus_20230828T110942.json", "bus_20230828T111002.json", "bus_20230828T111021.json", "bus_20230828T111042.json", "bus_20230828T111103.json", "bus_20230828T111122.json", "bus_20230828T111141.json"]


}
