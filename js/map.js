// All of this should be executed after the DOM is ready and the entire skin has been loaded.

// Image size used in the map.
var MAX_X = 19200;
var MAX_Y = 18688;
// How the image was extracted from the game:
// http://forum.scssoft.com/viewtopic.php?p=405122#p405122

// Based on http://forum.scssoft.com/viewtopic.php?f=41&t=186779
function calculatePixelCoordinate(x, y, pointsPerPixel, x0, y0) {
    return [
        (x / pointsPerPixel + x0) | 0,
        (y / pointsPerPixel + y0) | 0
    ];
}
function calculatePixelCoordinateEu(x, y) {
    return calculatePixelCoordinate(x, y, 7.278, 11367, 9962);
}
function calculatePixelCoordinateUk(x, y) {
    return calculatePixelCoordinate(x, y, 9.69522, 10226, 9826);
}

function game_coord_to_pixels(x, y) {
    // http://forum.scssoft.com/viewtopic.php?p=402836#p402836
    var r = null;
    if (x < -31812 && y < -5618) {
        r = calculatePixelCoordinateUk(x, y);
    } else {
        r = calculatePixelCoordinateEu(x, y);
    }

    // Inverting Y axis, because of OpenLayers coordinates.
    r[1] = MAX_Y - r[1];
    return r;
}

function buildMap(target_element_id){
    var projection = new ol.proj.Projection({
        // Any name here. I chose "Funbit" because we are using funbit's image coordinates.
        code: 'Funbit',
        units: 'pixels',
        extent: [0, 0, MAX_X, MAX_Y],
        worldExtent: [0, 0, MAX_X, MAX_Y]
    });
    ol.proj.addProjection(projection);

    // Adding a marker for the player position/rotation.
    playerIcon = new ol.style.Icon({
        anchor: [0.5, 39],
        anchorXUnits: 'fraction',
        anchorYUnits: 'pixels',
        rotateWithView: true,
        src: gPathPrefix + '/img/player.png'
    });
    var playerIconStyle = new ol.style.Style({
        image: playerIcon
    });
    playerFeature = new ol.Feature({
        geometry: new ol.geom.Point([MAX_X / 2, MAX_Y / 2])
    });
    // For some reason, we cannot pass the style in the constructor.
    playerFeature.setStyle(playerIconStyle);

    // Adding a layer for features overlaid on the map.
    var featureSource = new ol.source.Vector({
        features: [playerFeature],
        wrapX: false
    });
    vectorLayer = new ol.layer.Vector({
        source: featureSource
    });

    // Configuring the custom map tiles.
    var custom_tilegrid = new ol.tilegrid.TileGrid({
        extent: [0, 0, MAX_X, MAX_Y],
        minZoom: 0,
        origin: [0, MAX_Y],
        tileSize: [256, 256],
        resolutions: (function(){
            var r = [];
            for (var z = 0; z <= 7; ++z) {
                r[z] = Math.pow(2, 7 - z);
            }
            return r;
        })()
    });

    // Creating a custom button.
    var rotate_control = new ol.control.Control({
        element: document.getElementById('rotate-button-div')
    });

    // Creating the map.
    map = new ol.Map({
        target: target_element_id,
        controls: [
            // new ol.control.ZoomSlider(),
            // new ol.control.OverviewMap(),
            // new ol.control.Rotate(),
            // new ol.control.MousePosition(),  // DEBUG
            new ol.control.Zoom(),
            rotate_control
            // TODO: Set 'tipLabel' on both zoom and rotate controls to language-specific translations.
        ],
        interactions: ol.interaction.defaults().extend([
            // Rotating by using two fingers is implemented in PinchRotate(), which is enabled by default.
            // With DragRotateAndZoom(), it is possible to use Shift+mouse-drag to rotate the map.
            // Without it, Shift+mouse-drag creates a rectangle to zoom to an area.
            new ol.interaction.DragRotateAndZoom()
        ]),
        layers: [
            new ol.layer.Tile({
                extent: [0, 0, MAX_X, MAX_Y],
                source: new ol.source.XYZ({
                    projection: projection,
                    url: gPathPrefix + '/tiles/{z}/{y}/{x}.png',
                    tileSize: [256, 256],
                    // Using createXYZ() makes the vector layer (with the features) unaligned.
                    // It also tries loading non-existent tiles.
                    //
                    // Using custom_tilegrid causes rescaling of all image tiles before drawing
                    // (i.e. no image will be rendered at 1:1 pixels), But fixes all other issues.
                    tileGrid: custom_tilegrid,
                    // tileGrid: ol.tilegrid.createXYZ({
                    //     extent: [0, 0, MAX_X, MAX_Y],
                    //     minZoom: 0,
                    //     maxZoom: 7,
                    //     tileSize: [256, 256]
                    // }),
                    wrapX: false,
                    minZoom: 4,
                    maxZoom: 7
                })
            }),
            // Debug layer below.
            // new ol.layer.Tile({
            //     extent: [0, 0, MAX_X, MAX_Y],
            //     source: new ol.source.TileDebug({
            //         projection: projection,
            //         tileGrid: custom_tilegrid,
            //         // tileGrid: ol.tilegrid.createXYZ({
            //         //  extent: [0, 0, MAX_X, MAX_Y],
            //         //  minZoom: 0,
            //         //  maxZoom: 7,
            //         //  tileSize: [256, 256]
            //         // }),
            //         wrapX: false
            //     })
            // }),
            vectorLayer
        ],
        view: new ol.View({
            projection: projection,
            extent: [0, 0, MAX_X, MAX_Y],
            //center: ol.proj.transform([37.41, 8.82], 'EPSG:4326', 'EPSG:3857'),
            center: [MAX_X/2, MAX_Y/2],
            minZoom: 0,
            maxZoom: 9,
            zoom: 7
        })
    });

    // Adding behavior to the custom button.
    var rotate_button = document.getElementById('rotate-button');
    var rotate_arrow = rotate_button.firstElementChild;
    map.getView().on('change:rotation', function(ev) {
        rotate_arrow.style.transform = 'rotate(' + ev.target.getRotation() + 'rad)';
    });
    rotate_button.addEventListener('click', function(ev) {
        if (behavior_center_on_player) {
            behavior_rotate_with_player = ! behavior_rotate_with_player;
        } else {
            behavior_center_on_player = true;
        }
    });

    // Detecting when the user interacts with the map.
    // https://stackoverflow.com/q/32868671/
    map.getView().on(['change:center', 'change:rotation'], function(ev) {
        if (ignore_view_change_events) {
            return;
        }

        // The user has moved or rotated the map.
        behavior_center_on_player = false;
        // Not needed:
        //behavior_rotate_with_player = false;
    });

    // Debugging.
    // map.on('singleclick', function(evt) {
    //     var coordinate = evt.coordinate;
    //     console.log(coordinate);
    // });
    // map.getView().on('change:center', function(ev) {
    //   console.log(ev);
    // });
    // map.getView().on('change:rotation', function(ev) {
    //   console.log(ev);
    // });
}

// Global vars.
var map;
var vectorLayer;
var playerFeature;
var playerIcon;
var behavior_center_on_player = true;
var behavior_rotate_with_player = true;
var ignore_view_change_events = false;

function updatePlayerPositionAndRotation(lon, lat, rot, speed) {
    var map_coords = game_coord_to_pixels(lon, lat);
    var rad = rot * Math.PI * 2;

    playerFeature.getGeometry().setCoordinates(map_coords);
    playerIcon.setRotation(-rad);

    ignore_view_change_events = true;
    if (behavior_center_on_player) {

        if (behavior_rotate_with_player) {
            var height = map.getSize()[1];
            var max_ahead_amount = height / 3.0 * map.getView().getResolution();

            var amount_ahead = speed * 0.25;
            amount_ahead = Math.max(-max_ahead_amount, Math.min(amount_ahead, max_ahead_amount));

            var ahead_coords = [
                map_coords[0] + Math.sin(-rad) * amount_ahead,
                map_coords[1] + Math.cos(-rad) * amount_ahead
            ];
            map.getView().setCenter(ahead_coords);
            map.getView().setRotation(rad);
        } else {
            map.getView().setCenter(map_coords);
            map.getView().setRotation(0);
        }
    }
    ignore_view_change_events = false;
}
