function check_battery(battery, callback=null) {
	console.log("battery check", battery.level);
	chrome.runtime.sendMessage({ type: "check", "battery": { level: battery.level, charging: battery.charging, dischargingTime: battery.dischargingTime } }, function (response) {
		console.log(response);
		if (response) {	
			try {
				var myAudio = new Audio(response);
				myAudio.play().catch(function (error) {
					console.warn("Battery notifier warning:", err, JSON.stringify(err));
				});
			} catch (err) {
				console.log("Battery notifier error:", err, JSON.stringify(err));
			}
		}
		if (callback) {
			callback(response);
		}
	});
}

onload = () => {
	navigator.getBattery().then(function (battery) {
		check_battery(battery, function (response) {
			close();
		});
	}, function() {
		close();
	});
	
	setTimeout(() => {
		close();
	}, 500);
}