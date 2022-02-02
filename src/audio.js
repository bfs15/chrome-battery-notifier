// window.resizeTo(0, 0);

onload = () => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
	let audio = new Audio(urlParams.get('src'));
	console.log(urlParams.get('src'));
    audio.volume = urlParams.get('volume');
    audio.play();
	var d = document.getElementById("battery_info");
	d.innerHTML = "Battery alert " + urlParams.get('battery_info');
    setTimeout(()=>{
        close();
    }, urlParams.get('length'));
}