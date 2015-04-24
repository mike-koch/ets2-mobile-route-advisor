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
    data.truckSpeedRounded = Math.abs(data.truckSpeed > 0
        ? Math.floor(data.truckSpeed)
        : Math.round(data.truckSpeed));
    // convert kilometers per hour to miles per hour (just an example)
    data.truckSpeedMph = data.truckSpeed * 0.621371;
    data.truckSpeedMphRounded = Math.abs(Math.floor(data.truckSpeedMph));
    // format odometer data as: 00000.0
    data.truckOdometer = (Math.round(data.truckOdometer * 10) / 10).toFixed(1);
    // convert gear to readable format
    data.gear = data.gear > 0 ? 'D' + data.gear : (data.gear < 0 ? 'R' : 'N');
    // convert rpm to rpm * 100
    data.engineRpm = data.engineRpm / 100;
    data.currentFuelPercentage = (data.fuel / data.fuelCapacity) * 100;
    
    // scsTruckDamage is the value SCS uses in the route advisor
    data.scsTruckDamage = getDamagePercentage(data);
    data.scsTruckDamageRounded = Math.floor(data.scsTruckDamage);
    data.wearTrailerRounded = Math.floor(data.wearTrailer * 100);
    
    data.gameTime12h = getTimeInTwelveHourFormat(data.gameTime);
    data.trailerMassTons = data.hasJob ? ((data.trailerMass / 1000.0) + ' t') : '';
    data.trailerMassKg = data.hasJob ? data.trailerMass + ' kg' : '';
    data.jobIncome = getJobIncome(data.jobIncome);
    
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
    $('#trailerDamageIcon').css('height', getDamageFillForTrailer(data.wearTrailer * 100) + '%');
}

Funbit.Ets.Telemetry.Dashboard.prototype.initialize = function (skinConfig) {
    //
    // skinConfig - a copy of the skin configuration from config.json
    //
    // this function is called before everything else, 
    // so you may perform any DOM or resource initializations here
    
    // Process Speed Units
    var speedUnits = skinConfig.speedUnits;
    if (speedUnits === 'kmh') {
        $('#speedUnits').text('km/h');
        $('.truckSpeedRoundedKmhMph').addClass('truckSpeedRounded').removeClass('truckSpeedRoundedKmhMph');
    } else if (speedUnits === 'mph') {
        $('#speedUnits').text('mph');
        $('.truckSpeedRoundedKmhMph').addClass('truckSpeedMphRounded').removeClass('truckSpeedRoundedKmhMph');
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
        $('.gameTime').addClass('gameTime12h').removeClass('gameTime');
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
    
function getTimeInTwelveHourFormat(gameTime) {
    var currentTime = new Date(gameTime);
    var currentPeriod = ' AM';
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
    
    if (currentHours > 12) {
        currentHours -= 12;
        currentPeriod = ' PM';
    }
    var formattedHours = currentHours < 10 ? '0'+currentHours : currentHours;
    
    if (currentDay == 'Wednesday') {
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
    return Math.max(data.wearEngine, 
                    data.wearTransmission, 
                    data.wearCabin, 
                    data.wearChassis, 
                    data.wearWheels) * 100;
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