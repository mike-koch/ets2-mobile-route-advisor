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
    
    data.gameTime12h = getTime(data.game.time, 12, true);
    data.jobDeadlineTime12h = getTime(data.job.deadlineTime, 12, false);
    data.trailerMassTons = data.trailer.attached ? ((data.trailer.mass / 1000.0) + ' t') : '';
    data.trailerMassKg = data.trailer.attached ? data.trailer.mass + ' kg' : '';
    data.jobIncome = getJobIncome(data.job.income);
    data.game.nextRestStopTimeArray = getTimeDifference(data.game.time, data.game.nextRestStopTime);
    data.game.nextRestStopTime = processTimeDifferenceArray(data.game.nextRestStopTimeArray);
    data.navigation.speedLimitMph = data.navigation.speedLimit * .621371;
    data.navigation.speedLimitMphRounded = Math.floor(data.navigation.speedLimitMph);
    data.navigation.estimatedDistanceKm = data.navigation.estimatedDistance / 1000;
    data.navigation.estimatedDistanceMi = data.navigation.estimatedDistanceKm * .621371;
    data.navigation.estimatedDistanceKmRounded = Math.floor(data.navigation.estimatedDistanceKm);
    data.navigation.estimatedDistanceMiRounded = Math.floor(data.navigation.estimatedDistanceMi);
    var originalEstimatedTime = data.navigation.estimatedTime;
    data.navigation.estimatedTime = getTime(data.navigation.estimatedTime, 24, false);
    data.navigation.estimatedTime12h = getTime(originalEstimatedTime, 12, false);
    var timeToDestinationArray = getTimeDifference(data.game.time, originalEstimatedTime);
    data.navigation.timeToDestination = processTimeDifferenceArray(timeToDestinationArray);
    
    // return changed data to the core for rendering
    return data;
};

Funbit.Ets.Telemetry.Dashboard.prototype.render = function (data) {
    //
    // data - same data object as in the filter function
    //
    $('#fuelLine').css('width', data.currentFuelPercentage + '%');
    $('#damageLine').css('width', data.scsTruckDamage + '%');
    $('#truckDamageIcon').css('height', getDamageFillForTruck(data.scsTruckDamage) + '%');
    $('#trailerDamageIcon').css('height', getDamageFillForTrailer(data.trailer.wear * 100) + '%');
    $('#restLine').css('width', getFatiguePercentage(data.game.nextRestStopTimeArray[0], data.game.nextRestStopTimeArray[1]) + '%');
    
    // Process DOM for connection
    if (data.game.connected) {
        $('.has-connection').show();
        $('.no-connection').hide();
    }
    
    // Process DOM for job
    if (data.trailer.attached) {
        $('.hasJob').show();
        $('.noJob').hide();
    } else {
        $('.hasJob').hide();
        $('.noJob').show();
    }
}

Funbit.Ets.Telemetry.Dashboard.prototype.initialize = function (skinConfig) {
    //
    // skinConfig - a copy of the skin configuration from config.json
    //
    // this function is called before everything else, 
    // so you may perform any DOM or resource initializations here
    
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
    
    // Process currency code
    $('.currencyCode').text(skinConfig.currencyCode);
    
    // Process language JSON
    $.getJSON('skins/mobile-route-advisor/language/'+skinConfig.language, function(json) {
        $.each(json, function(key, value) {
            updateLanguage(key, value);
        });
    });
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
        minutes = $('.lXMinutes').text().replace('{0}', 0);
        return minutes;
    }
    
    if (hours == 1) {
        hours = $('.lXHour').text().replace('{0}', hours);
    } else if (hours == 0) {
        hours = '';
    } else {
        hours = $('.lXHours').text().replace('{0}', hours);
    }
    
    if (minutes == 1) {
        minutes = $('.lXMinute').text().replace('{0}', minutes);
    } else {
        minutes = $('.lXMinutes').text().replace('{0}', minutes); 
    }
    return hours + ' ' + minutes;
}
    
function getTime(gameTime, timeUnits, isHeader) {
    var currentTime = new Date(gameTime);
    var currentPeriod = timeUnits === 12 ? ' AM' : '';
    var currentHours = currentTime.getUTCHours();
    var currentMinutes = currentTime.getUTCMinutes();
    var formattedMinutes = currentMinutes < 10 ? '0'+currentMinutes : currentMinutes;
    var currentDay = '';
    
    switch (currentTime.getUTCDay()) {
        case 0:
            currentDay = "Sunday";
            break;
        case 1:
            currentDay = "Monday";
            break;
        case 2:
            currentDay = "Tuesday";
            break;
        case 3:
            currentDay = "Wednesday";
            break;
        case 4:
            currentDay = "Thursday";
            break;
        case 5:
            currentDay = "Friday";
            break;
        case 6:
            currentDay = "Saturday";
            break;
    }
    
    if (currentHours > 12 && timeUnits === 12) {
        currentHours -= 12;
        currentPeriod = ' PM';
    }
    var formattedHours = currentHours < 10 ? '0'+currentHours : currentHours;
    
    if (currentDay == 'Wednesday' && isHeader) {
        $('#headerTime').css('font-size','.9em');
    } else {
        $('#headerTime').css('font-size','1em');
    }
    
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
    var currencyCode = $('.currencyCode').text();
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

function getDamageFillForTruck(damagePercentage) {
    // damagePercentage: The value returned from getDamagePercentage
	damagePercentage = Math.floor(damagePercentage);
    if (damagePercentage < 0.5) {
        return 80;
    }
    if (damagePercentage > 99.4) {
        return 25;
    }
    
    // This is the closest linear fit found from 3 eyeballed data points.
    return (475/6) - (.55 * damagePercentage);
}

function getDamageFillForTrailer(damagePercentage) {
    // damagePercentage: the same as data.wearTrailer
	damagePercentage = Math.floor(damagePercentage);
    if (damagePercentage < .5) {
        return 65;
    }
    if (damagePercentage > 99.4) {
        return 34;
    }
    
    // This is the closest linear fit found from 3 eyeballed data points.
    return (389/6) - (0.31 * damagePercentage);
}

function showTab(tabName) {
    // Hide all tabs (map, cargo, damage, about)
    $('#map').hide();
    $('#cargo').hide();
    $('#damage').hide();
    $('#about').hide();
    
    // Remove the "_footerSelected" class from all items.
    $('#mapFooter').removeClass('_footerSelected');
    $('#cargoFooter').removeClass('_footerSelected');
    $('#damageFooter').removeClass('_footerSelected');
    $('#aboutFooter').removeClass('_footerSelected');
    
    // Show the ID requested
    $('#' + tabName).show();
    $('#' + tabName + 'Footer').addClass('_footerSelected');
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