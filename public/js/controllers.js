'use strict';

/* Controllers */
angular.module('cgat.controllers', []).
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
  }).controller('ViewCtrl', function($scope, $http, $routeParams, $window){
    // Parse query params
    var genes = $routeParams.genes
    , dbs = $routeParams.datasets
    , query = "genes=" + genes + "&datasets=" + dbs;

    // Make sure the query includes genes and dbs
    var noGenes = genes == null || genes == "",
        noDBs = dbs == null || dbs == "";

    if (noGenes || noDBs) $window.location.href = "/query-error";

    // If the query includes both genes and dbs, retrieve the JSON data
    $http.get('/data/bundle?' + query).success(function(json) {
      // Oncoprint data
      $scope.oncoprint_data  = json.oncoprint_data;

      // Subnetwork data
      $scope.subnetwork_data = json.subnetwork_data;
      
      // Lolliplot data
      $scope.gene_transcripts = json.transcript_data;
      $scope.numTranscripts = function(transcripts){ return Object.keys(transcripts).length; };

      // Check if there is any data
      var noMutations = Object.keys(json.oncoprint_data.sample2ty).length == 0,
          noEdges = json.subnetwork_data.edges.length == 0;
      $scope.noData = noMutations && noEdges;
      $scope.genes = genes.split("-").join(", ");
      $scope.datasets = dbs.split("-").join(", ");
    });
  });