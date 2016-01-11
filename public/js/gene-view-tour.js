$(document).ready(function(){
  var t = new Shepherd.Tour();

  // Aberrations view
  if ($('div#aberrations svg').length){
    $('#aberrations-tour').click(function(){ t.cancel(); t = aberrationsTour($('div#aberrations svg')); });
  } else {
    $('#aberrations-tour').popover({content: 'No tour available'});
  }
  // Network view
  if ($('div#network svg').length){
    $('#network-tour').click(function(){ t.cancel(); t = networkTour($('div#network svg')); });
  } else {
    $('#network-tour').popover({content: 'No tour available'});
  }
  // Network view
  if ($('div#transcript svg').length){
    $('#transcript-tour').click(function(){ t.cancel(); t = transcriptTour($('div#transcript svg')); });
  } else {
    $('#transcript-tour').popover({content: 'No tour available'});
  }
  // Heatmap view
  if ($('div#heatmap svg').length){
    $('#heatmap-tour').click(function(){ t.cancel(); t = heatmapTour($('div#heatmap svg')); });
  } else {
    $('#heatmap-tour').popover({content: 'No tour available'});
  }
  // CNAs view
  if ($('div#cnas svg').length){
    $('#cnas-tour').click(function(){ t.cancel(); t = cnaTour($('div#cnas svg')); });
  } else {
    $('#cnas-tour').popover({content: 'No tour available'});
  }
});

// Tours
function cnaTour(){
  var tour = new Shepherd.Tour({
    defaults: {
      classes: 'shepherd-open shepherd-element shepherd-theme-arrows',
      scrollTo: false
    }
  });
  tour.addStep('query-step', {
    text: 'The CNA view shows copy number aberrations in a given gene.',
    attachTo: '#cnas-tour',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'First, choose the gene whose aberrations you want to view.',
    attachTo: '#cnas-select bottom',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'The given gene is shown in the genome, with a red line highlighting the gene across all amplified/deleted segments. Mouseover adjacent genes to see their names.',
    attachTo: 'rect.genome top',
    scrollTo: true,
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'Each of the segments represents an amplified/deleted region in a given sample, colored by sample type. Segments above the "genome" represent amplifications, while those below represent deletions.',
    attachTo: 'g.intervals top',
    scrollTo: true,
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel }
    ]
  });
  tour.start();
  return tour;
}
function heatmapTour(){
  // First we choose a column to which we'll attach the cell and column tour steps
  var columnIndex = $('.gd3HeatmapXLabel').length > 20 ? 20 :$('.gd3HeatmapXLabel').length;

  // Then we set up the tour
  var tour = new Shepherd.Tour({
    defaults: {
      classes: 'shepherd-open shepherd-element shepherd-theme-arrows',
      scrollTo: false
    }
  });
  tour.addStep('query-step', {
    text: 'The heatmap view shows continuous-valued data (e.g. gene expression) in the query set of genes across <b>all</b> samples.',
    attachTo: '#heatmap-tour',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'The rows of the matrix are the query set of genes...',
    attachTo: '.gd3heatmapYLabels',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: '...and the columns are samples. The order of the samples matches the order of the samples in the aberrations view above.',
    attachTo: {element: $('.gd3HeatmapXLabel.label' + columnIndex)},
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'Each cell is colored by its value...',
    attachTo: {element: $('.gd3HeatmapCell.label' + columnIndex), on: 'top'},
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: '...shown in this legend. Missing data is colored grey by default.',
    attachTo: '.gd3HeatmapLegend',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'The cancer types of each sample are shown below the heatmap.',
    attachTo: '.gd3annotationYLabels',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel }
    ]
  });
  tour.start();
  return tour;
}
function transcriptTour(){
  var tour = new Shepherd.Tour({
    defaults: {
      classes: 'shepherd-open shepherd-element shepherd-theme-arrows',
      scrollTo: false
    }
  });
  tour.addStep('query-step', {
    text: 'The transcript view shows the single nucleotide variants in a given gene at the protein sequence level.',
    attachTo: '#transcript-tour',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'First, choose the transcript you want to view from the dropdown. The transcript view will then update to show that the mutations along that transcript. If there are mutations on multiple transcripts for a given gene, they will be listed here.',
    attachTo: '#transcript-select',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'The mutations are shown along the protein sequence of the given transcript...',
    attachTo: '.gd3TranscriptGenome',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  if ($('.domains').length > 0 ){
    tour.addStep('query-step', {
      text: 'The protein sequence is annotated with domains, which are labeled when you mouseover them.',
      attachTo: '.domains',
      classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
      buttons: [
        { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
        { text: 'Next', action: tour.next }
      ]
    });
}
tour.addStep('query-step', {
    text: 'Each mutation is represented by a colored symbol. The color represents the type of the sample with the mutation.',
    attachTo: '.gd3MutationSymbol',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'The symbols represent different classes of single nucleotide variants.',
    attachTo: '.gd3-transcript-legend-svg',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel }
    ]
  });
  tour.start();
  return tour;
}

function networkTour(){
  var tour = new Shepherd.Tour({
    defaults: {
      classes: 'shepherd-open shepherd-element shepherd-theme-arrows',
      scrollTo: false
    }
  });
  tour.addStep('query-step', {
    text: 'The network view shows interactions among the query genes from different networks.',
    attachTo: '#network-tour',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'The nodes of the graph are the genes in your query and can be dragged and fixed, and are...',
    attachTo: '.gd3Node',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: '...colored by the number of aberrations in the gene.',
    attachTo: '.gd3GraphGradientLegend',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'Genes are connected by one or multiple edges...',
    attachTo: '.gd3Link',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: '...colored by the network in which the genes interact. Click a network in the legend to toggle the visibility of its interactions.',
    attachTo: '.gd3GraphNetworkLegend',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel }
    ]
  });
  tour.start();
  return tour;
}

function aberrationsTour(svg){
  // First we choose a column to which we'll attach the cell and column tour steps
  var columnIndex = $('.mutmtxColumn').length > 20 ? 20 :$('.mutmtxColumn').length;

  // Create the tour
  var tour = new Shepherd.Tour({
    defaults: {
      classes: 'shepherd-open shepherd-element shepherd-theme-arrows',
      scrollTo: false
    }
  });
  tour.addStep('query-step', {
    text: 'The aberrations view is a gene by tumor sample matrix.',
    attachTo: '#aberrations-tour',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'The rows are your query set of genes, sorted by aberration frequency...',
    attachTo: 'g.mutmtx-rowLabels',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: '... and the columns are the tumor samples with at least one aberration in the query set of genes. The sample labels are shown below in the heatmap view.',
    attachTo: '.mutmtxColumn.label' + columnIndex,
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'Aberrations are represented by rectangles, colored by sample. For details, see the legend below and the "Datasets" list in the Control Panel.',
    attachTo: '.mutmtx-sampleMutationCells.label' + columnIndex,
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  tour.addStep('query-step', {
    text: 'You can change the order of the columns by reordering this drag-and-drop list.',
    attachTo: '#aberrationsSort',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
      { text: 'Next', action: tour.next }
    ]
  });
  if ($('.mutmtx-annRowLabels').length > 0){
    tour.addStep('query-step', {
      text: 'Below the aberrations matrix are rows of sample annotations (e.g. gender).',
      attachTo: '.mutmtx-annRowLabels',
      classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
      buttons: [
        { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel },
        { text: 'Next', action: tour.next }
      ]
    });
  }
  tour.addStep('query-step', {
    text: 'The aberrations view also lists the coverage, which is the number of samples with at least one mutation in the query set of genes.',
    attachTo: '#coverage-string',
    classes: 'shepherd shepherd-open shepherd-theme-arrows shepherd-transparent-text',
    buttons: [
      { text: 'Exit', classes: 'shepherd-button-secondary', action: tour.cancel }
    ]
  });
  tour.start();
  return tour;
}
