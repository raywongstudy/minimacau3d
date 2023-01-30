// for the search box function
search_btn = document.querySelector('.mapboxgl-ctrl-geocoder.mapboxgl-ctrl')

search_btn.addEventListener('click', function(event) {
	search_btn.classList.add("mapboxgl-ctrl-geocoder-search-box")
});