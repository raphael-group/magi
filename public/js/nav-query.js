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

var navbarQuery = d3.selectAll('.navbar-query');
d3.select('#navbar-query-btn')
    .attr('href', '#')
    .on('click', function() {
      if(d3.event) d3.event.preventDefault();
      var isVisible = navbarQuery.style('display') !== 'none';
      navbarQuery.style('display', isVisible ? 'none' : 'block');
      d3.select("div#body").style('margin-top', isVisible ? '0px' : '30px');
      navbarHeight = isVisible ? 46 : 81;
      d3.select(this).style(isVisible ? queryNoStyle : queryStyle);
    });
// get datasets and genes from URI if they are present
var uriDatasetStr = getQueryVariable('datasets'),
    uriGeneStr = getQueryVariable('genes'),
    loadedDatasets = uriDatasetStr ? uriDatasetStr.split(',') : [],
    loadedGenes = uriGeneStr ? uriGeneStr.split(',') : [];

var addedList = [];

d3.xhr('/queryGetDatasetsAndGenes')
    .header('content-type', 'application/json')
    .get(function(err,res) {
        var data = JSON.parse(res.responseText);
        initQueryWidget(data);
    });

function initQueryWidget(data) {
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


  function initGenes() {
    var geneList = data.genes,
        geneListLowerCase = geneList.map(function(d) { return d.toLowerCase(); });

    var geneRequery = d3.select('#requery-gene-select'),
        addedGeneArea = d3.select('#requery-gene-badge-container'),
        addedGeneList = d3.select('#requery-gene-badge-list');

    function addBadge(g) {
      var badgeLi = addedGeneList.append('li')
            .classed('requery-gene-badge-list-item', true)
            .text(g)
            .on('click', function() {
                if(loadedGenes.length <= 1) return;
                loadedGenes.splice(loadedGenes.indexOf(g), 1);
                queryBtn.attr('href', magiQueryHrefFn);
                badgeLi.remove();
            });
    }
    loadedGenes.forEach(addBadge);

    // Gene input entry autocomplete
    var substringMatcher = function(strs) {
      return function findMatches(q, cb) {
        var matches, substringRegex;

        // an array that will be populated with substring matches
        matches = [];

        // regex used to determine if a string contains the substring `q`
        substrRegex = new RegExp(q, 'i');

        // iterate through the pool of strings and for any string that
        // contains the substring `q`, add it to the `matches` array
        $.each(strs, function(i, str) {
          if (substrRegex.test(str)) {
            matches.push({ gene: str});
          }
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
  }

  function initDatasets() {
    // Add datasets to the multiselect to redefine query
    var datasets = data.datasets;

    var requeryMultiselect = d3.select('#dataset-multiselect');
    for (var i in datasets.groups) {
      var group = datasets.groups[i],
          groupName = group.name === "" ? "Other" : group.name;
          var optGroup = requeryMultiselect.append('optgroup')
              .attr('id', groupName)
              .attr('label', groupName);
          optGroup.selectAll('option')
                  .data(group.dbs)
                  .enter()
                  .append('option')
                      .property('value', function(d) { return d.checkboxValue; })
                      .text(function(d) { return d.title; });
    }

    //- Initialize the multiselect
    $('#dataset-multiselect').multiselect({
      buttonClass: 'btn btn-xs requery-dataset-select',
      enableCaseInsensitiveFiltering: true,
      includeSelectAllOption: true,
      maxHeight: 400,
      buttonWidth: 200,
      filterBehavior: 'both',
      onChange: function(elem, checked) {
        var values = $('#navbar-query .multiselect :checked').map(function() { return $(this).val(); }).get();
        addedList = values.map(function(d) {
          var all = d.split(' ');
          return all[all.length-1];
        });
        queryBtn.attr('href', magiQueryHrefFn);
      }
    });

    // Add already-loaded datasets checked
    $('#magi-datasets div.btn-group ul li input:not(:checked)').filter(function(i, elem) {
      var tkns = $(elem).val().split(' '),
          dset = tkns[tkns.length-1];
      return loadedDatasets.indexOf(dset) > -1;
    }).trigger('click');

    // Show the multiselect
    $('#magi-datasets').css('visibility', '');
  }


  initGenes();
  initDatasets();
}
