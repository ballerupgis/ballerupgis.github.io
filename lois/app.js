//Global map variable for leaflet map
var map;

var model = {
    geometry: {},
    getReport: function(geom) {
        var settings = {
            "async": true,
            "crossDomain": true,
            "url": "http://bal0-lois:8080/api/datapakkeresultat?procedureID=3&procedureParametre=%7B%22UdStraekID%22%3A%221%22%2C%22LS2RapportID%22%3A%223%22%7D",
            "method": "POST",
            "headers": {
                "content-type": "application/json",
                "cache-control": "no-cache",
                "authorization": "NTLM TlRMTVNTUAADAAAAGAAYAFAAAAAYABgAaAAAAAAAAABIAAAACAAIAEgAAAAAAAAAUAAAAAAAAACAAAAABYKIogUBKAoAAAAPYQBuAGQAYgB1Iu3pNuufEgAAAAAAAAAAAAAAAAAAAAA3q2ZAEZCSBl56fo7remeEUNvjJ8L+5YU="                
            },
            "processData": false,
            "data": JSON.stringify(geom)
        }

        $.ajax(settings).done(function(response) {
            console.log(response);
        }).fail(function(e) {
          console.log('Response error ' + e.responseText)
        });
    }
}

var controller = {
    init: function() {
        view.init();
    }
}

var view = {
    init: function() {
        this.renderMap();
        this.addDrawtool();
        this.showReport();
    },
    renderMap: function() {
        // create a map in the "map" div, set the view to a given place and zoom
        map = L.map('map').setView([55, 12], 8);

        // add an OpenStreetMap tile layer
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    },

    addDrawtool: function() {
        // Initialize the FeatureGroup to store editable layers
        var drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        // Initialize the draw control and pass it the FeatureGroup of editable layers
        var drawControl = new L.Control.Draw({
            draw: {
                polygon: true,
                marker: false,
                polyline: false,
                rectangle: false,
                circle: false,
                circlemarker: false
            },
            edit: {
                featureGroup: drawnItems
            }
        });
        map.addControl(drawControl);

        map.on('draw:created', function(e) {
            var type = e.layerType,
                layer = e.layer,
                crs = {
                    "type": "name", 
                    "properties": {
                        "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                    }
                };

            // get geojson and store in model
            var shape = layer.toGeoJSON()
            model.geometry = shape;
            // add crs def to geojson
            model.geometry.crs = crs
            

            drawnItems.addLayer(layer);
        });

        map.on('draw:edited', function() {
            // Update db to save latest changes.
        });

        map.on('draw:deleted', function() {
            // Update db to save latest changes.
            model.geometry = {}
        });
    },
    showReport: function() {
        function buildReport() {
            $.each(data.Result, function(index, el) {
                var i = index + 1;
                $('#report').append('<h1>' + el.SheetName + '</h1>')
                $('#report').append('<table class="table table-hover"><tbody id="t-data' + i + '"></tbody></table>')

                $.each(el.Result.ReportGeoLS2['Table' + i], function(key, val) {
                    if (String(key).substring(0, 3) == 'Pct') {
                        $('#t-data' + i).append('<tr><td>' + key + '</td><td><div class="progress"><div class="progress-bar" role="progressbar" style="width: ' + val + '%;" aria-valuenow="' + val + '" aria-valuemin="0" aria-valuemax="100">' + val + '%</div></div></td></tr>');
                    } else {
                        $('#t-data' + i).append('<tr><td>' + key + '</td><td>' + val + '</td></tr>');
                    }
                });
            });
        }

        //eventbinding
        $('#getreport').click(function() {
            // check if polygon is drawed
            if ($.isEmptyObject(model.geometry)) {
                alert('Du mangler at tegne et område på kortet');
            } else {
                console.log(model.geometry);
                model.getReport(model.geometry)
                buildReport();
            }
        });
    }
}

//https://stackoverflow.com/a/24019108
