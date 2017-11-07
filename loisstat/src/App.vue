<template>
  <div id="app">
    <nav class="navbar navbar-light bg-faded">
      <h1 class="navbar-brand mb-0">LOIS STAT API</h1>
    </nav>
    <div class="container">
      <div id="mapid"></div>
      <button  type="button" class="btn btn-secondary btn-lg btn-block" v-on:click="createReport(geometry)">
        <span v-show="!loading">HENT RAPPORT</span>
        <i class="fa fa-refresh fa-spin" style="font-size:24px" v-show="loading"></i>
      </button>
      <div class="row"></div>
        <div id="report">
          <div class="jumbotron" v-bind:id="item.SheetName" v-for="item in report">
            <h1>{{item.SheetName.split('_').join(' - ')}}</h1>
            <table class="table table-striped table-sm">
              <thead>
                <tr>
                  <td><strong>VARIABEL</strong></td>
                  <td><strong>VÆRDI</strong></td>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(val, key) in item.Table[0]">
                  <td v-if="key.split('_')[0] == 'Pct'">{{key.split('_').slice(1, key.split('_').length).join(' ')}} (%)</td>
                  <td v-else-if="key.split('_')[0] == 'Antal'">{{key.split('_').slice(1, key.split('_').length).join(' ')}} (antal)</td>
                  <td v-else>{{key}}</td>
                  <td v-if="key.split('_')[0] == 'Pct'">
                    <div class="progress" v-if="key.split('_')[key.split('_').length-1] == 'Niveau'">
                      <div class="progress-bar bg-success" role="progressbar" v-bind:style="{width: val + '%'}" v-bind:aria-valuenow="val" aria-valuemin="0" aria-valuemax="100">{{val}} %</div>
                    </div>
                    <div class="progress" v-if="key.split('_')[key.split('_').length-1] == 'Kom'">
                      <div class="progress-bar bg-warning" role="progressbar" v-bind:style="{width: val + '%'}" v-bind:aria-valuenow="val" aria-valuemin="0" aria-valuemax="100">{{val}} %</div>
                    </div>
                  </td>
                  <td v-else>{{val}}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import L from 'leaflet'
import Draw from 'leaflet-draw'

export default {
  name: 'app',
  data () {
    return {
      report: {},
      data: {},
      geometry: {},
      map: {},
      loading: false
    }
  },
  methods: {
    getData: function (geom) {
      this.loading = true
      let self = this;
      axios.post('http://bal0-lois:8080/api/datapakkeresultat?procedureID=3&procedureParametre=%7B%22UdStraekID%22%3A%221%22%2C%22LS2RapportID%22%3A%223%22%7D', geom)
        .then(function (response) {
          self.loading = false
          self.report = response.data.Result
          console.log(self.report)
          self.data = self.beutifyResponse(self.report)
        })
        .catch(function (error) {
          self.loading = false
          alert('Kunne ikke få fat i data')
          console.info(error);
        });
    },
    beutifyResponse: function (res) {
      let arr = []
      res.forEach(function(item) {
        //datamodel
        let obj = {
          sheetname: '',
          variables: []
        };
        obj.sheetname = item.SheetName
        let table = item.Table[0];
        //console.log(table)
        for(var key in table) {
          let variables = {
            title: '',
            values: {}
          };
          //console.log(key)
          let titleArr = key.split('_');

          if(variables.title in obj.variables) {
            console.log('findes')
          }
          //extract title from key
          variables.title = titleArr.slice(1, titleArr.length - 1).join(' ');             
          //count or pct keyword 
          let valuetype = titleArr[0] + titleArr[titleArr.length-1];
          switch (valuetype) {
            case 'AntalNiveau':
              variables.values.AntalNiveau = table[key];
              break;
            case 'PctNiveau':
              variables.values.PctNiveau = table[key];
              break;
            case 'AntalKom':
              variables.values.AntalKom = table[key];
              break;
            case 'PctKom':
              variables.values.PctKom = table[key];
              break;              
            default:
              break;
          }
          obj.variables.push(variables)
          //console.log(variables)
        }
        arr.push(obj);
      });
      return arr;
    },
    createReport: function (geom) {
      //Check if polygon is drawn
      if (Object.keys(this.geometry).length === 0 && this.geometry.constructor === Object) {
        alert('Du mangler at tegne et område på kortet')
      } else {
        this.getData(geom)
      }
    }
  },
  mounted: function () {
    //wait for document ready
    this.$nextTick(function () {

      // baselayers
      const Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
      });
      const Stamen_TonerLite = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.{ext}', {
        attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 20,
        ext: 'png'
      });
      
      // create a map in the "map" div, set the view to a given place and zoom
      this.map = L.map('mapid', {
        center: [55.731267,12.363396],
        zoom: 13,
        layers: [Stamen_TonerLite]
      });

      const baseMaps = {
          "Gråskala": Stamen_TonerLite,
          "Luftfoto": Esri_WorldImagery
      };

      L.control.layers(baseMaps).addTo(this.map);

      // Initialize the FeatureGroup to store editable layers
      let drawnItems = new L.FeatureGroup();
      this.map.addLayer(drawnItems);

      // Initialize the draw control and pass it the FeatureGroup of editable layers
      let drawControl = new L.Control.Draw({
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
      this.map.addControl(drawControl);

      let self = this
      this.map.on('draw:created', function(e) {
        let type = e.layerType,
            layer = e.layer,
            crs = {
                "type": "name", 
                "properties": {
                    "name": "urn:ogc:def:crs:OGC:1.3:CRS84"
                }
            };

        // get geojson and store in model
        let shape = layer.toGeoJSON()
        self.geometry = shape;
        // add crs def to geojson
        self.geometry.crs = crs;
        
        drawnItems.addLayer(layer);
      });

      this.map.on('draw:edited', function() {
        //STORE CHANGES IN DATA PROP
      });

      this.map.on('draw:deleted', function() {
          // Update db to save latest changes.
          self.geometry = {};
      });

    })
  }
}
</script>

<style>
  @import "../node_modules/leaflet/dist/leaflet.css";
  @import "../node_modules/leaflet-draw/dist/leaflet.draw.css";
  @import "../node_modules/font-awesome/css/font-awesome.css";

  html, body, .btn {
    font-family: 'Quicksand', sans-serif;
  }


  #mapid {
    height: 500px;
  }

  #report {
    padding-top: 30px;
  }

  .jumbotron {
    background: #f7f7f7;
  }

  .navbar-brand { 
    margin-left: auto; 
    margin-right: auto; 
  }

</style>
