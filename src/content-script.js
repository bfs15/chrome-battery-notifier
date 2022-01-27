
navigator.getBattery().then(function(battery) {
	battery.addEventListener('levelchange', function () {
		console.log("levelchange", battery.level);
		chrome.runtime.sendMessage({ type: "check", "battery": { level: battery.level, charging: battery.charging, dischargingTime: battery.dischargingTime } }, function (response) {
			console.log(response);
			if (response) {	
				try {
					var myAudio = new Audio(response);
					myAudio.play().catch(function (error) {
						console.log("Battery notifier warning:", err, JSON.stringify(err));
					});
				} catch (err) {
					console.log("Battery notifier error:", err, JSON.stringify(err));
				}
			}
		});
	});
}, function() {
	console.log("no battery found");
});