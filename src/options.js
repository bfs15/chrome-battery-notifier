$(function() {

  var $select = $('select.main'),
      $allOptions = $('div.table'),
      $enabled = $('input[name=enabled]'),
      $allButEnabled = $('.all-but-enabled'),
      $typeRadios = $('input[name=type]'),
      $percentArg = $('.percent-arg'),
      $timeArg = $('.time-arg'),
      $timeAmount = $timeArg.find('input[name=timeArgAmount]'),
      $timeUnit = $timeArg.find('select[name=timeArgUnit]'),
      $alarmPeriod = $('.alarm-period-arg'),
      $save = $('#save');

  var defaultOptions = () => {
    return {
      enabled: false,
      trigger: {
        percent: 15,
        timeUnit: null,
        timeAmount: null
      }
    };
  };

  function checkNotifs() {
    if (!temp.settings.notifications) {
      temp.settings.notifications = [defaultOptions(), defaultOptions(), defaultOptions()];
    }
  }

  var temp = {
    settings: {
      notifications: [defaultOptions(), defaultOptions(), defaultOptions()],
      alarm: {
        period: 3
      },
    },
    index: 0,
    
    getNotification: function(index) {
      checkNotifs()
      if (index < temp.settings.notifications.length) {
        return temp.settings.notifications[index];
      } else {
        return defaultOptions();
      }
    },
    getNotificationCurr: function() {
      index = temp.index;
      checkNotifs()
      if (index < temp.settings.notifications.length) {
        return temp.settings.notifications[index];
      } else {
        return defaultOptions();
      }
    },
    getSettings: function() {
      if (!temp.settings) {
        temp.settings = {
          notifications: [defaultOptions(), defaultOptions(), defaultOptions()],
          alarm: {
            period: 3
          },
        };
      }
      checkNotifs()
      return temp.settings;
    },
    getAllSettings: function () {
      temp.getSettings();
      return temp.settings;
    },
    set: function(options) {
      temp.settings = options;
      console.log("temp.set", "options=", options, "temp=", temp)
    },
    setCurrent: function () {
      console.log("set option index", temp.index, temp);
      temp.settings.notifications[temp.index] = currentInput();
    }
  };

  function setSettings(options) {
    console.log("> options: setSettings ", options);
    temp.set(options);
    updateDom();
  }
  
  function loadSettings() {
    console.log("loadSettings");
    chrome.runtime.sendMessage({ type: "getSettings" }, function (response) {
      setSettings(response);
    });
  }

  function currentInput() {
    var current = {};
    current.enabled = $enabled.is(':checked');
    current.trigger = {};
    if (isTimeType()) {
      current.trigger.percent = null;
      current.trigger.timeAmount = parseInt($timeAmount.val());
      current.trigger.timeUnit = $timeUnit.val();
    } else {
      current.trigger.percent = parseInt($percentArg.find('input').val());
      current.trigger.timeAmount = null;
      current.trigger.timeUnit = null;
    }
    temp.settings.alarm.period = parseInt($alarmPeriod.find('input').val());
    return current;
  }

  function saveSettings() {
    temp.setCurrent();
    chrome.runtime.sendMessage({type: "setSettings", settings: temp.getAllSettings()}, function (response) {
      console.log("> options: Settings saved. Response: ", response);
      setSettings(response);
    });
    $save.prop('disabled', true);
  }


  function changeSelect() {
    $allOptions.fadeOut(150, function() {
      temp.index = $select.val();
      updateDom();
      $allOptions.fadeIn(400);
    });
  }


  function updateDom() {
    var notification = temp.getNotificationCurr();

    var triggerType = (notification.trigger.percent !== null) ? 'percent' : 'time';

    $enabled.prop('checked', notification.enabled);
    $typeRadios.find('*[value=' + triggerType + ']').prop('checked', true);
    updateTypeDom(notification);
    updateEnabledDom();
  }

  function updateEnabledDom() {
    if ($enabled.prop('checked')) {
      $allButEnabled.removeClass('disabled').find('input').prop('disabled', false);
    } else {
      $allButEnabled.addClass('disabled').find('input').prop('disabled', true);
    }
  }

  function isTimeType() {
    return $typeRadios.filter('*:checked').val() == 'time';
  }

  function updateTypeDom(warning) {
    console.log("updateTypeDom", warning, "temp", temp);
    if ( ! isTimeType() ) {
      $percentArg.show();
      $timeArg.hide();
      if (warning) {
        $percentArg.find('input').val(warning.trigger.percent);
      }
    } else {
      $timeArg.show();
      $percentArg.hide();
      if (warning) {
        $timeAmount.val(warning.trigger.timeAmount);
        $timeUnit.val(warning.trigger.timeUnit);
      }
    }
    $alarmPeriod.find('input').val(temp.settings.alarm.period);
  }

  function updateSaveButton() {
    if (!$save.is(':enabled')) {
      var current = currentInput(),
        saved = temp.getSettings();

      var areSame =
        current.enabled === saved.enabled &&
        current.trigger.timeAmount === saved.trigger.timeAmount &&
        current.trigger.timeUnit === saved.trigger.timeUnit &&
        current.trigger.percent === saved.trigger.percent;

      if (areSame) {
        $save.prop('disabled', true);
      } else {
        $save.prop('disabled', false);
      }
    }
  }

  $select.on('change', changeSelect);

  $enabled.on('click', updateEnabledDom);

  $typeRadios.on('click', function() {
    updateTypeDom(currentInput());
  });

  $save.on('click', saveSettings);

  $allOptions.on('click mouseenter mouseleave keypress change select', updateSaveButton);

  loadSettings();
});