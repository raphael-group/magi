function mutation_plot(params){
	// Parse the params
	var params = params || {},
		style  = params.style || {},
		colorSchemes = style.colorSchemes || {};

	// Initialize the two types on the x- and y-axes
	var ty1 = params.ty1 || "snvs",
		ty2 = params.ty2 || "cnas";

	// Define the default global variables
	var margin = style.margin || {top: 30, right: 10, bottom: 40, left: 60},
    	width = style.width || 640,
    	height = style.height || 333,
    	bgColor = style.bgColor || '#F6F6F6',
    	fontFamily = style.fontFamily || "Arial",
    	fontSize = style.fontSize || 4,
    	animationSpeed = style.animationSpeed || 1000,
    	tyToName = style.tyToName || {
    									"snvs": "No. SNVs",
    									"cnas": "No. CNAs",
    									"amp": "No. Amplifications",
    									"del": "No. Deletions",
    									"frame_shift_del": "No. Frameshift Deletions",
    									"frame_shift_ins": "No. Frameshift Insertions",
    									"missense_mutation": "No. Missense Mutations",
    									"nonsense_mutation": "No. Nonsense Mutations",
    									"in_frame_del": "No. Inframe Deletions",
    									"in_frame_ins": "No. Inframe Insertions",
    									"splice_site": "No. Splice-Site Mutations",
    									"frame_shift_ins": "No. Frameshift Insertions",
    									"frame_shift_del": "No. Frameshift Deletions",
    									"nonstop_mutation": "No. Nonstop Mutations",
    									"inactivating": "No. Inactivating",
    									"mutated_samples": "No. Mutated Samples"
    								  };
    function mutTyToName(ty){ return tyToName[ty] ? tyToName[ty] : ty; }
	
	// Update the width/height using the margins
	var width = width - margin.left - margin.right,
		height = width - margin.top - margin.bottom;

	// Global variables
	var	updatePlot,
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

						var quantilePoints = [n-1, 81*n/100, 27*n/100, 9*n/100, 3*n/100, 0],
							quantiles = quantilePoints.map(function(d){ return dist(dataset[Math.round(d)]); })

						// Create a map from each gene to its data
						var points = {};
						dataset.forEach(function(d){ points[d.gene] = d ; });

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
				.range(["rgb(167, 206, 230)", "rgb(213, 220, 97)", "rgb(202, 66, 64)", "rgb(202, 66, 64)"]);
			
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

			var yLabel = svg.append("text")
				.attr("class", "y label")
				.attr("text-anchor", "end")
				.attr("x", -height/2)
				.attr("y", margin.left - 45)
				.attr("dy", ".75em")
				.attr("transform", "rotate(-90)")
				.style("font-size", 14);

			// Add the points and initialize them so the first transition isn't awkward
			points = data[ty1][ty2].points;
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

			// Add tooltips
			var tip = d3.tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function(g){
					var d = points[g];
					return d.gene + "<br/>" + tyToName[ty1] + ": " + d.x + "<br/>" + tyToName[ty2] + ": " + d.y;
				});

			svg.call(tip);
			poly.on("mouseover", tip.show)
		 		.on("mouseout", tip.hide);

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

				// Update the axes and make sure the strokes are still visible
				xAxis.scale(x);
				xAxisEl.call(xAxis);
				xAxisEl.select("path").style("opacity", 0);
				xAxisEl.selectAll(".tick line")
					.style("stroke", "lightgrey")
					.style("opacity", 0.7)
					.style("stroke-dasharray", ("3, 3"));

				xLabel.text(mutTyToName(ty1));

				yAxis.scale(y);
				yAxisEl.call(yAxis);
				yAxisEl.select("path").style("opacity", 0);
				yAxisEl.selectAll(".tick line")
					.style("stroke", "lightgrey")
					.style("opacity", 0.7)
					.style("stroke-dasharray", ("3, 3"));

				yLabel.text(mutTyToName(ty2));

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
				tx = Math.min(Math.max(tx, 0), width - data[ty1][ty2].xMax);
				console.log(data[ty1][ty2].xMax, [tx, ty])
				zoom.translate([tx, ty]);

				// Update the axes
				fig.select(".x.axis").call(xAxis);
				xAxisEl.selectAll(".tick line")
					.style("stroke", "lightgrey")
					.style("opacity", 0.7)
					.style("stroke-dasharray", ("3, 3"));
				fig.select(".y.axis").call(yAxis);
				yAxisEl.selectAll(".tick line")
					.style("stroke", "lightgrey")
					.style("opacity", 0.7)
					.style("stroke-dasharray", ("3, 3"));

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
			}

			// Append axes selectors in a div below the selection
			addAxesSelectors = function (){
				// Add two selectors, one for the x- and one for the y-axis
				var selectors = selection.append("div")
					.selectAll(".select")
					.data(["X-axis", "Y-axis"]).enter()
					.append("div")
					.style("float", function(d, i){ return i == 0 ? "left" : "right"; })
					.style("margin-left", function(d, i){ return i == 0 ? margin.left + "px" : "0px";});

				selectors.append("label")
					.text(function(d){ return d; });

				// Have the selectors float in the same line, where each selector updates
				// the type according to which axis is being modified
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

				// Add the options
				var opts = select.selectAll(".option")
					.data(mutationTypes.sort()).enter()
					.append("option")
					.attr("value", function(d){ return d; })
					.text(function(d){ return mutTyToName(d); });

				// Initialize the axes' values with the current types
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
