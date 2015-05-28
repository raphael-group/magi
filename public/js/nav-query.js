// Parse URI to get variables if they are present
function getQueryVariable(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  console.log('Query variable %s not found', variable);
}

if(window.location.pathname === '/') {
  d3.select('#navbar-query').remove();
  console.log('hi');
} else {
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
}

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
    var geneRequery = d3.select('#requery-gene-select'),
        addedGeneArea = d3.select('#requery-gene-badge-container');

    function addBadge(g) {
      var badge = addedGeneArea.append('span')
              .attr('class', 'requery-gene-select-badge');
      var geneText = badge.append('span').text(g)
              .style('cursor', 'pointer')
              .style('display', 'block')
              .on('click', function() {
                if(loadedGenes.length <= 1) return;
                loadedGenes.splice(loadedGenes.indexOf(g), 1);
                queryBtn.attr('href', magiQueryHrefFn);
                badge.remove();
              });

      var xOut = geneText.append('span')
              .attr('class', 'requery-gene-select-badge-xout')
              .text('✕');

      geneText.on('mouseover', function() { xOut.style('visibility', 'visible'); })
              .on('mouseout', function() { xOut.style('visibility', 'hidden'); });

    }
    loadedGenes.forEach(addBadge);

    d3.select('#requery-gene-select-addBtn').on('click', function() {
      d3.event.preventDefault();
      var geneInput = d3.select('#requery-gene-select-addInput'),
          gene = geneInput.property('value');

      if(gene === undefined || gene === '') return;
      gene = gene.toUpperCase();

      loadedGenes.push(gene);
      queryBtn.attr('href', magiQueryHrefFn);
      addBadge(gene);
      geneInput.property('value', '');
    });

    d3.select('#requery-gene-select-addInput').on('keypress', function() {
      if(d3.event.keyCode == 13) {
        d3.event.preventDefault();
        var geneInput = d3.select('#requery-gene-select-addInput'),
            gene = geneInput.property('value');

        if(gene === undefined || gene === '') return;
        gene = gene.toUpperCase();

        loadedGenes.push(gene);
        queryBtn.attr('href', magiQueryHrefFn);
        addBadge(gene);
        geneInput.property('value', '');
      }
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
      buttonClass: 'btn btn-xs',
      enableCaseInsensitiveFiltering: true,
      includeSelectAllOption: true,
      maxHeight: 400,
      buttonWidth: 90,
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

    // hack for getting the requery menu to show/hide
    $('#magi-datasets').on('click', function() {
      $('#magi-datasets div.btn-group ul').toggle();
    });

  }


  initGenes();
  initDatasets();
}
