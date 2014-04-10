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
        // Generalized post code to handle SVG download for each visualization
        function saveSVG(divContainerId, saveFileName) {
          // harvest the SVG from the subnetwork
          var svg = null,
              name = '';

          // Switch statement hack to change SVG search based on viz
          if (saveFileName == 'subnetwork.svg') {
            svg = d3.select('div#'+divContainerId).select('#figure').node();
          } else if (saveFileName == 'mutation-matrix.svg') {
            svg = d3.select('div#'+divContainerId).select('svg#mutation-matrix').node();
          } else if (saveFileName == 'transcript-annotation.svg') {
            console.log()
            svg = d3.selectAll('div.'+divContainerId).selectAll('svg')[0][0];
          } else {
            svg = d3.select('div#'+divContainerId).select('#figure').node();
          }

          // send out the post request
          $.post('/saveSVG', {'html': svg.outerHTML, 'fileName': name})
            .done(function(svgStr) {
              // When the post has returned, create a link in the browser to download the SVG
              // Store the data and create a download link
              var url = window.URL.createObjectURL(new Blob([svgStr], { "type" : "text\/xml" }));
              var a = d3.select("body")
                  .append('a')
                  .attr("download", saveFileName)
                  .attr("href", url)
                  .style("display", "none");

              // Activate the download through a click event
              a.node().click();

              // Garbage collection
              setTimeout(function() {
                window.URL.revokeObjectURL(url);
              }, 10);
            });
        }

        // create the page elements that initiate the save POST request
        var parent = d3.select(elm[0]);
        var saveContainer = parent.append('div');

        // Options for user selection on which viz to save
        var saveOptData = [
            {name:'Copy number browser', id:'cna'},
            {name:'Mutation matrix', id:'mutmatrix'},
            {name:'Subnetwork', id:'subnetwork'},
            {name:'Transcript annotation', id:'transcript'}
        ];

        var saveCheckboxes = saveContainer.append('ul')
            .style('list-style', 'none')
            .style('padding', '0px')
            .selectAll('li')
            .data(saveOptData)
            .enter()
            .append('li')
              .style('display', 'inline')
              .style('margin-right', '20px')
              .append('label')
                .text(function(d){return d.name})
                .append('input')
                  .attr('id', function(d){return d.id})
                  .attr('type', 'checkbox');

        var subnetSave = saveContainer.append('a')
            .attr('id','saveSubnetBox')
            .style('cursor', 'pointer')
            .text('Submit download request');

        var checkMessage = saveContainer.append('p')
            .style('background', 'rgb(242, 222, 222)')
            .style('border', '1px solid rgb(205, 174, 179)')
            .style('border-radius', '4px')
            .style('display', 'none')
            .style('padding', '5px')
            .text('Error: Please select at least one visualization to download.');

        // event handlers that send and listen for POST requests
        $('#saveSubnetBox').click(function() {
          var saveResponses = saveCheckboxes[0],
              CNA_VIZ = 0,
              MUT_MTX = 1,
              SUB_NET = 2,
              TRN_ANT = 3;

          var saveAtLeastOne = saveResponses[CNA_VIZ].checked == true
              || saveResponses[TRN_ANT].checked == true
              || saveResponses[SUB_NET].checked == true
              || saveResponses[MUT_MTX].checked == true;

          if (saveAtLeastOne == false) {
            checkMessage.style('display', 'block');
            parent.selectAll('button').remove();
            return;
          } else {
            checkMessage.style('display', 'none');
          }

          if (saveResponses[CNA_VIZ].checked == true) {
            // TODO implement
            //saveSVG('cna-viz', 'cna.svg');
          }
          if (saveResponses[TRN_ANT].checked == true) {
            // If a gene transcript hasn't been selected, don't try to save an SVG
            var tMenu = d3.select('div#transcript-holder select').node(),
                tMenuOptSelected = tMenu.selectedIndex;
            if (tMenuOptSelected != 0) {
              saveSVG('transcript-svg', 'transcript-annotation.svg');
            }
          }
          if (saveResponses[SUB_NET].checked == true) {
            saveSVG('subnetwork', 'subnetwork.svg');
          }
          if (saveResponses[MUT_MTX].checked == true) {
            saveSVG('mutation-matrix', 'mutation-matrix.svg');
          }

          parent.selectAll('button').remove();
        });
      }
    }});
