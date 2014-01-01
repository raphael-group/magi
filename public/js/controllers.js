'use strict';

/* Controllers */
angular.module('gd3.controllers', []).
  controller('AppCtrl', function($scope, $location, styling){
        $scope.getClass = function(path) {
            var loc  = $location.path();
            if ((loc == "/") && (path == "/")){
                return "active";
            } else if ((path != "/") && (loc.substr(0, path.length) == path)){
                return "active";
            } else{
                return "";
            }
        }
  }).controller('ViewCtrl', function($scope, $http, $routeParams){
    // Parse query params
    var genes = $routeParams.genes
    , dbs = $routeParams.datasets
    , query = "genes=" + genes + "&datasets=" + dbs;

    $http.get('/data/bundle?' + query).success(function(json) {
      // Oncoprint data
      $scope.oncoprint_data  = json.oncoprint_data;

      // Subnetwork data
      $scope.subnetwork_data = json.subnetwork_data;
      
      // Lolliplot data
      $scope.gene_transcripts = json.transcript_data;
      $scope.numTranscripts = function(transcripts){ return Object.keys(transcripts).length; };        

    });
  });