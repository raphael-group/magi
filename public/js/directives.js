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
      scope: { data: '=', db: '=', datasetcolors: '='},
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
        if (scope.datasetcolors){
          Object.keys(scope.datasetcolors).forEach(function(name){
            style.colorSchemes.sampleType[name] = scope.datasetcolors[name];
          });
        }

        // Draw the transcript with a legend
        vis.datum(data)
          .call(
            transcript_plot({ style: style })
              .addLegend()
              .addVerticalPanning()
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
        if (scope.datasetcolors){
          Object.keys(scope.datasetcolors).forEach(function(name){
            style.colorSchemes.sampleType[name] = scope.datasetcolors[name];
          });
        }

        // Draw the transcript with a legend
        vis.datum(scope.data)
          .call(
            transcript_plot({ style: style, domainDB: db })
              .addLegend()
              .addVerticalPanning()
          );

      });

      }
    }
  }).
  // Hsin-Ta added for CNA browser
  directive("cnabrowser", function(styling){
    return {
      restrict: 'E',
      scope: { data: '=', sty: '=', datasetcolors: '='},
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
        if (scope.datasetcolors){
          Object.keys(scope.datasetcolors).forEach(function(name){
            style.colorSchemes.sampleType[name] = scope.datasetcolors[name];
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
      scope: { data: '=', datasetcolors: '=' },
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
          if (scope.datasetcolors){
            Object.keys(scope.datasetcolors).forEach(function(name){
              style.colorSchemes.sampleType[name] = scope.datasetcolors[name];
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
  }).
  directive('savebox', function() {
    return {
      restrict: 'E',
      scope: {},
      link: function(scope, elm, attrs) {
        // create the page elements that initiate the save POST request
        var parent = d3.select(elm[0]);
        var elem = parent
          .append('div')
          //.attr('id', 'saveBox');
          .append('a')
            .attr('id','saveBox')
            .text('Save');

        // event handlers that send and listen for POST requests
        $('#saveBox').click(function() {
          // harvest the SVG from the subnetwork
          var svg = d3.select('div#subnetwork').select('#figure').node(),
              name = 'name';

          console.log(svg);

          // send out the post request
          $.post('/saveSVG', {'html': svg.outerHTML, 'fileName': name})
            .done(function(res) {
              console.log(Object.keys(res).sort());
              var svgStr = (new XMLSerializer).serializeToString(res['childNodes'][0]);
              console.log(svgStr);
              console.log('--');
              // When the post has returned, create a link in the browser to download the SVG
              function download() {
                var url = window.URL.createObjectURL(new Blob([svgStr], { "type" : "text\/xml" }));
                var a = d3.select("body")
                    .append('a')
                    .attr("download", "test.svg")
                    .attr("href", url)
                    .style("display", "none");

                a.node().click();

                // setTimeout(function() {
                //   window.URL.revokeObjectURL(url);
                // }, 10);
              }

              // create a button to download the response
              var button = parent
                .append("button")
                  .style("width", "150px")
                  .style("font-size", "12px")
                  .style("line-height", "1.4em")
                  .style("margin", "5px 0 0 0")
                  .text("Download")
                  .on("click", function(d, i) {
                    d3.event.preventDefault();
                    download();
                  });

            });
        });
      }
    }});
