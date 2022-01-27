
/**
 * Time to text conversions
 */

var formatTime = function (seconds) {
  var minutes = Math.floor(seconds / 60),
      hours = Math.floor(minutes / 60),
      days = Math.floor(hours / 24),

      moddedMinutes = minutes % 60,
      moddedHours = hours % 24,

      minutesText = (moddedMinutes == 1) ? "1 minute" : moddedMinutes + " minutes",
      hoursText = (moddedHours == 1) ? "1 hour" : moddedHours + " hours",
      daysText = (days == 1) ? "1 day" : days + " days";

  if (days >= 1) {
    return (moddedHours === 0) ? daysText : daysText + ", " + hoursText;
  }
  else if (hours >= 1) {
    return (moddedMinutes === 0) ? hoursText : hoursText + ", " + minutesText;
  }
  else {
    return minutesText;
  }
};

var unformatTime = function (count, unit) {
  switch (unit) {
    case "seconds":
      return count;
    case "minutes":
      return unformatTime(count * 60, "seconds");
    case "hours":
      return unformatTime(count * 60, "minutes");
    case "days":
      return unformatTime(count * 24, "hours");
  }
};


/*
  * Triggers
  */
var Trigger = function(_percent, _timeAmount, _timeUnit) {
  this.percent = _percent || null;
  if (_timeAmount && _timeUnit) {
    this.timeAmount = _timeAmount;
    this.timeUnit = _timeUnit;
  } else {
    this.timeAmount = null;
    this.timeUnit = null;
  }

  return this;
};

Trigger.prototype.check = function(battery) {
  if (this.percent !== null) {
    if(this.percent >= Math.ceil(battery.level * 100)) {
      return true;
    }
  }

  if (this.time() !== null) {
    if (this.time() >= battery.dischargingTime) {
      return true;
    }
  }

  /* otherwise.. */
  return false;
};

Trigger.prototype.time = function() {
  if (this.timeAmount !== null && this.timeUnit !== null) {
    return unformatTime(this.timeAmount, this.timeUnit);
  } else {
    return null;
  }
};

Trigger.fromJsonObject = function(obj) {
  return new Trigger(obj.percent, obj.timeAmount, obj.timeUnit);
};


/**
 * Warnings
 */
var Warning = function(options, show=false) {
  options = options || {};

  this.enabled = ('enabled' in options) ? options.enabled : true;
  this.trigger = ('trigger' in options) ? options.trigger : new Trigger(5);

  this.shown = ('shown' in options) ? options.shown : false;
  this.shown = this.shown && !show; // Force not shown if show is true
};

Warning.fromJsonObject = function(obj, show=false) {
  obj.trigger = Trigger.fromJsonObject(obj.trigger);
  return new Warning(obj, show);
};

Warning.prototype.checkBattery = function(battery) {

  var isTriggered = this.trigger.check(battery);
  
  var triggered = false;
  if (this.enabled) {
    if (!battery.charging) {
      if (!this.shown && isTriggered) {
        triggered = true;
        this.showNotification(battery);
      }
    }
  }

  this.shown = isTriggered && !battery.charging;
  
  return triggered;
};

Warning.prototype.showNotification = function(battery) {
  var percentage = Math.floor(battery.level * 100);
  chrome.notifications.create(
    "battery-notifier",
    {
      type: "basic",
      title: percentage + "% power left",
      message: "",
      contextMessage: formatTime(battery.dischargingTime) + " remaining",
      isClickable: false,
      iconUrl: "assets/icon_128.png"
    },
    function () {}
  );
};


var setOptions = function(json, show=false) {
  warnings = json.map(function (obj) {
    return Warning.fromJsonObject(obj, show);
  });
  saveOptions();
  console.log("Options set.");
};

async function loadFromStorage(show = false) {
  var storeKey = "warnings";
  try {
    return new Promise((resolve, reject) => {

      chrome.storage.local.get(storeKey, function (results) {
        if (results[storeKey]) {
          var json = results[storeKey];
          setOptions(json, show);
          console.log(warnings.length + " settings loaded from local storage.", warnings);
          resolve();
        } else {
          console.log("No settings found.");
        }
        resolve();
      });
    });
  }
  catch (err) {
    console.log("Error loading settings from local storage:");
    console.log(err + " " + JSON.stringify(err));
    return null;
  }
}


function saveOptions() {
  console.log("saveOptions");
  chrome.storage.local.set({ 'warnings': warnings });
}

chrome.notifications.onClicked.addListener(function (notificationId) {
  chrome.notifications.clear(notificationId, function () {});
});


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("request", request);
  if (request.type == "setOptions") {
    setOptions(request.options, true);
  } else if (request.type == "getOptions") {
    Promise.all([loadFromStorage()]).then(() => {
      sendResponse(warnings);
    });
  } else if (request.type == "check") {
    Promise.all([loadFromStorage()]).then(() => {
      var battery = request.battery;
      var triggered = false;
      warnings.forEach(function (warning) {
        triggered = triggered || warning.checkBattery(battery);
      });
      saveOptions();
      if (triggered) {
        sendResponse(chrome.runtime.getURL("assets/alert-bells-echo.wav"));
      } else {
        sendResponse(false);
      }
    });
  }
  return true;
});

//

var warnings = [
  new Warning({})
];

chrome.runtime.onStartup.addListener(function() {
  loadFromStorage(true);
  saveOptions();
})


// chrome.windows.create({
//   url: "https://www.google.com/",
//   focused: false,
// }, function (win) {
//   win.id
//   // win represents the Window object from windows API
//   // Do something after opening
// });