var svg = d3.select('#splash-img').append('svg');

var data = [
        [{'x': 0.0, 'y': 0.0},
          {'x': 273.0, 'y':0},
          {'x': 25.0, 'y': 250},
          {'x': 0, 'y': 250}
        ],
        [{'x': 282.0, 'y': 0},
          {'x': 667.0, 'y': 0},
          {'x': 417.0, 'y': 250},
          {'x': 34.0, 'y': 250}
        ],
        [{'x': 675.0, 'y': 0},
          {'x': 989.0, 'y': 0},
          {'x': 739.0, 'y': 250},
          {'x': 425.0, 'y': 250}
        ],
        [{'x': 998.0, 'y': 0},
          {'x': 1200.0, 'y': 0},
          {'x': 1200.0, 'y': 250},
          {'x': 747.0, 'y': 250}
        ]
];

var urls = [
  '#oncoprint',
  '#subnetwork',
  '#transcript-plot',
  '#cna-browser'
];

svg.selectAll('polygon')
  .data(data)
  .enter()
  .append('a')
    .attr('xlink:href', function(d) {
      return urls[data.indexOf(d)];
    })
  .append('polygon')
    .attr('points', function(d) {
      return d.map(function(d) {
        return [d.x,d.y].join(',');
      }).join(' ');
    })
    .attr('fill', '#ccc')
    .attr('stroke-width', 0)
    .style('opacity', 0)
    .on('mouseover', function() {
      d3.select(this).style('opacity', .5);
    })
    .on("mouseout", function() {
      d3.select(this).style('opacity', 0);
    });