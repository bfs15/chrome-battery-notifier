// window.resizeTo(0, 0);

onload = () => {
	navigator.getBattery().then(function (battery) {
		check_battery(battery, function (response) {
			close();
		});
		setTimeout(() => {
			close();
		}, 500);
	}, function() {
		close();
	});
}