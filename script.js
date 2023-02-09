// for the search box function
search_btn = document.querySelector('.mapboxgl-ctrl-geocoder.mapboxgl-ctrl')

search_btn.addEventListener('click', function(event) {
	search_btn.classList.add("mapboxgl-ctrl-geocoder-search-box")
});

// for the time  start Clock | current time box
const startClock = () => {
	const now = new Date();
	const h = padWithZeroes(now.getHours(), 2);
	const m = padWithZeroes(now.getMinutes(), 2);
	const s = padWithZeroes(now.getSeconds(), 2);
	document.getElementById("current-time").innerHTML = `${h}:${m}:${s}`;
	setTimeout(startClock, 500);
  };
  
const padWithZeroes = (input, length) => {
let padded = input;
if (typeof input !== "string") padded = input.toString();
return padded.padStart(length, "0");
};

function getCurrentDate() {
	var myDate = new Date();
	var year = myDate.getFullYear(); //年
	var month = myDate.getMonth() + 1; //月
	var day = myDate.getDate(); //日
	var days = myDate.getDay();
	switch(days) {
		  case 1:
				days = '週一';
				break;
		  case 2:
				days = '週二';
				break;
		  case 3:
				days = '週三';
				break;
		  case 4:
				days = '週四';
				break;
		  case 5:
				days = '週五';
				break;
		  case 6:
				days = '週六';
				break;
		  case 0:
				days = '週日';
				break;
	}
	var str = year + "年" + month + "月" + day + "日 " + days;
	return str;
}
document.getElementById("current-date").innerText = getCurrentDate();





