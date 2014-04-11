function mutation_plot(params){
	// Parse the params
	var params = params || {},
		style  = params.style || {},
		colorSchemes = style.colorSchemes || {};

	// Define the default global variables
	var margin = style.margin || {top: 30, right: 10, bottom: 40, left: 60},
    	width = style.width || 640,
    	height = style.height || 333,
    	bgColor = style.bgColor || '#F6F6F6',
    	fontFamily = style.fontFamily || "Arial",
    	fontSize = style.fontSize || 4,
    	animationSpeed = style.animationSpeed || 1000,
    	tyToName = style.tyToName || { "snvs": "No. SNVs", "cnas": "No. CNAs", "amps": "No. Amplifications", "nonsense": "No. Nonsense" }
	
	// Update the width/height using the margins
	var width = width - margin.left - margin.right,
		height = width - margin.top - margin.bottom;

	// 
	var ty1 = "snvs",
		ty2 = "cnas",
		updatePlot,
		mutationTypes,
		addAxesSelectors;

	function chart(selection){
		selection.each(function(geneToData) {
			// Distance from origin function
			function dist(d){ return d.x * d.x + d.y * d.y; }

			// Generate the data
			function generateData(){
				var genes = Object.keys(geneToData),
					n = genes.length;
					mutationData = {};
				mutationTypes = Object.keys(geneToData[genes[0]]);

				mutationTypes.forEach(function(t1){
					mutationData[t1] = {};
					mutationTypes.forEach(function(t2){
						// Parse the data, and extract the top maxNumPoints
						var dataset = genes.map(function(g){
							return { x: +geneToData[g][t1], y: +geneToData[g][t2], gene: g };
						}).sort(function(a, b){ return dist(a) > dist(b) ? -1 : 1 });

						var quantiles = [dist(dataset[4*n/5]), dist(dataset[3*n/5]), dist(dataset[2*n/5]), dist(dataset[n/5])];

						// 
						var points = {};
						dataset.forEach(function(d){
							points[d.gene] = d ;
						});

						// Find the extent of the data
						var xMax = d3.max(dataset, function(d) { return +d.x; }),
							yMax = d3.max(dataset, function(d) { return +d.y; });

						mutationData[t1][t2] = { points: points, xMin: 0, xMax: xMax, yMin: 0, yMax: yMax, quantiles: quantiles };

					});
				});
				return { data: mutationData, genes: genes, n: genes.length };
			}

			var mutationData = generateData(),
				data = mutationData.data,
				genes = mutationData.genes;

			//Define scales
			var x = d3.scale.linear()
				.range([0, width]);
				
			var y = d3.scale.linear()
				.range([height, 0]);
				
			var colorScale = d3.scale.pow().exponent(1.2)
				.range(["rgb(167, 206, 230)", "rgb(213, 220, 97)", "rgb(202, 66, 64)", "rgb(202, 66, 64)"])
				.nice();
			
			//Define X axis
			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.tickSize(-height)
				.tickFormat(d3.format("s"));
			
			//Define Y axis
			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left")
				.ticks(5)
				.tickSize(-width)
				.tickFormat(d3.format("s"));
			
			// Set up zoom behavior
			var zoom = d3.behavior.zoom()
				.x(x).y(y)
				.scaleExtent([1, 100])
				.on("zoom", zoomed)

			// Add the SVG
			var svg = selection.append("svg")
				.attr("width", width + margin.left + margin.right)
				.attr("height", height + margin.top + margin.bottom);
			
			var fig = svg.append("g")
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.call(zoom);

			fig.append("rect")
				.attr("fill", bgColor)
				.attr("width", width)
				.attr("height", height)

			// Add the axes, gridlines, and labels
			var xAxisEl = fig.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")");

			var xLabel = svg.append("text")
				.attr("class", "x label")
				.attr("text-anchor", "middle")
				.attr("x", (width + margin.left + margin.right)/2)
				.attr("y", height + margin.top + margin.bottom - 10)
				.style("font-size", 14);
			
			var yAxisEl = fig.append("g")
				.attr("class", "y axis")
				.style("cursor", "move");

			yAxisEl.select("path").style("opacity", 0);
			yAxisEl.selectAll(".tick line")
				.style("stroke", "lightgrey")
				.style("opacity", 0.7)
				.style("stroke-dasharray", ("3, 3"));

			var yLabel = svg.append("text")
				.attr("class", "y label")
				.attr("text-anchor", "end")
				.attr("x", -height/2)
				.attr("y", margin.left - 45)
				.attr("dy", ".75em")
				.attr("transform", "rotate(-90)")
				.style("font-size", 14);

			// Add the points and initialize them so the first transition isn't awkward
			points = points = data[ty1][ty2].points;
			var poly = fig.selectAll(".polygon")
				.data(genes).enter()
				.append("polygon")
		        .attr("class", "hex")
				.attr("opacity", 0.8)
				.attr('points','4.569,2.637 0,5.276 -4.569,2.637 -4.569,-2.637 0,-5.276 4.569,-2.637')
				.attr("fill", function(g) { return colorScale(dist(points[g])); })
				.attr("transform", function(g) {
					var d = points[g];
					return "translate(" + x(d.x) + "," + y(d.y) + ")";
				});


			var points;

			updatePlot = function(){
				// Retrieve the updated points
				points = data[ty1][ty2].points;

				// Update the scales
				var xMin = data[ty1][ty2].xMin,
					xMax = data[ty1][ty2].xMax,
					yMin = data[ty1][ty2].yMin,
					yMax = data[ty1][ty2].yMax;
				
				x.domain([xMin, xMax]);
				y.domain([yMin, yMax]);

				colorScale.domain(data[ty1][ty2].quantiles);

				// Reset the zoom
				zoom.x(x).y(y);

				// Update the axes
				xAxis.scale(x);
				xAxisEl.call(xAxis);
				xAxisEl.select("path").style("opacity", 0);
				xAxisEl.selectAll(".tick line")
					.style("stroke", "lightgrey")
					.style("opacity", 0.7)
					.style("stroke-dasharray", ("3, 3"));

				xLabel.text(tyToName[ty1]);

				yAxis.scale(y);
				yAxisEl.call(yAxis);
				yAxisEl.select("path").style("opacity", 0);
				yAxisEl.selectAll(".tick line")
					.style("stroke", "lightgrey")
					.style("opacity", 0.7)
					.style("stroke-dasharray", ("3, 3"));

				yLabel.text(tyToName[ty2]);

				// Create a transition
				poly.transition().duration(animationSpeed)
					.delay(function(g) { return x(points[g].x); })
					.attr("fill", function(g) { return colorScale(dist(points[g])); })
					.attr("transform", function(g) {
						var d = points[g];
						return "translate(" + x(d.x) + "," + y(d.y) + ")";
					});

				updatePoints();

			}

			updatePlot();
			
			function zoomed() {
				// Limit the panning behavior of the plot
				var t = zoom.translate(),
					tx = t[0],
					ty = t[1];

				tx = Math.max(Math.min(tx, 0), width - data[ty1][ty2].xMax);
				zoom.translate([tx, ty]);

				// Update the axes
				fig.select(".x.axis").call(xAxis);
				fig.select(".y.axis").call(yAxis);

				// Move the points into position
				poly.attr("transform", function(g) {
						var d = points[g];
						return "translate(" + x(d.x) + "," + y(d.y) + ")";
					});

				// Update the tooltips and the visible points 
				updatePoints();
			}

			function updatePoints(){
				// First make all points visible, then fade out points outside the viewPort
				poly.style("opacity", 1);
				poly.filter(function(g){
						var d = points[g];
						return x(d.x) < 0  || y(d.y) > height || y(d.y) < 0;
					})
					.style("opacity", 0);

				// Add tooltips to each point
				poly.tooltip(function(g) {
					var d = points[g];
					var tip = d.gene + "<br/>" + tyToName[ty1] + ": " + d.x + "<br/>" + tyToName[ty2] + ": " + d.y;
					return {
						detection: 'shape',
						displacement: [60, 5],
						gravity: 'right',
						mousemove: false,
						placement: 'fixed',
						position: [x(d.x), y(d.y)],
						text: tip,
						type: 'tooltip'
					};
				});
			}

			addAxesSelectors = function (){
				var selectors = selection.append("div")
					.selectAll(".select")
					.data(["X-axis", "Y-axis"]).enter()
					.append("div")
					.style("float", function(d, i){ return i == 0 ? "left" : "right"; })
					.style("margin-left", function(d, i){ return i == 0 ? margin.left + "px" : "0px";});

				selectors.append("label")
					.text(function(d){ return d; });

				var select = selectors.append("select")
					.attr("class", "form-control")
					.attr("id", function(d){ return d; })
					.style("width", "100%")
					.style("display", "inline")
					.on("change", function(d, i){
						if (i == 0) ty1 = $(this).val();
						else if (i == 1) ty2 = $(this).val();
						updatePlot();
					});

				var opts = select.selectAll(".option")
					.data(mutationTypes).enter()
					.append("option")
					.attr("value", function(d){ return d; })
					.text(function(d){ return tyToName[d]; });

				$("#X-axis").val(ty1);
				$("#Y-axis").val(ty2);

			}

		});
    }

    chart.selectMutationTypes = function (x, y){
    	ty1 = x;
    	ty2 = y;
    	updatePlot();
    	return chart;
    }

    chart.addAxesSelectors = function(_){
    	addAxesSelectors();
    }

    return chart;
}
