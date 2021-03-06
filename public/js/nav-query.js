// Parse URI to get variables if they are present

// Global variable that tracks how tall the navbar is.
// Default is 90 when the requery bar is showing.
var navbarHeight = 81;

function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
}

var queryNoStyle = {
      background: 'none',
      color: '#777'
    },
    queryStyle = {
      background: 'rgb(235,235,235)',
      color: 'rgb(31,31,31)'
    };

function showQueryBtn() {
  navbarQuery.style('display', 'block');
  d3.select('#navbar-query-btn').style(queryStyle);
  d3.select("div#body").style('margin-top', '30px');
  navbarHeight = 81;
}

function hideQueryBtn(){
  navbarQuery.style('display', 'none');
  d3.select('#navbar-query-btn').style(queryNoStyle);
  d3.select("div#body").style('margin-top', '0px');
  navbarHeight = 46;
}

var navbarQuery = d3.selectAll('.navbar-query');
d3.select('#navbar-query-btn')
    .attr('href', '#')
    .on('click', function(){
      if(d3.event) d3.event.preventDefault();
      if (navbarQuery.style('display') !== 'none') hideQueryBtn();
      else showQueryBtn();

    });

$(document).ready(function(){
  if (navbarQuery.style('display') !== 'none') showQueryBtn();
  else hideQueryBtn();
});

// get datasets and genes from URI if they are present
var uriDatasetStr = getQueryVariable('datasets'),
    uriGeneStr = getQueryVariable('genes'),
    loadedDatasets = uriDatasetStr ? uriDatasetStr.split(',') : [],
    addedList = loadedDatasets,
    loadedGenes = uriGeneStr ? uriGeneStr.split(',') : [];

d3.xhr('/queryGetDatasetsAndGenes')
    .header('content-type', 'application/json')
    .get(function(err,res) {
        var data = JSON.parse(res.responseText);
        initQueryWidget(data);
    });

function initQueryWidget(data) {
  // first add recent queries to the menu bar if they exist

  // TODO in the future if more complex querying is needed, magiQueryHrefFN
  //    should be promoted to its own global module so that adding query
  //    parameters can be done in a systematic, complete fashion
  function magiQueryHrefFn() {
    var datasets = 'datasets=' + addedList.join('%2C'),
        genes = 'genes=' + loadedGenes.join('%2C'),
        search = [genes, datasets];

    return 'view?'+search.join('&');
  }

  var queryBtn = d3.select('#magi-nav-queryBtn')
      .attr('href', magiQueryHrefFn)
      .on('click', function() {
        if($('#navbar-query .multiselect :checked').length === 0) d3.event.preventDefault();
      });

  if(data.recentQueries && data.recentQueries.length > 0) {
    var queryPersistanceData = {
      datasets : data.recentQueries[0].datasets.map(function(d) {
            if(!d) return null;
            return d.split('-')[1];
          }),
      genes: data.recentQueries[0].genes
    };

    initGenes(queryPersistanceData);
    initDatasets(queryPersistanceData);

    d3.select('#requery-recent-queries-title').style('display', 'inline-block');
    var queries = d3.select('#requery-recent-queries')
            .style('display', 'inline-block')
            .style('margin-left', '5px')
            .selectAll('a')
              .data(data.recentQueries)
              .enter()
              .append('a');
    queries.each(function(d,i) {
      var datasets = d.datasets.map(function(d) {
            if(!d) return null;
            return d.split('-')[1];
          }),
          genes = d.genes,
          thisEl = d3.select(this),
          title = 'genes:'+genes.join(',') + '; ' + datasets.length + ' datasets';

      var hrefDatasets = 'datasets=' + datasets.join('%2C'),
          hrefGenes = 'genes=' + genes.join('%2C'),
          search = 'view?'+[hrefGenes, hrefDatasets].join('&');

      thisEl.attr('title', title)
          .attr('href', search)
          .style('margin-left', '3px')
          .text('['+(i+1)+']');
    });
  } else {
    d3.select('#requery-recent-queries-title').remove();
    d3.select('#requery-recent-queries').remove();

    $.get('/getSessionLatestQuery').success(function(d) {
      if(!d.datasets || !d.genes) {
        initGenes();
        initDatasets();
      } else {
        initGenes(d);
        initDatasets(d);
      }
    });
  }

  function initGenes() {
    if (arguments.length > 0) {
      loadedGenes = arguments[0].genes;
    }
    var geneList = data.genes,
        geneListLowerCase = geneList.map(function(d) { return d.toLowerCase(); });

    var geneRequery = d3.select('#requery-gene-select'),
        addedGeneArea = d3.select('#requery-gene-badge-container'),
        addedGeneList = d3.select('#requery-gene-badge-list');

    // Initialize the drop down to the correct number of genes
    d3.select("#requery-gene-select-amount").text(loadedGenes.length);

    function addBadge(g) {
      var badgeLi = addedGeneList.append('li')
            .classed('requery-gene-badge-list-item', true)
            .text(g)
            .on('click', function() {
                if(loadedGenes.length <= 1) return;
                loadedGenes.splice(loadedGenes.indexOf(g), 1);
                queryBtn.attr('href', magiQueryHrefFn);
                badgeLi.remove();
                d3.select("#requery-gene-select-amount").text(loadedGenes.length);
            });
      d3.select("#requery-gene-select-amount").text(loadedGenes.length);
    }
    loadedGenes.forEach(addBadge);

    // Gene input entry autocomplete
    var substringMatcher = function(strs) {
      return function findMatches(q, cb) {
        var matches, substringRegex;

        // an array that will be populated with substring matches
        matches = [];

        // regex used to determine if a string contains the substring `q`
        substrRegex = new RegExp('^' + q, 'gi');

        // iterate through the pool of strings and for any string that
        // contains the substring `q`, add it to the `matches` array
        $.each(strs, function(i, str) {
          if (substrRegex.test(str)) {
            matches.push({ gene: str});
          }
        });

        // Sort ascending by length so exact matches are first
        matches.sort(function(x, y){
          var m = x.gene.length,
              n = y.gene.length;
            return m === n ? d3.ascending(x.gene, y.gene) : d3.ascending(m, n);
        });

        cb(matches);
      };
    };

    $('#requery-gene-select-addInput').typeahead({
      hint: false,
      highlight: false,
      minLength: 1
    },
    {
      // name: 'genes',
      display: 'gene',
      limit: 20,
      source: substringMatcher(geneList),
      templates: {
        empty: [
          '<div class="empty-message">',
            'Unable to find any genes that match the current query.',
          '</div>'
        ].join('\n'),
        suggestion: Handlebars.compile('<div class="requery-geneSuggestion">{{gene}}</div>')
      }
    });

    $('#requery-gene-select-addInput')
        .on('typeahead:selected', function(evt, item) {
          // do what you want with the item here
          if(loadedGenes.indexOf(item.gene) < 0) {
            loadedGenes.push(item.gene);
            queryBtn.attr('href', magiQueryHrefFn);
            addBadge(item.gene);
          }
          $('#requery-gene-select-addInput')
              .typeahead('val', '');

          d3.select('#requery-gene-select-addInput')
              .transition()
                .duration(250)
                .style('background', '#3cb878')
              .transition()
                .delay(250)
                .duration(350)
                .style('background', 'white');
        });

    d3.select('#requery-gene-select-addInput').on('keypress', function() {
      if(d3.event.keyCode === 13) {
        d3.event.preventDefault();
      }
    });
  }

  function initDatasets() {
    if (arguments.length > 0) {
        loadedDatasets = d3.set(arguments[0].datasets);
    } else{
        loadedDatasets = null;
    }
    // Add datasets to the multiselect to redefine query
    var groups = data.datasets.groups,
        checkboxes = data.datasets.checkboxes,
        publicGroupToDatasets = data.datasets.publicGroupToDatasets,
        publicGroups = Object.keys(publicGroupToDatasets);

    var requeryMultiselect = d3.select('#dataset-multiselect');
    groups.forEach(function(group){
        var optGroup = requeryMultiselect.append('optgroup')
            .attr('id', group.name)
            .attr('label', group.name);
        optGroup.selectAll('option')
                .data(group.datasets)
                .enter()
                .append('option')
                    .attr('selected', function(d){
                        if (!loadedDatasets) return group.is_default ? "selected" : undefined;
                        else return loadedDatasets.has(d._id) ? "selected" : undefined;
                    })
                    .attr('data-group', group.name)
                    .property('value', function(d) { return 'db-' + d._id; })
                    .text(function(d) { return d.title; });
    });

    //- Initialize the multiselect
    $('#dataset-multiselect').multiselect({
      buttonClass: 'btn btn-xs requery-dataset-select',
      enableCaseInsensitiveFiltering: true,
      includeSelectAllOption: false,
      enableClickableOptGroups: true,
      maxHeight: 400,
      buttonWidth: 200,
      filterBehavior: 'both',
      onChange: function(elem, checked) {
          // Update the link
          var values = $('#navbar-query .multiselect :checked').map(function() { return $(this).val(); }).get();
          addedList = values.map(function(d) {
              var all = d.split('-');
              return all[all.length-1];
          });
          queryBtn.attr('href', magiQueryHrefFn);

          // Enforce exclusivity of public groups
          var _id = elem.val().split('-')[1],
              group = elem.data('group').toLowerCase();

          // Uncheck the other public groups
          if (checked && publicGroups.indexOf(group) !== -1){
              var otherGroups = publicGroups.filter(function(g){ return g != group; }),
                  deselect_ids = [];

              otherGroups.forEach(function(g){
                  Object.keys(publicGroupToDatasets[g]).forEach(function(d){
                      deselect_ids.push( 'db-' + publicGroupToDatasets[g][d] );
                  });
              });

              $('#dataset-multiselect').multiselect('deselect', deselect_ids );
          }
      }
    });

    // Show the multiselect
    $('#magi-datasets').css('visibility', '');
  }
}
