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
    data.truckSpeedRounded = Math.abs(Math.floor(data.truckSpeed));
    // convert kilometers per hour to miles per hour (just an example)
    data.truckSpeedMph = data.truckSpeed * 0.621371;
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
    data.digitGroupedReward = getDigitGroupedReward(data.jobIncome);
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
}

function getDigitGroupedReward(income) {
    
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