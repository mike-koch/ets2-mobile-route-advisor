
    var MAX_X = 19200;
    var MAX_Y = 18688;

// All of this should be executed after the DOM is ready and the entire skin has been loaded.
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
    // I suppose either x,y are both positive, or they are both negative.
    var r = null;
    if (x < 0) {
        r = calculatePixelCoordinateUk(x, y);
    } else {
        r = calculatePixelCoordinateEu(x, y);
    }

    // Inverting Y axis.
    r[1] = MAX_Y - r[1];
    return r;
}

function buildMap(){
    var projection = new ol.proj.Projection({
        // Any name here. I chose "Funbit" because we are using funbit's image coordinates.
        code: 'Funbit',
        units: 'pixels',
        extent: [0, 0, MAX_X, MAX_Y],
        worldExtent: [0, 0, MAX_X, MAX_Y]
    });
    ol.proj.addProjection(projection);

    // The "name" attribute is unused.
    var markers = [
        new ol.Feature({
            geometry: new ol.geom.Point([0, 0]),
            name: 'Origin',
        }),
        new ol.Feature({
            geometry: new ol.geom.Point([256, 256]),
            name: 'First Tile',
        }),
        new ol.Feature({
            geometry: new ol.geom.Point([256, MAX_Y - 256]),
            name: 'Other First Tile',
        }),
        new ol.Feature({
            geometry: new ol.geom.Point([MAX_X, MAX_Y]),
            name: 'End',
        }),
        new ol.Feature({
            geometry: new ol.geom.Point(game_coord_to_pixels(41744.53, 17305.5156)),
            name: 'Debrecen',
        }),
        new ol.Feature({
            geometry: new ol.geom.Point(game_coord_to_pixels(-49770.64, -48417.68)),
            name: 'Glasgow',
        }),
    ];

    var feature_source = new ol.source.Vector({
        features: markers,
        wrapX: false
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

    var map = new ol.Map({
        target: 'rendered-map',
        interactions: ol.interaction.defaults().extend([
            new ol.interaction.DragRotateAndZoom()
        ]),
        layers: [
            new ol.layer.Tile({
                extent: [0, 0, MAX_X, MAX_Y],
                source: new ol.source.XYZ({
                    projection: projection,
                    url: 'skins/mobile-route-advisor/tiles/{z}/{y}/{x}.png',
                    tileSize: [256, 256],
                    // Using createXYZ() makes the vector layer (with the features) unaligned.
                    // It also tries loading non-existent tiles.
                    //
                    // Using custom_tilegrid causes rescaling of all image tiles before drawing
                    // (i.e. no image will be rendered at 1:1 pixels), But fixes all other issues.
                    tileGrid: custom_tilegrid,
                    // tileGrid: ol.tilegrid.createXYZ({
                    // 	extent: [0, 0, MAX_X, MAX_Y],
                    // 	minZoom: 0,
                    // 	maxZoom: 7,
                    // 	tileSize: [256, 256]
                    // }),
                    wrapX: false,
                    minZoom: 4,
                    maxZoom: 7
                })
            }),
            // Debug layer below.
            // new ol.layer.Tile({
            // 	extent: [0, 0, MAX_X, MAX_Y],
            // 	source: new ol.source.TileDebug({
            // 		projection: projection,
            // 		tileGrid: custom_tilegrid,
            // 		// tileGrid: ol.tilegrid.createXYZ({
            // 		// 	extent: [0, 0, MAX_X, MAX_Y],
            // 		// 	minZoom: 0,
            // 		// 	maxZoom: 7,
            // 		// 	tileSize: [256, 256]
            // 		// }),
            // 		wrapX: false
            // 	})
            // }),
            new ol.layer.Vector({
                source: feature_source
                //style: ...
            })
        ],
        view: new ol.View({
            projection: projection,
            extent: [0, 0, MAX_X, MAX_Y],
            //center: ol.proj.transform([37.41, 8.82], 'EPSG:4326', 'EPSG:3857'),
            center: [MAX_X/2, MAX_Y/2],
            minZoom: 0,
            maxZoom: 7,
            zoom: 2
        })
    });

    map.on('singleclick', function(evt) {
        var coordinate = evt.coordinate;
        console.log(coordinate);
    });
}