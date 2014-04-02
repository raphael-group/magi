'use strict';

angular.module('cgat.directives', []).
  // Render markdown in the HTML page
  directive("markdown", function ($compile, $http) {
    return {
        restrict: 'E',
        require: 'data',
        scope: { value: "=data" },
        template: '<div ng-bind-html-unsafe="value | markdown"></div>'
    };
  }).
  filter('markdown', function () {
   var converter = new Showdown.converter();
   return function (value) {
    return converter.makeHtml(value || '');
   };
   }).
  directive("subnetwork", function(styling){
    return {
      restrict: 'E',
      scope: { data: '=' },
      link: function(scope, elm, attrs){
      // set up initial svg object
      var vis = d3.select(elm[0])
        .append("div")
        .attr("id", "subnetwork")

      scope.$watch('data', function(data){
        // Do nothing if the object is the same or hasn't updated
        if (!data) return;

        // Clear the elements inside of the directive
        vis.selectAll('*').remove();

        // Load the style service
        var styles = styling.data();

        styles.subnetwork.width = $(elm[0]).parent().width();

        // Merge the global and subnetwork styles into one
        var style = styles.subnetwork;
        for (var attrname in styles.global)
            style[attrname] = styles.global[attrname];

        // Add the subnetwork SVG
        vis.datum(data)
          .call(
            subnetwork({style: style})
                .addNetworkLegend()
                .addGradientLegend()
          );
      })
      }
    }
  }).
  directive("transcript", function(styling){
    return {
      restrict: 'E',
      scope: { data: '=', db: '='}, // Hsin-Ta added for domain selection
      link: function(scope, elm, attrs){
      // set up initial svg object
      var vis = d3.select(elm[0])
        .append("div")
        .attr("class", "transcript-svg");

      // Domain selection
      scope.db = 'PFAM';

      scope.$watch('data', function(data){
        // Do nothing if the object is the same or hasn't updated
        if (!data) return;

        // Clear the elements inside of the directive
        vis.selectAll('*').remove();

        // We extract the width of the parent's parent, because the transcript plot's
        // are hidden by default
        var styles = styling.data();
        styles.transcript_plot.width = $(elm[0]).parent().parent().width();

        // Merge the global and transcript plot styles into one
        var style = styles.transcript_plot;
        for (var attrname in styles.global)
            style[attrname] = styles.global[attrname];

        // Add any dataset specific colors
        style.colorSchemes =  { sampleType: {} };
        if (scope.datasetColors){
          Object.keys(scope.datasetColors).forEach(function(name){
            style.global.colorSchemes.sampleType[name] = scope.datasetColors[name];
          });
        }

        // Draw the transcript with a legend
        vis.datum(data)
          .call(
            transcript_plot({ style: style })
              .addLegend()
          );
      });
      // Domain db selection
      scope.$watch('db', function(db){
        // Do nothing if the object is the same or hasn't updated
        if (!db) return;

        // Clear the elements inside of the directive
        vis.selectAll('*').remove();

        // We extract the width of the parent's parent, because the transcript plot's
        // are hidden by default
        var styles = styling.data();
        styles.transcript_plot.width = $(elm[0]).parent().parent().width();

        // Merge the global and transcript plot styles into one
        var style = styles.transcript_plot;
        for (var attrname in styles.global)
            style[attrname] = styles.global[attrname];

        // Add any dataset specific colors
        style.colorSchemes =  { sampleType: {} };
        if (scope.datasetColors){
          Object.keys(scope.datasetColors).forEach(function(name){
            style.global.colorSchemes.sampleType[name] = scope.datasetColors[name];
          });
        }

        // Draw the transcript with a legend
        vis.datum(scope.data)
          .call(
            transcript_plot({ style: style, domainDB: db })
              .addLegend()
          );

      });

      }
    }
  }).
  // Hsin-Ta added for CNA browser
  directive("cnabrowser", function(styling){
    return {
      restrict: 'E',
      scope: { data: '=', sty: '='},
      link: function(scope, elm, attrs){
      // set up initial svg object
      var vis = d3.select(elm[0])
        .append("div")
        .attr("id", "cnas-svg")

      scope.$watch('data', function(data){
        // Do nothing if the object is the same or hasn't updated
        if (!data) return;

        // Clear the elements inside of the directive
        vis.selectAll('*').remove();
        
        // Extract the global styling info
        var styles = styling.data();
        styles.cnabrowser.width = $(elm[0]).parent().width();

        // Merge the global and cna browser styles into one
        var style = styles.cnabrowser;
        for (var attrname in styles.global)
          style[attrname] = styles.global[attrname];

        // Add any dataset specific colors
        style.colorSchemes =  { sampleType: {} };
        if (scope.datasetColors){
          Object.keys(scope.datasetColors).forEach(function(name){
            style.colorSchemes.sampleType[name] = scope.datasetColors[name];
          });
        }

        // Create the cnabrowser
        vis.datum(data)
          .call(
            window.cna_browser({style: style})
          );

      })
      }
    }
  }).
  directive("mutationmatrix", function(styling){
    return {
      restrict: 'E',
      scope: { data: '=' },
      link: function(scope, elm, attrs){
        // set up initial svg object
        var vis = d3.select(elm[0])
          .append("div")
          .attr("id", "mutation-matrix");

        scope.$watch('data', function(data){
          // Do nothing if the object is the same or hasn't updated
          if (!data) return;

          // Clear the elements inside of the directive
          vis.selectAll('*').remove();

          // Use our D3 cancer genomics library to draw the subnetwork
          var styles = styling.data();
          styles.mutation_matrix.width = $(elm[0]).parent().width();

          // Merge the global and mutation matrix styles into one
          var style = styles.mutation_matrix;
          for (var attrname in styles.global)
              style[attrname] = styles.global[attrname];

          // Add any dataset specific colors
          style.colorSchemes =  { sampleType: {} };
          if (scope.datasetColors){
            Object.keys(scope.datasetColors).forEach(function(name){
              style.colorSchemes.sampleType[name] = scope.datasetColors[name];
            });
          }

          // Create the mutation matrix
          vis.datum(data)
            .call(
              window.mutation_matrix({style: style})
              .addCoverage()
              .addLegend()
              .addSortingMenu()
            );

      })
      }
    }
  });
