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

    truckMarker = new ol.Feature({});

    var featureSource = new ol.source.Vector({
        features: [truckMarker],
        wrapX: false
    });

    var iconStyle = new ol.style.Style({
        image: new ol.style.Icon(({
            anchor: [0.5, 46],
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            opacity: 1,
            src: gPathPrefix + '/img/marker.png'
        }))
    });

    vectorLayer = new ol.layer.Vector({
        source: featureSource,
        style: iconStyle
    });

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

    map = new ol.Map({
        target: target_element_id,
        controls: [
            // new ol.control.ZoomSlider(),
            // new ol.control.OverviewMap(),
            // new ol.control.MousePosition(),  // DEBUG
            new ol.control.Zoom(),
            new ol.control.Rotate({
                label: '\u2B06'
            })
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

var map;
var vectorLayer;
var truckMarker;

function updateMarker(x, y) {
    // Debugging.
    var pixels = game_coord_to_pixels(x, y);
    truckMarker.setGeometry(new ol.geom.Point(pixels));
}

function updateCenter(x, y, heading) {
    var pixels = game_coord_to_pixels(x, y);
    var view = map.getView();
    // TODO: Center the view somewhere ahead of the truck marker, maybe based on the speed.
    // Maybe even zoom in/out based on speed (but I don't think it helps, the map is not high-res enough).
    view.setCenter(pixels);
}

function updateRotation(heading) {
    // document.querySelector('.lMobileRouteAdvisor').textContent = heading.toFixed(8);  // DEBUG
    var view = map.getView();
    view.setRotation(heading * Math.PI * 2);
}
