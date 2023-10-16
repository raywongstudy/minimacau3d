
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
  
    let modelOrigin = [longitude, latitude]; // 定義地圖中心點
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

// sizeX , Y , Z => 車大小
function GenAllCustomLayer(map, route_elements, sizeX = 3, sizeY = 2, sizeZ = 2, color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6], scaleSize= 1.4, longitude = 113.5423229419, latitude = 22.189168817131,rotateX = 0,rotateY = 0,rotateZ = 0){
    let busInfoList = route_elements.busInfoList
    let bus_name = route_elements.bus_name + "_" + route_elements.dir

    modelTransform = GenModelTransform(113.5423229419, 22.189168817131, rotateX,rotateY ,rotateZ) //生成一個（transform）对象 會影響車大細

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
                cube.userData.source_position = [parseFloat(busInfoList[bus_idx].longitude), parseFloat(busInfoList[bus_idx].latitude)]
                cube.userData.initialPosition = calculateDistanceInDirection(parseFloat(busInfoList[bus_idx].longitude), parseFloat(busInfoList[bus_idx].latitude), longitude, latitude);
                cube.userData.targetPosition = cube.userData.initialPosition;
                cube.userData.busPlate = busInfoList[bus_idx].busPlate
                cube.userData.busDir = route_elements.dir
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

        updateBusPositions: async function(response_bus_data, filter_bus_lists) {
            // filter 出單條的巴士路線
            customLayerIdData = customLayer.id.split("_")
            customLayerDir = customLayerIdData[customLayerIdData.length - 1]
            customLayerNum = customLayerIdData[customLayerIdData.length - 2]
            console.log("\n======== run updateBusPositions "+ customLayerNum +"號車 ＝ 方向：" +customLayerDir+"=======")

            if(filter_bus_lists.length != 0){
                response_bus_data = response_bus_data.filter(item => filter_bus_lists.includes(item.bus_name));
                response_bus_data = response_bus_data.filter(item => item.dir.toString() == customLayerDir);
            }else{
                response_bus_data = response_bus_data.filter(item => customLayerNum.toString() == item.bus_name);
                response_bus_data = response_bus_data.filter(item => item.dir.toString() == customLayerDir);
            }
            
            custom_cube_list = customLayer.cube_list.slice()
            console.log("現時已存在的bus lists:")
            // this.cube_list.forEach(cube => console.log(cube.userData) );
            for (let response_bus_index = 0; response_bus_index < response_bus_data.length; response_bus_index++) {
                //此層是最新API的單條路線
                cube_item_dir = response_bus_data[response_bus_index].dir
                newBusInfoList = response_bus_data[response_bus_index].busInfoList;
                custom_cube_check_list = custom_cube_list //已有的巴士
                // console.log("最新的bus Data:",newBusInfoList)
                // get the new bus data and save the userData to the cube for the cube to move
                for (let bus_idx = 0; bus_idx < newBusInfoList.length; bus_idx++) {
                    
                    // 檢查出現的新增巴士是否存在原來的列表中：
                    // console.log("custom_cube_list:",custom_cube_list)
                    custom_cube = []
                    custom_cube_list.filter((cube_item) => {
                        if(cube_item.userData.busPlate == newBusInfoList[bus_idx].busPlate && cube_item.userData.busDir == cube_item_dir){
                            custom_cube_check_list = custom_cube_check_list.filter(item => item.userData.busPlate !== cube_item.userData.busPlate);
                            custom_cube.push(cube_item)
                        }
                    } )

                    if(custom_cube.length == 1){
                        // console.log("需要進行移動的巴士:",custom_cube)

                        animation_number = 150 // 取決於API的Speed不能大於API Speed |  animation_number = to the time , about 60 = around 1s , 1800 = around 30s, 900 = around 15s, 1500 = around 25s
                        // console.log("===========", newBusInfoList[bus_idx].busPlate, "===========")
                        custom_cube[0].userData.source_position = [parseFloat(newBusInfoList[bus_idx].longitude), parseFloat(newBusInfoList[bus_idx].latitude)]
                        custom_cube[0].userData.initialPosition = [custom_cube[0].position.y, -custom_cube[0].position.x];
                        custom_cube[0].userData.targetPosition = calculateDistanceInDirection(parseFloat(newBusInfoList[bus_idx].longitude), parseFloat(newBusInfoList[bus_idx].latitude), longitude, latitude);
                        custom_cube[0].userData.deltaPosition = [ (custom_cube[0].userData.targetPosition[0] - custom_cube[0].userData.initialPosition[0]) / animation_number, (custom_cube[0].userData.targetPosition[1] - custom_cube[0].userData.initialPosition[1]) / animation_number]
                        // custom_cube[0].userData.busPlate =  newBusInfoList[bus_idx].busPlate
                        custom_cube[0].userData.speed =  newBusInfoList[bus_idx].speed
                        custom_cube[0].userData.animation_number = animation_number
                        // console.log("custom_cube[0].userData.initialPosition:", custom_cube[0].userData.initialPosition)
                        // console.log("custom_cube[0].userData.targetPosition:", custom_cube[0].userData.targetPosition)
                        // console.log("custom_cube[0].userData.deltaPosition:", custom_cube[0].userData.deltaPosition)
                        // console.log("======================");
                    }
                    else{
                        // 這是需要根據API最新的data 去新增相應的巴士
                        if( custom_cube_list[0] === undefined || (custom_cube_list[0].userData.busDir == cube_item_dir) ){
                            console.log("需要新增的巴士：",newBusInfoList[bus_idx])
                            let newBusDataAdd = newBusInfoList[bus_idx]; //需新增的巴士
                            let geometry = new THREE.BoxGeometry( sizeX, sizeY, sizeZ ); //長x 高z 闊y
                            
                            // 如有原巴士顏色，獲取它
                            if(custom_cube_list[0]){
                                material = custom_cube_list[0].material
                            }else{
                                color = [0xA7C7E7, 0xA7C7E7, 0xADD8E6]
                                material = [
                                    new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[0]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[1]}), new THREE.MeshBasicMaterial({ color: color[2]}), new THREE.MeshBasicMaterial({ color: color[2]})
                                ];
                            }
                            let newCube = new THREE.Mesh( geometry, material );

                            // 设置新巴士的属性
                            newCube.scale.set(scaleSize, scaleSize , scaleSize );
                            newCube.userData.source_position = [parseFloat(newBusDataAdd.longitude), parseFloat(newBusDataAdd.latitude)];
                            newCube.userData.initialPosition = calculateDistanceInDirection(parseFloat(newBusDataAdd.longitude), parseFloat(newBusDataAdd.latitude), longitude, latitude);
                            newCube.position.set(-newCube.userData.initialPosition[1], newCube.userData.initialPosition[0], 0);
                            newCube.userData.targetPosition = newCube.userData.initialPosition;
                            newCube.userData.deltaPosition = [0,0];
                            newCube.userData.animation_number = 90;
                            newCube.userData.busPlate = newBusDataAdd.busPlate;
                            newCube.userData.busDir = cube_item_dir;
                            newCube.userData.busSpeed = newBusDataAdd.speed;
                        
                            // 将新的巴士添加到cube_list和场景中
                            customLayer.scene.add(newCube)
                            customLayer.cube_list.push(newCube)
                            this.renderer.render(this.scene, this.camera);
                            customLayer.map.triggerRepaint();
                        }
                        
                        
                    }

                }
                // 這是需要根據API最新的data filter 出要刪除的巴士
                console.log("custom_cube_check_list:",custom_cube_check_list)
                if(custom_cube_check_list.length > 0 && custom_cube_list[0].userData.busDir == cube_item_dir){
                    for(let new_bus_idx = 0; new_bus_idx < custom_cube_check_list.length; new_bus_idx++){
                        console.log("需要刪除的巴士：",custom_cube_check_list[new_bus_idx].userData)
                        console.log(customLayer.scene.children); // 在删除之前
                        customLayer.scene.children = customLayer.scene.children.filter(item => item.userData.busPlate != custom_cube_check_list[new_bus_idx].userData.busPlate)
                        customLayer.cube_list = customLayer.cube_list.filter(item => item.userData.busPlate != custom_cube_check_list[new_bus_idx].userData.busPlate);
                        console.log(customLayer.scene.children); // 在删除之后
                    }
                }
                this.renderer.render(this.scene, this.camera);
                customLayer.map.triggerRepaint();
            }

        }
        // addBusToMap: function(response_bus_data){
        //     // console.log("======== run addBusToMap! =======")
        // },
        // removeBusFromMap: function(response_bus_data){
        //     // console.log("======== run addBusToMap! =======")
        // }
    }

    // console.log("final customLayer:",customLayer)

    return customLayer
}

// Marker 功能，提供api link 獲取巴士data 再用filter bus lists 去得出巴士的位置生成marker
async function AddMarker(map, filter_bus_lists=[], bus_api_link){
    
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} );

    if(filter_bus_lists.length != 0){
        filteredBusListsData = bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name));
    }else{
        filteredBusListsData = bus_api_data
    }
    // console.log("Marker Bus Lists Data:",filteredBusListsData)

    for (let bus_index = 0; bus_index < filteredBusListsData.length; bus_index++) {
        let route_elements = filteredBusListsData[bus_index];
        for (let index = 0; index < route_elements.busInfoList.length; index++) {
            let element = route_elements.busInfoList[index];
            let popup = new mapboxgl.Popup().setText(`${element.latitude}, ${element.longitude}, ${element.busPlate} `).addTo(map);
            let marker = new mapboxgl.Marker({ color: 'blue'}).setLngLat([element.longitude, element.latitude]).addTo(map).setPopup(popup);
        }
    }
}

// 把巴士生成到地圖上
async function AddBusInMap(map, filter_bus_lists=[], bus_api_link) {

    // station_features_lists = []
    let bus_api_data = await fetch(bus_api_link).then((response) => { return response.json()} ); //api get bus data
    let customLayer = ''
    let customLayers = []

    //filter the bus data lists
    if(filter_bus_lists.length != 0){
        filteredBusListsData = bus_api_data.filter(item => filter_bus_lists.includes(item.bus_name));
    }else{
        filteredBusListsData = bus_api_data
    }
    // console.log("filteredBusListsData:",filteredBusListsData)
    // loop the filter bus data line for each line create one custom layer
    for (let bus_index = 0; bus_index < filteredBusListsData.length; bus_index++) {
        let route_elements = filteredBusListsData[bus_index];
        // console.log("1. route_elements:",route_elements)
        customLayer = GenAllCustomLayer(map,route_elements, 6, 4, 4, [0xFFFFFF,route_elements.color[0],route_elements.color[0]], 6)
        map.addLayer(customLayer, 'waterway-label');
        map.moveLayer(customLayer.id); // make layer to the top side
        customLayers.push(customLayer);
    }
    
    // AddMarker(map, filter_bus_lists, bus_api_link) // add marker

    // 按下按鈕時呼叫此歷史函數
    async function RunHistoryData() {

        // use for check data for 1 by 1
        // let response_bus_data = await fetch(bus_api_link).then((response) => { return response.json()} );
        // customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));

        // /*

        // Update bus positions every 1 seconds use the data lists
        let bus_location_coordinates_lists = ["bus_20230828T100016.json", "bus_20230828T100037.json", "bus_20230828T100056.json", "bus_20230828T100115.json", "bus_20230828T100134.json", "bus_20230828T100153.json", "bus_20230828T100214.json", "bus_20230828T100233.json", "bus_20230828T100254.json", "bus_20230828T100314.json", "bus_20230828T100333.json", "bus_20230828T100352.json", "bus_20230828T100413.json", "bus_20230828T100432.json", "bus_20230828T100451.json", "bus_20230828T100512.json", "bus_20230828T100531.json", "bus_20230828T100550.json", "bus_20230828T100611.json", "bus_20230828T100630.json", "bus_20230828T100649.json", "bus_20230828T100709.json", "bus_20230828T100727.json", "bus_20230828T100746.json", "bus_20230828T100806.json", "bus_20230828T100825.json", "bus_20230828T100846.json", "bus_20230828T100906.json", "bus_20230828T100926.json", "bus_20230828T100945.json", "bus_20230828T101005.json", "bus_20230828T101024.json", "bus_20230828T101044.json", "bus_20230828T101105.json"]
        // let bus_location_coordinates_lists = ["bus_20230828T100016.json", "bus_20230828T100037.json", "bus_20230828T100056.json", "bus_20230828T100115.json", "bus_20230828T100134.json", "bus_20230828T100153.json", "bus_20230828T100214.json", "bus_20230828T100233.json", "bus_20230828T100254.json", "bus_20230828T100314.json", "bus_20230828T100333.json", "bus_20230828T100352.json", "bus_20230828T100413.json", "bus_20230828T100432.json", "bus_20230828T100451.json", "bus_20230828T100512.json", "bus_20230828T100531.json", "bus_20230828T100550.json", "bus_20230828T100611.json", "bus_20230828T100630.json", "bus_20230828T100649.json", "bus_20230828T100709.json", "bus_20230828T100727.json", "bus_20230828T100746.json", "bus_20230828T100806.json", "bus_20230828T100825.json", "bus_20230828T100846.json", "bus_20230828T100906.json", "bus_20230828T100926.json", "bus_20230828T100945.json", "bus_20230828T101005.json", "bus_20230828T101024.json", "bus_20230828T101044.json", "bus_20230828T101105.json", "bus_20230828T101123.json", "bus_20230828T101142.json", "bus_20230828T101202.json", "bus_20230828T101222.json", "bus_20230828T101241.json", "bus_20230828T101300.json", "bus_20230828T101319.json", "bus_20230828T101338.json", "bus_20230828T101357.json", "bus_20230828T101417.json", "bus_20230828T101437.json", "bus_20230828T101456.json", "bus_20230828T101516.json", "bus_20230828T101536.json", "bus_20230828T101555.json", "bus_20230828T101615.json", "bus_20230828T101634.json", "bus_20230828T101654.json", "bus_20230828T101714.json", "bus_20230828T101735.json", "bus_20230828T101754.json", "bus_20230828T101814.json", "bus_20230828T101834.json", "bus_20230828T101854.json", "bus_20230828T101915.json", "bus_20230828T101935.json", "bus_20230828T101954.json", "bus_20230828T102014.json", "bus_20230828T102034.json", "bus_20230828T102053.json", "bus_20230828T102113.json", "bus_20230828T102132.json", "bus_20230828T102152.json", "bus_20230828T102214.json", "bus_20230828T102233.json", "bus_20230828T102253.json", "bus_20230828T102313.json", "bus_20230828T102332.json", "bus_20230828T102352.json", "bus_20230828T102413.json", "bus_20230828T102432.json", "bus_20230828T102452.json", "bus_20230828T102511.json", "bus_20230828T102530.json", "bus_20230828T102550.json", "bus_20230828T102611.json", "bus_20230828T102630.json", "bus_20230828T102650.json", "bus_20230828T102711.json", "bus_20230828T102731.json", "bus_20230828T102750.json", "bus_20230828T102811.json", "bus_20230828T102830.json", "bus_20230828T102850.json", "bus_20230828T102911.json", "bus_20230828T102931.json", "bus_20230828T102951.json", "bus_20230828T103010.json", "bus_20230828T103031.json", "bus_20230828T103051.json", "bus_20230828T103111.json", "bus_20230828T103131.json", "bus_20230828T103150.json", "bus_20230828T103213.json", "bus_20230828T103233.json", "bus_20230828T103254.json", "bus_20230828T103315.json", "bus_20230828T103334.json", "bus_20230828T103354.json", "bus_20230828T103414.json", "bus_20230828T103434.json", "bus_20230828T103453.json", "bus_20230828T103514.json", "bus_20230828T103536.json", "bus_20230828T103555.json", "bus_20230828T103615.json", "bus_20230828T103635.json", "bus_20230828T103654.json", "bus_20230828T103715.json", "bus_20230828T103734.json", "bus_20230828T103754.json", "bus_20230828T103815.json", "bus_20230828T103834.json", "bus_20230828T103854.json", "bus_20230828T103914.json", "bus_20230828T103934.json", "bus_20230828T103956.json", "bus_20230828T104015.json", "bus_20230828T104035.json", "bus_20230828T104055.json", "bus_20230828T104115.json", "bus_20230828T104135.json", "bus_20230828T104154.json", "bus_20230828T104215.json", "bus_20230828T104235.json", "bus_20230828T104254.json", "bus_20230828T104315.json", "bus_20230828T104334.json", "bus_20230828T104353.json", "bus_20230828T104413.json", "bus_20230828T104433.json", "bus_20230828T104452.json", "bus_20230828T104512.json", "bus_20230828T104533.json", "bus_20230828T104552.json", "bus_20230828T104612.json", "bus_20230828T104631.json", "bus_20230828T104651.json", "bus_20230828T104711.json", "bus_20230828T104730.json", "bus_20230828T104749.json", "bus_20230828T104809.json", "bus_20230828T104828.json", "bus_20230828T104847.json", "bus_20230828T104907.json", "bus_20230828T104927.json", "bus_20230828T104946.json", "bus_20230828T105006.json", "bus_20230828T105025.json", "bus_20230828T105045.json", "bus_20230828T105105.json", "bus_20230828T105124.json", "bus_20230828T105143.json", "bus_20230828T105203.json", "bus_20230828T105222.json", "bus_20230828T105242.json", "bus_20230828T105303.json", "bus_20230828T105322.json", "bus_20230828T105341.json", "bus_20230828T105400.json", "bus_20230828T105419.json", "bus_20230828T105438.json", "bus_20230828T105458.json", "bus_20230828T105518.json", "bus_20230828T105537.json", "bus_20230828T105555.json", "bus_20230828T105614.json", "bus_20230828T105634.json", "bus_20230828T105653.json", "bus_20230828T105712.json", "bus_20230828T105731.json", "bus_20230828T105753.json", "bus_20230828T105812.json", "bus_20230828T105831.json", "bus_20230828T105851.json", "bus_20230828T105911.json", "bus_20230828T105930.json", "bus_20230828T105950.json", "bus_20230828T110010.json", "bus_20230828T110029.json", "bus_20230828T110049.json", "bus_20230828T110108.json", "bus_20230828T110128.json", "bus_20230828T110147.json", "bus_20230828T110206.json", "bus_20230828T110225.json", "bus_20230828T110245.json", "bus_20230828T110304.json", "bus_20230828T110323.json", "bus_20230828T110342.json", "bus_20230828T110402.json", "bus_20230828T110421.json", "bus_20230828T110442.json", "bus_20230828T110502.json", "bus_20230828T110522.json", "bus_20230828T110542.json", "bus_20230828T110602.json", "bus_20230828T110621.json", "bus_20230828T110640.json", "bus_20230828T110700.json", "bus_20230828T110720.json", "bus_20230828T110742.json", "bus_20230828T110803.json", "bus_20230828T110823.json", "bus_20230828T110842.json", "bus_20230828T110902.json", "bus_20230828T110922.json", "bus_20230828T110942.json", "bus_20230828T111002.json", "bus_20230828T111021.json", "bus_20230828T111042.json", "bus_20230828T111103.json", "bus_20230828T111122.json", "bus_20230828T111141.json"]

        alert("現時數據設置為歷史測試數據～\n數據來自澳門2023年8月28日早上10點00分-10點10分巴士數據")
        clearInterval(autoGetBusDataId);
        // console.log("bus_location_coordinates_lists.length",bus_location_coordinates_lists.length)
        simulateTimeFlow("2023-08-28T10:00:00", "2023-08-28T10:10:00", (33 ) ); // 改左上時間加速模擬功能
        document.querySelector("#demo-data-button").style.display = "none"
        for (let list_index = 0; list_index < bus_location_coordinates_lists.length; list_index++) {
            let list_element = bus_location_coordinates_lists[list_index];
            setTimeout(async () => {
                // console.log("Delayed for "+list_index+" second.");
                fetch_list_element_url = "https://api.minimacau3d.com/20230828/" + list_element.split("_")[0] + "_location_coordinates_" + list_element.split("_")[1]
                let response_bus_data = await fetch(fetch_list_element_url).then((response) => { return response.json()} );
                customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));
                if(list_index+1 == bus_location_coordinates_lists.length){
                    document.querySelector("#demo-data-button").style.display = "flex"
                    alert("歷史數據展示完成！\n現時數據設置為實時數據～")
                    let autoGetBusDataId = setInterval(async () => {
                        let response_bus_data = await fetch(bus_api_link).then((response) => { return response.json()} );
                        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));
                    }, 3000);
                }
                }, list_index * 1000);
        }

        // */
    }
    // Update bus positions every 10 seconds在 setInterval | 函數中儲存 ID

    let autoGetBusDataId = setInterval(async () => {
        let response_bus_data = await fetch(bus_api_link).then((response) => { return response.json()} );
        //因為要按時間變化，不能用現存的customlayers去做，要用新api data去做？？？？要檢查一下，新路線
        customLayers.forEach(layer => layer.updateBusPositions(response_bus_data, filter_bus_lists));
    }, 5000);

    //加入歷史函數功能到button
    document.querySelector("#demo-data-button").addEventListener("click", RunHistoryData); 


}
