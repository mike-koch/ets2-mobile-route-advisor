/*
    ======================================
    Custom dashboard telemetry data filter
    ======================================
*/

// This filter is used to change telemetry data
// before it is displayed on the dashboard.
// For example, you may convert km/h to mph, kilograms to tons, etc.
// "data" object is an instance of the Ets2TelemetryData class
// defined in dashboard-core.ts (or see JSON response in the server's API).

Funbit.Ets.Telemetry.Dashboard.prototype.filter = function (data) {
    // If the game isn't connected, don't both calculating anything.
    if (!data.game.connected) {
        return data;
    }

    // Process DOM changes here now that we have data. We should only do this once.
    if (!g_processedDomChanges) {
        processDomChanges(data);
    }

    data.isEts2 = g_runningGame == 'ETS2';
    data.isAts = !data.isEts2;

    // Logic consistent between ETS2 and ATS
    data.truckSpeedRounded = Math.abs(data.truck.speed > 0
        ? Math.floor(data.truck.speed)
        : Math.round(data.truck.speed));
    data.truckSpeedMph = data.truck.speed * 0.621371;
    data.truckSpeedMphRounded = Math.abs(Math.floor(data.truckSpeedMph));
    data.gear = data.truck.gear > 0 ? 'D' + data.truck.gear : (data.truck.gear < 0 ? 'R' : 'N');
    data.currentFuelPercentage = (data.truck.fuel / data.truck.fuelCapacity) * 100;
    data.scsTruckDamage = getDamagePercentage(data);
    data.scsTruckDamageRounded = Math.floor(data.scsTruckDamage);
    data.wearTrailerRounded = Math.floor(data.trailer.wear * 100);
    data.gameTime12h = getTime(data.game.time, 12);
    var originalTime = data.game.time;
    data.game.time = getTime(data.game.time, 24);
    var tons = (data.trailer.mass / 1000.0).toFixed(2);
    if (tons.substr(tons.length - 2) === "00") {
        tons = parseInt(tons);
    }
    data.trailerMassTons = data.trailer.attached ? (tons + ' t') : '';
    data.trailerMassKg = data.trailer.attached ? data.trailer.mass + ' kg' : '';
    data.trailerMassLbs = data.trailer.attached ? Math.round(data.trailer.mass * 2.20462) + ' lb' : '';
    data.game.nextRestStopTimeArray = getDaysHoursMinutesAndSeconds(data.game.nextRestStopTime);
    data.game.nextRestStopTime = processTimeDifferenceArray(data.game.nextRestStopTimeArray);
    data.navigation.speedLimitMph = data.navigation.speedLimit * .621371;
    data.navigation.speedLimitMphRounded = Math.round(data.navigation.speedLimitMph);
    data.navigation.estimatedDistanceKm = data.navigation.estimatedDistance / 1000;
    data.navigation.estimatedDistanceMi = data.navigation.estimatedDistanceKm * .621371;
    data.navigation.estimatedDistanceKmRounded = Math.floor(data.navigation.estimatedDistanceKm);
    data.navigation.estimatedDistanceMiRounded = Math.floor(data.navigation.estimatedDistanceMi);
    var timeToDestinationArray = getDaysHoursMinutesAndSeconds(data.navigation.estimatedTime);
    data.navigation.estimatedTime = addTime(originalTime,
                                            timeToDestinationArray[0],
                                            timeToDestinationArray[1],
                                            timeToDestinationArray[2],
                                            timeToDestinationArray[3]).toISOString();
    var estimatedTime24h = data.navigation.estimatedTime
    data.navigation.estimatedTime = getTime(data.navigation.estimatedTime, 24);
    data.navigation.estimatedTime12h = getTime(estimatedTime24h, 12);
    data.navigation.timeToDestination = processTimeDifferenceArray(timeToDestinationArray);
    data.job.remainingTimeArray = getDaysHoursMinutesAndSeconds(data.job.remainingTime);
    data.job.remainingTime = processTimeDifferenceArray(data.job.remainingTimeArray);

    // ETS2-specific logic
    data.isWorldOfTrucksContract = isWorldOfTrucksContract(data);
    if (data.isEts2) {
        data.jobIncome = getEts2JobIncome(data.job.income);
    }

    // ATS-specific logic
    if (data.isAts) {
        data.jobIncome = getAtsJobIncome(data.job.income);
    }

    // Non-WoT stuff here
    if (!data.isWorldOfTrucksContract || data.isAts) {
        data.jobDeadlineTime12h = getTime(data.job.deadlineTime, 12);
        data.job.deadlineTime = getTime(data.job.deadlineTime, 24);
    }

    // return changed data to the core for rendering
    return data;
};

Funbit.Ets.Telemetry.Dashboard.prototype.render = function (data) {
    // If the game isn't connected, don't both calculating anything.
    if (!data.game.connected) {
        return data;
    }

    if (data.game.gameName != null) {
        g_lastRunningGame = g_runningGame;
        g_runningGame = data.game.gameName;


        if (g_runningGame != g_lastRunningGame
            && g_lastRunningGame !== undefined) {
            setLocalStorageItem('currentTab', $('._tabs').find('article:visible:first').attr('id'));
            location.reload();
        }
    }

    // data - same data object as in the filter function
    $('.fillingIcon.truckDamage .top').css('height', (100 - data.scsTruckDamage) + '%');
    $('.fillingIcon.trailerDamage .top').css('height', (100 - data.trailer.wear * 100) + '%');
    $('.fillingIcon.fuel .top').css('height', (100 - data.currentFuelPercentage) + '%');
    $('.fillingIcon.rest .top').css('height', (100 - getFatiguePercentage(data.game.nextRestStopTimeArray[1], data.game.nextRestStopTimeArray[2])) + '%');

    // Process DOM for connection
    if (data.game.connected) {
        $('#_overlay').hide();
    } else {
        $('#_overlay').show();
    }

    // Process DOM for job
    if (data.trailer.attached) {
        $('.hasJob').show();
        $('.noJob').hide();
    } else {
        $('.hasJob').hide();
        $('.noJob').show();
    }

    // Process map location only if the map has been rendered
    if (g_map) {
        // X is longitude-ish, Y is altitude-ish, Z is latitude-ish.
        // http://forum.scssoft.com/viewtopic.php?p=422083#p422083
        updatePlayerPositionAndRotation(
            data.truck.placement.x,
            data.truck.placement.z,
            data.truck.placement.heading,
            data.truck.speed
        );
    }

    // If speed limit is "0", hide the speed limit display
    if (data.navigation.speedLimit === 0) {
        $('#speed-limit').hide();
    } else {
        $('#speed-limit').css('display', 'flex');
    }

    // Set skin to World of Trucks mode if this is a World of Trucks contract
    if (data.isWorldOfTrucksContract) {
        $('#expected > p[data-mra-text="Expected"]').text(g_translations.Remains);
        $('#expected > p > span.job-deadlineTime').text(g_translations.WorldOfTrucksContract)
            .css('color', '#0CAFF0');
        $('#remains > p').css('visibility', 'hidden');

    } else {
        $('#expected > p[data-mra-text="Expected"]').text(g_translations.Expected);
        $('#expected > p > span.job-deadlineTime').css('color', '#fff');
        $('#remains > p').css('visibility', '');
    }

    // Set the current game attribute for any properties that are game-specific
    $('.game-specific').attr('data-game-name', data.game.gameName);

    // Update red bar if speeding
    updateSpeedIndicator(data.navigation.speedLimit, data.truck.speed);

    return data;
}

Funbit.Ets.Telemetry.Dashboard.prototype.initialize = function (skinConfig) {
    //
    // skinConfig - a copy of the skin configuration from config.json
    //
    // this function is called before everything else,
    // so you may perform any DOM or resource initializations here

    g_skinConfig = skinConfig;
    g_pathPrefix = 'skins/' + g_skinConfig.name;

    // Process language JSON
    $.getJSON(g_pathPrefix + '/language/' + g_skinConfig.language, function(json) {
        g_translations = json;
        $.each(json, function(key, value) {
            updateLanguage(key, value);
        });
    });

    // Check for updates
    if (g_skinConfig.checkForUpdates) {
        $.get('http://mikekoch.me/ets2-mobile-route-advisor/latest-version.html', function(data) {
            var latestVersion = data.trim();
            if (latestVersion != g_currentVersion) {
                $('#update-status').show();
            }
        });
    }

    // Set the version number on the about page
    versionText = $('#version').text();
    $('#version').text(versionText + g_currentVersion);

    var tabToShow = getLocalStorageItem('currentTab', '_cargo');
    if (tabToShow == null) {
        tabToShow = '_cargo';
    }
    removeLocalStorageItem('currentTab');
    showTab(tabToShow);
}

function getDaysHoursMinutesAndSeconds(time) {
    var dateTime = new Date(time);
    var days = dateTime.getUTCDay();
    var hour = dateTime.getUTCHours();
    var minute = dateTime.getUTCMinutes();
    var second = dateTime.getUTCSeconds();
    return [days, hour, minute, second];
}

function addTime(time, days, hours, minutes, seconds) {
    var dateTime = new Date(time);

    return dateTime.addDays(days)
        .addHours(hours)
        .addMinutes(minutes)
        .addSeconds(seconds);
}

function getFatiguePercentage(hoursUntilRest, minutesUntilRest) {
    var FULLY_RESTED_TIME_REMAINING_IN_MILLISECONDS = 11*60*60*1000; // 11 hours * 60 min * 60 sec * 1000 milliseconds

    if (hoursUntilRest <= 0 && minutesUntilRest <= 0) {
        return 100;
    }

    var hoursInMilliseconds = hoursUntilRest * 60 * 60 * 1000; // # hours * 60 min * 60 sec * 1000 milliseconds
    var minutesInMilliseconds = minutesUntilRest * 60 * 1000; // # minutes * 60 sec * 1000 milliseconds

    return 100 - (((hoursInMilliseconds + minutesInMilliseconds) / FULLY_RESTED_TIME_REMAINING_IN_MILLISECONDS) * 100);
}

function processTimeDifferenceArray(hourMinuteArray) {
    var day = hourMinuteArray[0];
    var hours = hourMinuteArray[1];
    var minutes = hourMinuteArray[2];

    hours += (day - 1) * 24;

    if (hours <= 0 && minutes <= 0) {
        minutes = g_translations.XMinutes.replace('{0}', 0);
        return minutes;
    }

    if (hours == 1) {
        hours = g_translations.XHour.replace('{0}', hours);
    } else if (hours == 0) {
        hours = '';
    } else {
        hours = g_translations.XHours.replace('{0}', hours);
    }

    if (minutes == 1) {
        minutes = g_translations.XMinute.replace('{0}', minutes);
    } else {
        minutes = g_translations.XMinutes.replace('{0}', minutes);
    }
    return hours + ' ' + minutes;
}

function getTime(gameTime, timeUnits) {
    var currentTime = new Date(gameTime);
    var currentPeriod = timeUnits === 12 ? ' AM' : '';
    var currentHours = currentTime.getUTCHours();
    var currentMinutes = currentTime.getUTCMinutes();
    var formattedMinutes = currentMinutes < 10 ? '0' + currentMinutes : currentMinutes;
    var currentDay = '';


    switch (currentTime.getUTCDay()) {
        case 0:
            currentDay = g_translations.SundayAbbreviated;
            break;
        case 1:
            currentDay = g_translations.MondayAbbreviated;
            break;
        case 2:
            currentDay = g_translations.TuesdayAbbreviated;
            break;
        case 3:
            currentDay = g_translations.WednesdayAbbreviated;
            break;
        case 4:
            currentDay = g_translations.ThursdayAbbreviated;
            break;
        case 5:
            currentDay = g_translations.FridayAbbreviated;
            break;
        case 6:
            currentDay = g_translations.SaturdayAbbreviated;
            break;
    }

    if (currentHours > 12 && timeUnits === 12) {
        currentHours -= 12;
        currentPeriod = ' PM';
    }
    if (currentHours == 0) {
        currentHours = 12;
    }
    var formattedHours = currentHours < 10 && timeUnits === 24 ? '0' + currentHours : currentHours;

    return currentDay + ' ' + formattedHours + ':' + formattedMinutes + currentPeriod;
}

function updateLanguage(key, value) {
    $('[data-mra-text="' + key + '"]').text(value);
}

function getEts2JobIncome(income) {
    /*
        See https://github.com/mike-koch/ets2-mobile-route-advisor/wiki/Side-Notes#currency-code-multipliers
        for more information.
    */
    var currencyCode = g_skinConfig[g_configPrefix].currencyCode;
    var currencyCodes = [];
    currencyCodes['EUR'] = buildCurrencyCode(1, '', '&euro;', '');
    currencyCodes['GBP'] = buildCurrencyCode(0.8, '', '&pound;', '');
    currencyCodes['CHF'] = buildCurrencyCode(1.2, '', '', ' CHF');
    currencyCodes['CZK'] = buildCurrencyCode(25, '', '', ' K&#x10D;');
    currencyCodes['PLN'] = buildCurrencyCode(4.2, '', '', ' z&#0322;');
    currencyCodes['HUF'] = buildCurrencyCode(293, '', '', ' Ft');
    currencyCodes['DKK'] = buildCurrencyCode(7.5, '', '', ' kr');
    currencyCodes['SEK'] = buildCurrencyCode(9.4, '', '', ' kr');
    currencyCodes['NOK'] = buildCurrencyCode(8.6, '', '', ' kr');

    var code = currencyCodes[currencyCode];

    if (code === undefined) {
        var errorText = "Configuration Issue: The currency code '" + currencyCode + "' is invalid. Reverted to 'EUR'.";
        code = currencyCodes['EUR'];
        console.error(errorText);
    }

    return formatIncome(income, code);
}

function buildCurrencyCode(multiplier, symbolOne, symbolTwo, symbolThree) {
    return {
        "multiplier": multiplier,
        "symbolOne": symbolOne,
        "symbolTwo": symbolTwo,
        "symbolThree": symbolThree
    };
}

function formatIncome(income, currencyCode) {
    /* Taken directly from economy_data.sii:
          - {0} First prefix (no currency codes currently use this)
          - {1} Second prefix (such as euro, pound, dollar, etc)
          - {2} The actual income, already converted into the proper currency
          - {3} Third prefix (such as CHF, Ft, or kr)
    */
    var incomeFormat = "{0}{1} {2}.- {3}";
    income *= currencyCode.multiplier;

    return incomeFormat.replace('{0}', currencyCode.symbolOne)
        .replace('{1}', currencyCode.symbolTwo)
        .replace('{2}', income)
        .replace('{3}', currencyCode.symbolThree);
}

function getAtsJobIncome(income) {
    /*
        See https://github.com/mike-koch/ets2-mobile-route-advisor/wiki/Side-Notes#currency-code-multipliers
        for more information.
    */
    var currencyCode = g_skinConfig[g_configPrefix].currencyCode;
    var currencyCodes = [];
    currencyCodes['USD'] = buildCurrencyCode(1, '', '&#36;', '');
    currencyCodes['EUR'] = buildCurrencyCode(.75, '', '&euro;', '');

    var code = currencyCodes[currencyCode];

    if (code === undefined) {
        var errorText = "Configuration Issue: The currency code '" + currencyCode + "' is invalid. Reverted to 'USD'.";
        code = currencyCodes['USD'];
        console.error(errorText);
    }

    return formatIncome(income, code);
}

function getDamagePercentage(data) {
    // Return the max value of all damage percentages.
    return Math.max(data.truck.wearEngine,
                    data.truck.wearTransmission,
                    data.truck.wearCabin,
                    data.truck.wearChassis,
                    data.truck.wearWheels) * 100;
}

function showTab(tabName) {
    $('._active_tab').removeClass('_active_tab');
    $('#' + tabName).addClass('_active_tab');

    $('._active_tab_button').removeClass('_active_tab_button');
    $('#' + tabName + '_button').addClass('_active_tab_button');
}

/** Returns the difference between two dates in ISO 8601 format in an [hour, minutes] array */
function getTimeDifference(begin, end) {
    var beginDate = new Date(begin);
    var endDate = new Date(end);
    var MILLISECONDS_IN_MINUTE = 60*1000;
    var MILLISECONDS_IN_HOUR = MILLISECONDS_IN_MINUTE*60;
    var MILLISECONDS_IN_DAY = MILLISECONDS_IN_HOUR*24;

    var hours = Math.floor((endDate - beginDate) % MILLISECONDS_IN_DAY / MILLISECONDS_IN_HOUR) // number of hours
    var minutes = Math.floor((endDate - beginDate) % MILLISECONDS_IN_DAY % MILLISECONDS_IN_HOUR / MILLISECONDS_IN_MINUTE) // number of minutes
    return [hours, minutes];
}

function isWorldOfTrucksContract(data) {
    var WORLD_OF_TRUCKS_DEADLINE_TIME = "0001-01-01T00:00:00Z";
    var WORLD_OF_TRUCKS_REMAINING_TIME = "0001-01-01T00:00:00Z";

    return data.job.deadlineTime === WORLD_OF_TRUCKS_DEADLINE_TIME
        && data.job.remainingTime === WORLD_OF_TRUCKS_REMAINING_TIME;
}

// Wrapper function to set an item to local storage.
function setLocalStorageItem(key, value) {
    if (typeof(Storage) !== "undefined" && localStorage != null) {
        localStorage.setItem(key, value);
    }
}

// Wrapper function to get an item from local storage, or default if local storage is not supported.
function getLocalStorageItem(key, defaultValue) {
    if (typeof(Storage) !== "undefined" && localStorage != null) {
        return localStorage.getItem(key);
    }

    return defaultValue;
}

// Wrapper function to remove an item from local storage
function removeLocalStorageItem(key) {
    if (typeof(Storage) !== "undefined" && localStorage != null) {
        return localStorage.removeItem(key);
    }
}

function processDomChanges(data) {
    g_configPrefix = 'ets2';
    if (data.game.gameName != null) {
        g_configPrefix = data.game.gameName.toLowerCase();
    }

    // Initialize JavaScript
    var mapPack = g_skinConfig[g_configPrefix].mapPack;

    // Process map pack JSON
    $.getJSON(g_pathPrefix + '/maps/' + mapPack + '/config.json', function(json) {
        g_mapPackConfig = json;

        loadScripts(mapPack, 0, g_mapPackConfig.scripts);
    });

    // Process Speed Units
    var distanceUnits = g_skinConfig[g_configPrefix].distanceUnits;
    if (distanceUnits === 'km') {
        $('.speedUnits').text('km/h');
        $('.distanceUnits').text('km');
        $('.truckSpeedRoundedKmhMph').addClass('truckSpeedRounded').removeClass('truckSpeedRoundedKmhMph');
        $('.speedLimitRoundedKmhMph').addClass('navigation-speedLimit').removeClass('speedLimitRoundedKmhMph');
        $('.navigationEstimatedDistanceKmMi').addClass('navigation-estimatedDistanceKmRounded').removeClass('navigationEstimatedDistanceKmMi');
    } else if (distanceUnits === 'mi') {
        $('.speedUnits').text('mph');
        $('.distanceUnits').text('mi');
        $('.truckSpeedRoundedKmhMph').addClass('truckSpeedMphRounded').removeClass('truckSpeedRoundedKmhMph');
        $('.speedLimitRoundedKmhMph').addClass('navigation-speedLimitMphRounded').removeClass('speedLimitRoundedKmhMph');
        $('.navigationEstimatedDistanceKmMi').addClass('navigation-estimatedDistanceMiRounded').removeClass('navigationEstimatedDistanceKmMi');
    }

    // Process kg vs tons
    var weightUnits = g_skinConfig[g_configPrefix].weightUnits;
    if (weightUnits === 'kg') {
        $('.trailerMassKgOrT').addClass('trailerMassKg').removeClass('trailerMassKgOrT');
    } else if (weightUnits === 't') {
        $('.trailerMassKgOrT').addClass('trailerMassTons').removeClass('trailerMassKgOrT');
    } else if (weightUnits === 'lb') {
        $('.trailerMassKgOrT').addClass('trailerMassLbs').removeClass('trailerMassKgOrT');
    }

    // Process 12 vs 24 hr time
    var timeFormat = g_skinConfig[g_configPrefix].timeFormat;
    if (timeFormat === '12h') {
        $('.game-time').addClass('gameTime12h').removeClass('game-time');
        $('.job-deadlineTime').addClass('jobDeadlineTime12h').removeClass('job-deadlineTime');
        $('.navigation-estimatedTime').addClass('navigation-estimatedTime12h').removeClass('navigation-estimatedTime');
    }

    g_processedDomChanges = true;
}

function loadScripts(mapPack, index, array) {
    $.getScript(g_pathPrefix + '/maps/' + mapPack + '/' + array[index], function() {
        var nextIndex = index + 1;
        if (nextIndex != array.length) {
            loadScripts(mapPack, nextIndex, array);
        } else {
            if (buildMap('_map')) {
                $('article > p.loading-text').hide();
            }
        }
    });
}

function goToMap() {
    showTab('_map');
    g_map.updateSize();
}

function updateSpeedIndicator(speedLimit, currentSpeed) {
    /*
     The game starts the red indication at 1 km/h over, and stays a solid red at 8 km/h over (...I think).
    */
    var MAX_SPEED_FOR_FULL_RED = 8;
    var difference = parseInt(currentSpeed) - speedLimit;
    var opacity = 0;

    if (difference > 0 && speedLimit != 0) {
        var opacity = difference / MAX_SPEED_FOR_FULL_RED;
    }

    var style = 'linear-gradient(to bottom, rgba(127,0,0,{0}) 0%, rgba(255,0,0,{0}) 50%, rgba(127,0,0,{0}) 100%)';
    style = style.split('{0}').join(opacity);
    $('.dashboard').find('aside').find('div._speed').css('background', style);
}

Date.prototype.addDays = function(d) {
    this.setUTCDate(this.getUTCDate() + d - 1);
    return this;
}

Date.prototype.addHours = function(h) {
   this.setTime(this.getTime() + (h*60*60*1000));
   return this;
}

Date.prototype.addMinutes = function(m) {
    this.setTime(this.getTime() + (m*60*1000));
    return this;
}

Date.prototype.addSeconds = function(s) {
    this.setTime(this.getTime() + (s*1000));
    return this;
}

// Global vars

// Gets updated to the actual path in initialize function.
var g_pathPrefix;

// Loaded with the JSON object for the choosen language.
var g_translations;

// A copy of the skinConfig object.
var g_skinConfig;

// The current version of ets2-mobile-route-advisor
var g_currentVersion = '3.3.2';

// The currently running game
var g_runningGame;

// The prefix for game-specific settings (either "ets2" or "ats")
var g_configPrefix;

// The running game the last time we checked
var g_lastRunningGame;

// The map pack configuration for the ets2 and ats map packs
var g_mapPackConfig;

// Checked if we have processed the DOM changes already.
var g_processedDomChanges;

var g_map;
