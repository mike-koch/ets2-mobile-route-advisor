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

    // round truck speed
    data.truckSpeedRounded = Math.abs(data.truck.speed > 0
        ? Math.floor(data.truck.speed)
        : Math.round(data.truck.speed));
    // convert kilometers per hour to miles per hour (just an example)
    data.truckSpeedMph = data.truck.speed * 0.621371;
    data.truckSpeedMphRounded = Math.abs(Math.floor(data.truckSpeedMph));
    // convert gear to readable format
    data.gear = data.truck.gear > 0 ? 'D' + data.truck.gear : (data.truck.gear < 0 ? 'R' : 'N');
    data.currentFuelPercentage = (data.truck.fuel / data.truck.fuelCapacity) * 100;

    // scsTruckDamage is the value SCS uses in the route advisor
    data.scsTruckDamage = getDamagePercentage(data);
    data.scsTruckDamageRounded = Math.floor(data.scsTruckDamage);
    data.wearTrailerRounded = Math.floor(data.trailer.wear * 100);

    data.gameTime12h = getTime(data.game.time, 12);
    var originalTime = data.game.time;
    data.game.time = getTime(data.game.time, 24);
    data.jobDeadlineTime12h = getTime(data.job.deadlineTime, 12);
    data.job.deadlineTime = getTime(data.job.deadlineTime, 24);
    data.trailerMassTons = data.trailer.attached ? ((data.trailer.mass / 1000.0) + ' t') : '';
    data.trailerMassKg = data.trailer.attached ? data.trailer.mass + ' kg' : '';
    data.jobIncome = getJobIncome(data.job.income);
    data.game.nextRestStopTimeArray = getHoursMinutesAndSeconds(data.game.nextRestStopTime);
    data.game.nextRestStopTime = processTimeDifferenceArray(data.game.nextRestStopTimeArray);
    data.navigation.speedLimitMph = data.navigation.speedLimit * .621371;
    data.navigation.speedLimitMphRounded = Math.round(data.navigation.speedLimitMph);
    data.navigation.estimatedDistanceKm = data.navigation.estimatedDistance / 1000;
    data.navigation.estimatedDistanceMi = data.navigation.estimatedDistanceKm * .621371;
    data.navigation.estimatedDistanceKmRounded = Math.floor(data.navigation.estimatedDistanceKm);
    data.navigation.estimatedDistanceMiRounded = Math.floor(data.navigation.estimatedDistanceMi);
    var originalEstimatedTime = data.navigation.estimatedTime;
    var timeToDestinationArray = getHoursMinutesAndSeconds(originalEstimatedTime);
    data.navigation.estimatedTime = addTime(originalTime, timeToDestinationArray[0], timeToDestinationArray[1], timeToDestinationArray[2]).toISOString();
    data.navigation.estimatedTime = getTime(data.navigation.estimatedTime, 24);
    data.navigation.estimatedTime12h = getTime(originalEstimatedTime, 12);
    data.navigation.timeToDestination = processTimeDifferenceArray(timeToDestinationArray);

    // return changed data to the core for rendering
    return data;
};

Funbit.Ets.Telemetry.Dashboard.prototype.render = function (data) {
    // data - same data object as in the filter function
    $('.fillingIcon.truckDamage .top').css('height', (100 - data.scsTruckDamage) + '%');
    $('.fillingIcon.trailerDamage .top').css('height', (100 - data.trailer.wear * 100) + '%');
    $('.fillingIcon.fuel .top').css('height', (100 - data.currentFuelPercentage) + '%');
    $('.fillingIcon.rest .top').css('height', (100 - getFatiguePercentage(data.game.nextRestStopTimeArray[0], data.game.nextRestStopTimeArray[1])) + '%');

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
}

Funbit.Ets.Telemetry.Dashboard.prototype.initialize = function (skinConfig) {
    //
    // skinConfig - a copy of the skin configuration from config.json
    //
    // this function is called before everything else,
    // so you may perform any DOM or resource initializations here

    g_skinConfig = skinConfig;

    // Initialize JavaScript
    g_pathPrefix = 'skins/' + skinConfig.name;
    $.getScript(g_pathPrefix + '/js/ol.js');
    $.getScript(g_pathPrefix + '/js/map.js');

    // Process Speed Units
    var distanceUnits = skinConfig.distanceUnits;
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
    var weightUnits = skinConfig.weightUnits;
    if (weightUnits === 'kg') {
        $('.trailerMassKgOrT').addClass('trailerMassKg').removeClass('trailerMassKgOrT');
    } else if (weightUnits === 't') {
        $('.trailerMassKgOrT').addClass('trailerMassTons').removeClass('trailerMassKgOrT');
    }

    // Process 12 vs 24 hr time
    var timeFormat = skinConfig.timeFormat;
    if (timeFormat === '12h') {
        $('.game-time').addClass('gameTime12h').removeClass('game-time');
        $('.job-deadlineTime').addClass('jobDeadlineTime12h').removeClass('job-deadlineTime');
        $('.navigation-estimatedTime').addClass('navigation-estimatedTime12h').removeClass('navigation-estimatedTime');
    }

    // Process language JSON
    $.getJSON(g_pathPrefix+'/language/'+skinConfig.language, function(json) {
        g_translations = json;
        $.each(json, function(key, value) {
            updateLanguage(key, value);
        });
    });

    showTab('_cargo');
}

function getHoursMinutesAndSeconds(time) {
    var dateTime = new Date(time);
    var hour = dateTime.getUTCHours();
    var minute = dateTime.getUTCMinutes();
    var second = dateTime.getUTCSeconds();
    return [hour, minute, second];
}

function addTime(time, hours, minutes, seconds) {
    var dateTime = new Date(time);
    dateTime = dateTime.addHours(hours);
    dateTime = dateTime.addMinutes(minutes);
    dateTime = dateTime.addSeconds(seconds);

    return dateTime;
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
    var hours = hourMinuteArray[0];
    var minutes = hourMinuteArray[1];


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
    var formattedMinutes = currentMinutes < 10 ? '0'+currentMinutes : currentMinutes;
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
    var formattedHours = currentHours < 10 ? '0'+currentHours : currentHours;

    return currentDay + ' ' + formattedHours + ':' + formattedMinutes + currentPeriod;
}

function updateLanguage(key, value) {
    $('.l' + key).text(value);
}

function getJobIncome(income) {
    /*
        Looking at an economy_data.sii file found, the conversion rates are:
        EUR: 1
        CHF: 1.2
        CZK: 25
        GBP: 0.8
        PLN: 4.2
        HUF: 293
    */
    var currencyCode = g_skinConfig.currencyCode;
    if (currencyCode == 'EUR') {
        income = '&euro;&nbsp;' + income;
    } else if (currencyCode == 'GBP') {
        income *= 0.8;
        income = '&pound;&nbsp;' + income;
    } else if (currencyCode == 'CHF') {
        income *= 1.2;
        income += '.&nbsp;-&nbsp;CHF';
    } else if (currencyCode == 'CZK') {
        income *= 25;
        income += '.&nbsp;-&nbsp;K&#x10D;';
    } else if (currencyCode == 'PLN') {
        income *= 4.2;
        income += '.&nbsp;-&nbsp;z&#0322;';
    } else if (currencyCode == 'HUF') {
        income *= 293;
        income += '.&nbsp;-&nbsp;Ft';
    }
    return income;
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

// The map is loaded when the user tries to view it for the first time.
function goToMap() {
    showTab('_map');
    // "g_map" variable is defined in js/map.js.
    if (!g_map) {
        buildMap('_map');
    }
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
