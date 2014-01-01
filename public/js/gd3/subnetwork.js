function draw_subnetwork(el, nodes, edges, styling){

    // Parse the styling into shorter variable handles
	var style = styling.global
    , subnetStyle = styling.subnetwork
    , cold = subnetStyle.cold
    , hot = subnetStyle.hot
    , width = subnetStyle.width
    , margins = subnetStyle.margins
    , height = 100 + 15 * nodes.length
    , heatLegendHeight = subnetStyle.heatLegendHeight
    , heatLegendWidth  = width
    , netLegendWidth = subnetStyle.netLegendWidth
    , netLegendBox = subnetStyle.netLegendBox
    , edgeWidth = subnetStyle.edgeWidth
    , width = width - margins.left - margins.right
    , transitionTime = subnetStyle.transitionTime;

	// Set up the SVG
    var fig = el.append("svg")
        .attr("id", "figure")
        .attr("height", height + margins.top + margins.bottom)
        .attr("width", width + margins.left + margins.right)
        .style("font-family", "Arial")
        .style("font-size", 10);

    // Create the color scale
    var heatRange = nodes.map(function(n){ return n.heat; })
  	var color = d3.scale.linear()
    	.domain([d3.min(heatRange), d3.max(heatRange)])
    	.range([cold, hot])
	    .nice();

    // Set up the force directed graph
    var r = 10;
    var force = d3.layout.force()
        .charge(-400)
        .linkDistance(40)
        .size([width, height]);

    // This drag function fixes nodes in placed once they've been dragged
    var drag = force.drag()
        .on("dragstart", dragstart);
    
    // Set up scales
    var x = d3.scale.linear().range([0, width]),
    y = d3.scale.linear().range([0, height]);

    var links = load_links(edges, nodes);

    force.nodes(nodes)
        .links(links)
        .start();

    // Determine which networks are in the data
    var networks = [];
    for (var i = 0; i < links.length; i++){
        for (var j = 0; j < links[i].networks.length; j++){
            if (networks.indexOf(links[i].networks[j]) == -1)
                networks.push( links[i].networks[j] );
        }
    }
    var numNets = networks.length
    , netLegendHeight = numNets * 10;

    // Draw the edges
    var link = fig.selectAll(".link")
        .data(links);

    var linkInNetwork = {}
    ,  activeNetworks = {};
    for (var i= 0 ; i < networks.length; i++) {
        var net = networks[i]
        , netColor = style.colorSchemes.network[networks[i]];
        activeNetworks[net] = true;

        var inNet = fig.selectAll("." + net)
            .data(links.filter(function (link) {
                return link.networks && link.networks.indexOf(net) != -1;
            }))
            .enter().append("line")
            .classed(net, true)
            .style("stroke-width", edgeWidth)
            .style("stroke", netColor);

        linkInNetwork[net] = inNet;
    } 

    // Draw the nodes
    // Keep the circles and text in the same group for better dragging
    var circle = fig.append("svg:g")
        .selectAll(".node")
        .data(nodes)
        .enter().append("svg:g")
        .style("cursor", "move")
        .call(force.drag)
        .on("dblclick", function(d){
            d.fixed = d.fixed ? false : true;
            d3.select(this).select("circle").style("stroke-opacity", 1);
        });
    
    circle.append("circle")
        .attr("r", r)
        .attr("fill", function(d) { return color(d.heat); } )
        .style("stroke-width", 1.5)
        .style("stroke", "#333");
    
    circle.append("svg:text")
        .attr("x", r)
        .attr("y", ".31em")
        .style("fill", "#333")
        .style("font-size", 12)
        .text(function(d) { return d.name; });

    // Function for fixing nodes
    // - Remove the stroke on nodes once they're fixed
    function dragstart(d) {
        d.fixed = true;
        d3.select(this).select("circle").style("stroke-opacity", 0)
    }

    // Make sure nodes don't go outside the borders of the SVG
    force.on("tick", function() {
        circle.attr("transform", function(d) {
            d.x = Math.max(r, Math.min(width - r, d.x));
            d.y = Math.max(r, Math.min(height - r, d.y));
            return "translate(" + d.x + "," + d.y + ")";
        });

        networks.forEach(
            function(net, i) {
                var offset = edgeWidth * ( i-numNets / 2 );
                linkInNetwork[net].attr("x1", function(d) { return d.source.x + offset; })
                    .attr("y1", function(d) { return d.source.y + offset; })
                    .attr("x2", function(d) { return d.target.x + offset; })
                    .attr("y2", function(d) { return d.target.y + offset; });
            }
        );
    });

    /***** Draw the legends *****/
    // Network legend
    fig.append("rect")
        .attr("width", netLegendWidth)
        .attr("height", netLegendHeight)
        .attr("x", width-netLegendWidth)
        .style("fill", "#fff");

    var netLegend = fig.selectAll(".net-group")
        .data(networks).enter()
        .append("g")
            .attr("transform", function(d, i){
                return "translate(" + (width-netLegendWidth) + "," + ((i+1)*netLegendBox) + ")";
            })
            .style("font-size", 12)
            .on("click", function(n){
                var active = activeNetworks[n];
                activeNetworks[n] = !active;
                linkInNetwork[n].transition().duration(transitionTime)
                    .style("stroke-opacity", active ? 0 : 1);

                d3.select(this).transition().duration(transitionTime)
                    .style("stroke-opacity", active ? 0.5 : 1)
                    .style("fill-opacity", active ? 0.5 : 1);
            });

    netLegend.append("line")
        .attr("x1", 0)
        .attr("x2", netLegendBox)
        .style("stroke-width", edgeWidth)
        .style("stroke", function(n){ return style.colorSchemes.network[n]; });

    netLegend.append("text")
        .attr("x", 8 + netLegendBox)
        .attr("y", 3)
        .text(function(n){ return n; });

    // Gradient legend
    var heatLegend = el.append("div")
    	.attr("id", "subnetwork-legend")
    	.style("width", heatLegendWidth + "px");

    var gradient = heatLegend.append("svg")
        .attr("width", heatLegendWidth)
        .attr("height", heatLegendHeight);

    gradient.append('svg:defs')
    	.append('svg:linearGradient')
    	.attr('x1', "0%").attr('y1', "0%").attr('x2', "100%").attr('y2', "0%")
    	.attr('id', 'heat_gradient').call(
			function (gradient) {
      			gradient.append('svg:stop')
      				.attr('offset', '0%')
      				.attr('style', 'stop-color:' + cold + ';stop-opacity:1');
      			gradient.append('svg:stop')
      				.attr('offset', '100%')
      				.attr('style', 'stop-color:' + hot + ';stop-opacity:1');
		});

    gradient.append("rect")
        .attr("width", heatLegendWidth)
        .attr("height", heatLegendHeight)
        .style("fill", "url(#heat_gradient)");

    var labels = heatLegend.append("div")
    	.style("clear", "both");

    heatLegend.append("span")
    	.style("float", "left")
    	.text(d3.min(heatRange));

    heatLegend.append("span")
    	.style("float", "right")
    	.text(d3.max(heatRange));
    
}

function load_links(edges, nodes){
    // Function that takes a list of edges and nodes and returns a list of 
    // links between the nodes according to the list of edges
    var links = new Array();
    for (i = 0; i < nodes.length; i++){
        var u = nodes[i].name;
        for (j = 0; j < nodes.length; j++){
            var v = nodes[j].name;
            for (k=0; k < edges.length; k++){
                var src = edges[k].source,
                tar = edges[k].target;
                if ((u == src && v == tar) || (u == tar && v == src))
                    links.push({"source"  : nodes[i], "target" : nodes[j],
                                'weight'  : edges[k].weight,
                                'networks': edges[k].networks });
            }
        }
    }
    
    return links;
}
