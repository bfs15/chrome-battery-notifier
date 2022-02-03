
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


var setSettings = function (json, show = false) {
  console.log("setSettings", json);
  settings = json;
  settings.notifications = json.notifications.map(function (obj) {
    return Warning.fromJsonObject(obj, show);
  });
  setBrowserAlarm(settings.alarm);

  saveSettings();
  console.log("Settings set.");
};

async function loadFromStorage(show = false) {
  try {
    return new Promise((resolve, reject) => {

      chrome.storage.local.get(storeKey, function (results) {
        if (results[storeKey]) {
          var json = results[storeKey];
          setSettings(json, show);
          console.log(settings.notifications.length + " settings loaded from local storage.", settings);
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


function saveSettings() {
  console.log("saveSettings", settings);
  chrome.storage.local.set({ 'settings': settings });
}

chrome.notifications.onClicked.addListener(function (notificationId) {
  chrome.notifications.clear(notificationId, function () {});
});


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("request", request);
  if (request.type == "setSettings") {
    setSettings(request.settings, true);
  } else if (request.type == "getSettings") {
    Promise.all([loadFromStorage()]).then(() => {
      sendResponse(settings);
    });
  } else if (request.type == "check") {
    Promise.all([loadFromStorage()]).then(() => {
      var battery = request.battery;
      var triggered = false;
      settings.notifications.forEach(function (warning) {
        triggered = triggered || warning.checkBattery(battery);
      });
      saveSettings();
      if (triggered) {
        var percentage = Math.floor(battery.level * 100);
        playSound(percentage + "% left");
        // sendResponse(chrome.runtime.getURL("assets/alert-bells-echo.wav"));
        sendResponse(false);
      } else {
        sendResponse(false);
      }
    });
  }
  return true;
});

//

const storeKey = "settings";
var settings = {
  notifications: [
    new Warning({})
  ],
  alarm: {
    period: 3,
  }
};


// https://stackoverflow.com/questions/67437180/play-audio-from-background-script-in-chrome-extention-manifest-v3
function playSound(battery_info) {
    let url = chrome.runtime.getURL('audio.html');
    // set this string dynamically in your code, this is just an example
    // this will play success.wav at half the volume and close the popup after a second  
    url += '?volume=1.0&src=assets/alert-bells-echo.wav&length=2500';
    if (battery_info) {
      url += '&battery_info=' + battery_info;
    }

  chrome.windows.create({
    type: 'popup',
    focused: false,
    top: 0,
    left: 0,
    height: 100,
    width: 350,
    url
  })
  // .then(function (window) {
  //   chrome.windows.update(window.id, {
  //     state: 'minimized',
  //   })
  // });
}

function checkPopup() {
  let url = chrome.runtime.getURL('check.html');
  chrome.windows.create({
    type: 'popup',
    focused: false,
    top: 0,
    left: 0,
    height: 1,
    width: 1,
    url
  })
  .then(function (window) {
    chrome.windows.update(window.id, {
      state: "minimized",
    })
  });
}

// chrome.alarms.create({ periodInMinutes: 1 });

function setBrowserAlarm(alarm) {
  chrome.alarms.clear('periodic', cleared => {
    console.log("Alarm: cleared.");
    chrome.alarms.get('periodic', a => {
      console.log("previous alarm", a);
      if (!a) {
        console.log("Alarm: create", alarm);
        chrome.alarms.create('periodic', { periodInMinutes: alarm.period })
      };
    });

  });
}


function getCurrentTabs(callback) {
  let queryOptions = { active: true, discarded:false };
  chrome.tabs.query(queryOptions, callback);
}

function urlRunsScript(url) {
  return (
    !url.startsWith("chrome")
    && url[0] != "/"
  );
}

function tabsRunsScript(tabs) {
  return tabs.map((t) => {
    console.log("urlRunsScript", urlRunsScript(t.url), t.url);
    return urlRunsScript(t.url);
  }).reduce((a, b) => {
    return a || b;
  });
}

chrome.runtime.onStartup.addListener(function() {
  loadFromStorage(true).then(() => {
    saveSettings();
  });
})

chrome.storage.local.get(storeKey, function (results) {
  if (results[storeKey]) {
    var json = results[storeKey];
    settings.alarm = json.alarm;
    console.log("Alarm: settings loaded from local storage.", settings.alarm, "json.alarm", json.alarm);
  }
  setBrowserAlarm(settings.alarm);
});


chrome.alarms.onAlarm.addListener(() => {
  getCurrentTabs((tabs) => {
    if (!tabsRunsScript(tabs)) {
      checkPopup();
    }
  });
});
