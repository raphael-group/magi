// Import required modules
var mongoose = require( 'mongoose' ),
	Genome  = require( "./genome" ),
	Cancers  = require( "./cancers" ),
	GeneSets  = require( "./genesets" ),
	Database = require('./db');

// Create schemas to hold the SNVs
var MutGeneSchema = new mongoose.Schema({
	gene: {type: String, required: true},
	dataset_id: { type: mongoose.Schema.Types.ObjectId, required: true},
	mutated_samples: { type: {}, required: true, default: []},
	snvs: { type: {}, required: false},
	cnas: { type: {}, required: false},
	updated_at: { type: Date, default: Date.now, required: true },
});

// Create schemas to hold the entire database
var DatasetSchema = new mongoose.Schema({
	title: { type: String, required: true },
	samples: { type: [String], required: true },
	sample_annotations : { type : {}, required: true },
	annotation_colors : { type : {}, required: true },
	group: { type: String, required: false},
	cancer_id: { type: mongoose.Schema.Types.ObjectId, required: true },
	summary: { type: {}, required: true },
	data_matrix_name: {type: String, required: false, default: "" },
	data_matrix_samples: { type : Array, required: false, default: [] },
	updated_at: { type: Date, default: Date.now, required: true },
	created_at: { type: Date, default: Date.now, required: true },
	user_id: { type: mongoose.Schema.Types.ObjectId, default: null},
	is_public: { type: Boolean, default: false, required: true },
	color: { type: String, required: true }
});

// Create schemas to hold a data matrix
var DataMatrixRowSchema = new mongoose.Schema({
	gene: {type: Array, required: true},
	dataset_id: {type: mongoose.Schema.Types.ObjectId, required: true},
	row: {type: Array, required: true},
	updated_at: { type: Date, default: Date.now, required: true }
});


Database.magi.model( 'Dataset', DatasetSchema );
Database.magi.model( 'MutGene', MutGeneSchema );
Database.magi.model( 'DataMatrixRow', DataMatrixRowSchema );

// List the datasets by group
exports.datasetGroups = function datasetgroups(query, callback){
	var Dataset = Database.magi.model( 'Dataset' );

	Dataset.aggregate(
		{ $match: query },
		{$group: {_id: '$group', dbs: { $push: {title: '$title', color: '$color', _id: '$_id', samples: '$samples', updated_at: '$updated_at'} } }},
		{$sort: {_id: -1}}, // sort descending by group name
		function(err, res){
			// Handle error (if necessary)
			if (err) throw new Error(err);

			// Parse result into groups
			var groups = [];
			for (var i = 0; i < res.length; i++){
				var dbs = res[i].dbs.sort(function(db1, db2){ return db1.title > db2.title; });
				dbs.forEach(function(db){ db.num_samples = db.samples.length; })
				groups.push( {name: res[i]._id, dbs: dbs } );
			}

			// Execute callback
			callback(err, groups);
		}
	)
}

exports.datasetlist = function datasetlist(dataset_ids, callback){
	var Dataset = Database.magi.model( 'Dataset' );
	Dataset.find({_id: {$in: dataset_ids}}, callback);
}

exports.removeDataset = function removeDataset(query, callback){
	// Load the modules
	var Dataset = Database.magi.model( 'Dataset' ),
		MutGene = Database.magi.model( 'MutGene' ),
		DataMatrixRow = Database.magi.model( 'DataMatrixRow' ),
		Sample = Database.magi.model( 'Sample' );

	// Remove the dataset, then remove all mutgenes from that dataset
	Dataset.remove(query, function(err){
		// Throw an error if it occurred
		if (err) throw new Error(err);

		// Otherwise, remove all mutgenes with 
		MutGene.remove({dataset_id: query.dataset_id}, function(err){
			// Throw an error if it occurred
			if (err) throw new Error(err);
			
			DataMatrixRow.remove({dataset_id: query.dataset_id}, function(err){
				// Throw an error if it occurred
				if (err) throw new Error(err);

				Sample.remove({ dataset_id: query.dataset_id}, function(err){
					// Throw an error if it occurred
					if (err) throw new Error(err);

					// Otherwise call the callback
					callback("");
				});
			});
		});
	});
}

// A function for listing all the SNVs for a set of genes
exports.mutGenesList = function snvlist(genes, dataset_ids, callback){
	var MutGene = Database.magi.model( 'MutGene' ),
		query = { gene: {$in: genes}, dataset_id: {$in: dataset_ids} };

	MutGene.find(query, function(err, mutGenes){
 		if(err) console.log(err);
 		else callback("", mutGenes);
	});// end MutGene.find

}// end exports.mutGenesList

exports.createHeatmap = function createHeatmap(genes, datasets, samples, callback){
	// Make sure the parameters were passed correctly
	if (genes.length == 0 || datasets.length == 0 || !datasets[0].data_matrix_name){
		callback("", {});
		return;
	}

	// Filter datasets that aren't describing the same data
	var data_matrix_name = datasets[0].data_matrix_name;

	datasets = datasets.filter(function(d){
		return d.data_matrix_name != "" &&
		       d.data_matrix_name.toLowerCase() == data_matrix_name.toLowerCase();
	});

	if (datasets.length == 0) callback("", {});

	// Construct the list of samples. If none were provided, use all
	if (samples.length == 0){
		var samples = [];
		datasets.forEach(function(d){
			samples = samples.concat(d.data_matrix_samples.map(function(d){ return {name: d}; }));
		})
	}
	var sampleNames = samples.map(function(d){ return d.name; });

	// Construct the DataMatrixRow query
	var DataMatrixRow = Database.magi.model( 'DataMatrixRow' ),
		query = { gene: {$in: genes}, dataset_id: {$in: datasets.map(function(d){ return d._id; }) }};

	DataMatrixRow.find(query, function(err, rows){
		if (err) throw new Error(err);
		// Return an empty object if there is no data matrix for these genes/datasets
		else if (rows.length == 0){ callback("", {}); }
		// Construct the union of the data matrices from each dataset
		else{
			// Heatmap: array of objects
			// - x = row names
			// - ys = column names
			// - cell = number
			// - name = descriptor of data
			var heatmap = {xs: sampleNames, ys: genes, cells: [], name: data_matrix_name },
				geneToDatasetToRow = {};

			// Create a mapping of genes -> dataset_ids -> data matrix rows
			genes.forEach(function(g){ geneToDatasetToRow[g] = {}; });
			rows.forEach(function(r){ geneToDatasetToRow[r.gene][r.dataset_id] = r; });

			// Iterate over the genes and datasets to construct the unified heatmap
			var sampleToMut = {}, sampleToData = {};
			samples.forEach(function(d){ sampleToMut[d.name] = true; });

			datasets.forEach(function(d, j){
				var mutSamples = d.data_matrix_samples.filter(function(s){ return sampleToMut[s]; });
				genes.forEach(function(g, i){
					if (!(d._id in geneToDatasetToRow[g])) return;
					geneToDatasetToRow[g][d._id].row.forEach(function(n, k){
						// Ignore samples not mutated in the gene set
						if (!sampleToMut[d.data_matrix_samples[k]]) return;
						heatmap.cells.push({x: d.data_matrix_samples[k], y: g, value: n });
						sampleToData[d.data_matrix_samples[k]] = true;
					});
				});
			});

			// Add null for samples without expression data
			sampleNames.forEach(function(n){
				if (!sampleToData[n]){
					genes.forEach(function(g, i){
						heatmap.cells.push({x: n, y: g, value: null});
					});
				}
			});

			callback("", heatmap);
		}
	});// end DataMatrixRow.find
}// end createHeatmap

exports.createSampleAnnotationObject = function(datasets, samples){
	// Initialize the object that will hold all the data required to add sample annotations
	// to the mutation matrix
	var obj = { categories: [], sampleToAnnotations: {}, annotationToColor: {} };

	// Iterate through the datasets to make a list of all categories, and define a color
	// mapping for the annotations
	datasets.forEach(function(d){
		// Skip datasets without sample annotations
		if (!d.sample_annotations) return;

		// Extract the categories and define a color mapping for them
		var categories = Object.keys(d.sample_annotations[d.samples[0]]);
		categories.forEach(function(c){
			if (obj.categories.indexOf(c) == -1){
				obj.categories.push(c);
				obj.annotationToColor[c] = {};
			}
			if (d.annotation_colors && c in d.annotation_colors){
				Object.keys(d.annotation_colors[c]).forEach(function(s){
					obj.annotationToColor[c][s] = d.annotation_colors[c][s];
				});
			}
		});
	});
	if (obj.categories.length == 0) return {};

	// Now construct the annotations, one for each sample
	var sampleToInclude = {},
		annotationTypes = {};
	samples.forEach(function(s){ sampleToInclude[s.name] = true; });

	datasets.forEach(function(d){
		d.samples.forEach(function(s){
			if (!sampleToInclude[s]) return;
			// The annotations for a given sample are stored in a list
			obj.sampleToAnnotations[s] = [];
			obj.categories.forEach(function(c){
				// If the sample doesn't have this type of annotation, we still need
				// to record something since the annotations are stored as a list
				if (!d.sample_annotations || !d.sample_annotations[s])
					obj.sampleToAnnotations[s].push(null);
				else{
					obj.sampleToAnnotations[s].push(d.sample_annotations[s][c]);
					annotationTypes[d.sample_annotations[s][c]] = null;
				}
			});
		});
	});

	return obj;
}

// List of inactivating mutation types
var inactiveTys = ["frame_shift_ins", "nonstop_mutation", "nonsense_mutation",
				   "splice_site", "frame_shift_del"];

// Loads a SNVs into the database
exports.addDatasetFromFile = function(dataset, group_name, samples_file, snvs_file, cnas_file,
									  aberration_file, data_matrix_file, data_matrix_name,
									  annotation_color_file, cancer_input,
									  is_standard, color, user_id){
	// Load required modules
	var fs      = require( 'fs' ),
		Dataset = Database.magi.model( 'Dataset' ),
		MutGene = Database.magi.model( 'MutGene' ),
		Cancer = Database.magi.model( 'Cancer' ),
		domain  = require( "./domains" ),
		Q       = require( 'q' );

	// Make sure that either/both an SNV and CNA file were provided
	if (!(snvs_file || cnas_file || aberration_file || data_matrix_file)){
		console.log("addDatasetFromFile: at least one of the SNV, CNA, data matrix, or aberration files are *required*.")
		process.exit(1);
	}

	// Load the cancer types, their abbreviations, and their colors
	var datasetToColor = {},
		datasetToCancerName = {},
		datasetToCancer = {},
		abbrevToId = {},
		cancerToId = {};

	function loadCancers(){
		var d = Q.defer();
		Cancer.find({}, function(err, cancers){
			if (err) throw new Error(err);
			cancers.forEach(function(c){
				datasetToColor[c.abbr] = c.color;
				if (c.abbr){
					abbrevToId[c.abbr.toLowerCase()] = c._id;
					cancerToId[c.cancer.toLowerCase()] = c._id;
				}
			});
			d.resolve();
		});

		return d.promise;
	}

	// Load a mapping of dataset names to cancer abbreviations
	function createCancerMapping(){
		// Quick check to ensure all datasets map to a defined cancer _id
		// after this function has executed
		function ensureAllDatasetsMapToCancer(){
			datasets.forEach(function(db){
				if (!datasetToCancer[db]){
					console.log("Unknown cancer type: " + db);
					process.exit(1);
				}
			});
		}

		// Set up promise and either load the cancer file or map each
		// dataset to itself
		var d = Q.defer();
		if (!cancer_input){
			// Map each dataset to the lower case version of itself
			datasets.forEach(function(d){
				var dbLowName = d.toLowerCase();
				datasetToCancer[d] = abbrevToId[dbLowName];
				if (color){
					datasetToColor[d] = color;
				}
				else if (!(dbLowName in datasetToColor)){
					datasetToColor[d] = '#' + Math.floor(Math.random()*16777215).toString(16);
				}
				else{
					datasetToColor[d] = datasetToColor[dbLowName];
				}
			});
			ensureAllDatasetsMapToCancer();

			// Resolve the promise
			d.resolve();
		}
		else{
			fs.readFile(cancer_input, 'utf-8', function (err, data) {
				// If the input was not file path we assume it was a cancer type
				if (err){
					datasets.forEach(function(d){
						datasetToCancer[d] = abbrevToId[cancer_input.toLowerCase()];
						if (color){
							datasetToColor[d] = color;
						}
						else{
							datasetToColor[d] = datasetToColor[cancer_input.toLowerCase()];
						}
					});
				}
				else{
					// Load the lines, but skip the header (the first line)
					lines = data.trim().split('\n');
					lines.forEach(function(l){
						var arr = l.split("\t");
						datasetToCancer[arr[0]] = abbrevToId[arr[1].toLowerCase()];
						if (color){
							datasetToColor[arr[0]] = color;
						}
						else{
							datasetToColor[arr[0]] = datasetToColor[arr[1].toLowerCase()];
						}
					});
				}
				ensureAllDatasetsMapToCancer();

				// Resolve the promise
				d.resolve();
			});
		}
		return d.promise;
	}

	// Data structures to hold info about each sample and dataset
	var datasets = [],
		givenSampleList = true,
		sampleToDataset = {},
		datasetToSamples = {},
		sampleToAnnotations = {},
		annotationToColor = {};

	// Read in the sample file asynchronously.
	// The sample file comes in the following form
	// Sample\tDataset\tAnnotation1\tAnnotation2...
	// It can come either with any number of columns,
	// but column 1 is always required and column 2 is required
	// if there's a column 3, etc.
	function loadSampleFile(){
		// Set up promise
		var d = Q.defer();

		// Return if no sample file was provided
		if (!samples_file){
			givenSampleList = false;

			// Exit if a dataset wasn't provided since we need some sort of name
			if (!dataset){
				console.log("Dataset is required without sample list.")
				process.exit(1);
			}

			datasets = [ dataset ];

			d.resolve();
			return d.promise;
		}

		// Function to convert a string input to float *if it is numeric*
		function parseValue(val){
			if (!isNaN(val) && isFinite(val)) return val * 1.0;
			else return val;
		}

		fs.readFile(samples_file, 'utf-8', function (err, data) {
			// Exit if there's an error
			if (err) throw new Error(err);

			// Load the lines, ignoring any that start with '#'
			var lines = data.trim().split('\n').filter(function(l){
				return !(l.lastIndexOf('#', 0) === 0);
			});

			// If there are more than 2 columns, then annotation categories
			// make column headers 3+
			var header = lines[0].split('\t');
			if (header.length > 2) var categories = header.slice(2, header.length);
			else var categories = [];

			// Parse each line
			var sampleNames = {};
			lines.slice(1, lines.length).forEach(function(s){
				var arr = s.split("\t");
				if (arr.length > 1){
					// Sample is always stored in column 1, dataset is always stored in column 2
					sampleToDataset[arr[0]] = arr[1]; 
					if (!(arr[1] in datasetToSamples)) datasetToSamples[arr[1]] = [];
					datasetToSamples[arr[1]].push( arr[0] );

					// Then add any annotations there may be
					if (categories.length > 0){
						sampleToAnnotations[arr[0]] = {};
						categories.forEach(function(c, i){
							sampleToAnnotations[arr[0]][c] = parseValue(arr[2+i]);
						});
					}
				}
				else if(!dataset){
					console.log("No dataset name was provided so you must include the dataset in the sample mapping file.");
					process.exit(1);
				}
				sampleNames[arr[0]] = true;
			});

			// Extract the names of all the datasets
			datasets = Object.keys(datasetToSamples);

			// Make sure all samples have a name
			if (datasets.length == 0){
				if (dataset){
					datasets = [dataset];
					datasetToSamples[dataset] = [];
					Object.keys(sampleNames).forEach(function(s){
						sampleToDataset[s] = dataset;
						datasetToSamples[dataset].push( s );
					});
					if (color) datasetToColor[dataset] = color;
				}
				else if (datasets.length > 1){
					console.log("If sample datasets aren't provided, you must name your dataset.");
					process.exit(1);
				}
			}
			else if (datasets.length == 1 && color){
				datasetToColor[datasets[0].toLowerCase()] = color;
			}

			// Resolve the promise
			d.resolve();

		});

		return d.promise;
	}

	function loadAnnotationColorFile(){
		var d = Q.defer();
		// Return if no sample file was provided
		if (!annotation_color_file){
			d.resolve();
			return d.promise;
		}

		fs.readFile(annotation_color_file, 'utf-8', function (err, data) {
			// Exit if there's an error
			if (err) throw new Error(err);

			// Load the lines, ignoring any that start with '#'
			var lines = data.trim().split('\n').filter(function(l){
				return !(l.lastIndexOf('#', 0) === 0);
			});

			lines.forEach(function(l){
				var arr = l.split("\t");
				if (arr.length != 3){
					console.log("Each line in the annotationToColor file must be three tab-separated columns.")
					process.exit(1);
				}
				var category = arr[0],
					annotation = arr[1],
					color = arr[2];
				if (!(category in annotationToColor)) annotationToColor[category] = {};
				annotationToColor[category][annotation] = color;
			});
			d.resolve();
		});
		return d.promise;
	}

	function loadDataset(datasetName, samples, cnaLines, snvLines, aberrationLines, matrixLines){

		// Define globals to store the mutations
		var snvs = {},
			cnas = {},
			mutGenes = {},
			mutSamples = {},
			summary = {},
			mutationTypes = [],
			dataMatrixColHeaders = {},
			geneToDataRow = {};

		function recordMutation(gene, sample, mutClass){
			// Make sure the gene is initialized in both data structures
			if (!(gene in mutSamples)) mutSamples[gene] = {};
			if (!(gene in mutGenes))
				mutGenes[gene] = { snvs: {}, cnas: {}, inactivating: {}, mutated_samples: {}, fus: {}, amp: {}, del: {} };

			// Add the sample and the mutation class to the mutSamples data structure
			if (sample in mutSamples[gene] && mutSamples[gene][sample].indexOf(mutClass) == -1){
				mutSamples[gene][sample].push( mutClass );
			}
			else{
				mutSamples[gene][sample] = [ mutClass ];
			}

			// Record the gene as being mutated in the given sample
			mutGenes[gene].mutated_samples[sample] = true;
		}

		function loadAberrations(){
			aberrationLines.forEach(function(l){
				// Extract the fields
				var fields = l.trim().split('\t'),
					sample   = fields[0],
					mutations = fields.slice(1, fields.length);

				// Record the mutations
				var mutClass = "other";
				mutations.forEach(function(gene){
					recordMutation(gene, sample, mutClass);
				});
			});
		}

		function loadDataMatrix(){
			if (matrixLines.length == 0) return;

			// Parse the header
			var arr = matrixLines[0].split("\t");
			dataMatrixColHeaders = arr.slice(1, arr.length);

			matrixLines.slice(1, matrixLines.length).forEach(function(l){
				// Extract the fields
				var fields = l.trim().split('\t'),
					gene = fields[0],
					scores = fields.slice(1, fields.length).map(function(n){ return n*1.; });
					geneToDataRow[gene] = scores;
			});
		}

		function loadCNAs(){
			// Set up promise
			var d = Q.defer();

			// If a CNA file wasn't provided, resolve the promise
			if (cnaLines.length == 0) d.resolve();

			// Parse the mutations into a hash from gene to transcripts' mutations
			cnaLines.forEach(function(l){
				// Extract the fields
				var fields = l.trim().split('\t'),
					gene   = fields[0],
					sample = fields[1],
					cnaTy  = fields[2] == "AMP" ? "amp" : fields[2] == "DEL" ? "del" : "fus",
					start  = fields[3],
					end    = fields[4];
				// Record the CNA if a start/end were provided
				if (start != "" && end != ""){
					var mut = { dataset: sampleToDataset[sample], ty: cnaTy, sample: sample,
					            start: start * 1, end: end * 1 };

					// Append the mutation to the list of mutations in the
					// current gene
					if (!(gene in cnas)) cnas[gene] = {segments: {}};
					if (!(sample in cnas[gene])) cnas[gene].segments[sample] = [];
					cnas[gene].segments[sample].push( mut );
				}

				// Record the mutated sample
				recordMutation(gene, sample, cnaTy);
				mutGenes[gene].cnas[sample] = true;
				mutGenes[gene][cnaTy.toLowerCase()][sample] = true;

			});

			// Load locations of each gene and find their neighbors 
			var Gene = Database.magi.model( 'Gene' );
			// console.log(Object.keys(cnas["AKR1C2"].segments))
			// Object.keys(cnas["AKR1C2"].segments).forEach(function(s){
			// 	console.log("AKR1C2 " + s)
			// 	console.log(cnas["AKR1C2"].segments[s])
			// })
			Gene.find({name: {$in: Object.keys(cnas)}}, function (err, genes){
				if (err) throw new Error(err);
				Q.allSettled( genes.map(function(g){
					var d2 = Q.defer();

					// Find the min/max segment locations for the current gene
					var minSegX = Number.MAX_VALUE,
						maxSegX = 0,
						cnaSamples = cnas[g.name].segments,
						segments = [];

					Object.keys(cnaSamples).forEach(function(s){
						// console.log(g.name, s)
						var segs = cnaSamples[s];
						segments.push( {sample: s, segments: segs} );
						segs.forEach(function(seg){
							minSegX = Math.min(minSegX, seg.start);
							maxSegX = Math.max(maxSegX, seg.end);
						});
					});

					// Add the gene's region information
					cnas[g.name].region = { chr: g.chr, minSegX: minSegX, maxSegX: maxSegX };
					cnas[g.name].segments = segments;

					// Find the gene's neighbors that are overlap the segments assigned to that gene
					// (with a small boundary on either side)
					var segWidthBoundary = Math.round(0.1 * (maxSegX - minSegX));
					Genome.getGenesinRange(g.chr, minSegX - segWidthBoundary, maxSegX + segWidthBoundary, function (err, neighbors){
						if(err) console.log(err);
						cnas[g.name].neighbors = neighbors;
						d2.resolve();
					});
					return d2.promise;
				})).then(function(){ d.resolve(); });
			});

			return d.promise;
		}


		// Read in the SNVs file asynchronously
		function loadSNVs(){
			snvLines.forEach(function(l){
				// Extract the fields
				var fields = l.trim().split('\t'),
					gene       = fields[0],
					sample     = fields[1],
					transcript = fields[2],
					length     = fields[3],
					locus      = fields[4],
					mutTy      = fields[5],
					aao        = fields[6],
					aan        = fields[7];

				// Create the mutation
				var mut = { sample: sample, dataset: sampleToDataset[sample], locus: locus,
				            aan: aan, aao: aao, ty: mutTy };

				// Append the mutation to the list of mutations in the
				// current gene
				if (mutTy && mutTy != '--'){
					if (!(gene in snvs)) snvs[gene] = {};

					// Only add the transcript mutations if the transcript is defined
					if (transcript && transcript != '--'){
						if (!(transcript in snvs[gene])){
							// Create a new null transcript, including the relevant domains
							var transcript_info = { mutations: [], length: length * 1 };
							snvs[gene][transcript] = transcript_info;
						}

						snvs[gene][transcript].mutations.push( mut );
					}

					// Record the mutation type
					var mutTy = mutTy.toLowerCase(), //lowercase so case doesn't matter
						mutClass = mutTy && inactiveTys.indexOf(  mutTy ) != -1 ? "inactive_snv" : "snv";

					if (mutationTypes.indexOf(mutTy) === -1){
						mutationTypes.push( mutTy );
					}

					// Record the mutated sample
					recordMutation(gene, sample, mutClass);

					if (!(mutTy in mutGenes[gene])) mutGenes[gene][mutTy] = {};

					mutGenes[gene].snvs[sample] = true;
					mutGenes[gene][mutTy][sample] = true;

					if (mutClass == "inactive_snv") mutGenes[gene].inactivating[sample] = true;
				}
			});
		}

		function computeSummary(){
			// Set up promise
			console.log(datasetName + " summary:")
			var promise = Q.defer();
			var num_samples = samples.length,
				num_snvs = 0,
				num_cnas = 0,
				num_mutated_genes,
				most_mutated_genes,
				most_mutated_gene_sets,
				muation_plot_data;

			function numMutatedSamples(sampleToMut){ return sampleToMut ? Object.keys(sampleToMut).length : 0; }
			function isInactivating(mut){ return inactiveTys.indexOf(  mut.ty.toLowerCase() )}
			function dist(x, y){ return x * x + y * y; } // distance from the origin

			// Count the number of mutated genes in the dataset
			var genes = Object.keys(mutGenes);
			num_mutated_genes = genes.length;
			console.log("\tNo. mutated genes:", num_mutated_genes);
			var genes = genes.map(function(g){
				var snvSamples = mutGenes[g] ? numMutatedSamples(mutGenes[g].snvs) : 0,
					cnaSamples = mutGenes[g] ? numMutatedSamples(mutGenes[g].cnas) : 0;
				num_snvs += snvSamples;
				num_cnas += cnaSamples;
				return { name: g, snvs: snvSamples, cnas: cnaSamples };
			});
			console.log("\tNo. SNVs:", num_snvs);
			console.log("\tNo. CNAs:", num_cnas);

			// Extract the 100 most mutated genes
			genes = genes.sort(function(a, b){ return dist(a.snvs, a.cnas) > dist(b.snvs, b.cnas) ? -1 : 1; })
				.slice(0, Math.min(500, genes.length))
				.map(function(g){
					var d = mutGenes[g.name];
					return {
								name: g.name,
								cnas: g.cnas,
								snvs: g.snvs,
								mutated_samples: numMutatedSamples(d.mutated_samples),
								inactivating: numMutatedSamples(d.inactivating)
							}
				});
			most_mutated_genes = genes.slice(0, Math.min(genes.length, 100));

			// Create the data for the mutation plot
			mutation_plot_data = {};
			genes.forEach(function(d){
				mutation_plot_data[d.name] = 	{ 
													cnas: d.cnas,
													snvs: d.snvs,
													mutated_samples: d.mutated_samples,
													inactivating: d.inactivating
												};
				mutationTypes.forEach(function(ty){
					mutation_plot_data[d.name][ty] = numMutatedSamples(mutGenes[d.name][ty]);
				});
			});

			// Find the most mutated pathways/complexes
			function numMutations(geneset, ty){
				var mutatedSamples = {};
				for (var i = 0; i < geneset.length; i++){
					if (mutGenes[geneset[i]]){
						for (var s in mutGenes[geneset[i]][ty]){
							mutatedSamples[s] = true;
						}
					}
				}
				return numMutatedSamples(mutatedSamples);
			}

			var GeneSet = Database.magi.model( 'GeneSet' );
			GeneSet.find({}, function(err, genesets){
				// Throw err if necessary
				if (err) throw new Error(err);

				// Sort the genesets by the number of their mutations, and report the first twenty
				var genesets = genesets.map(function(S){
					var d = {
						name: S.description,
						database: S.database,
						num_genes: S.genes.length,
						mutated_samples: numMutations(S.genes, "mutated_samples"),
						cnas: numMutations(S.genes, "cnas"),
						snvs: numMutations(S.genes, "snvs"),
						inactivating: numMutations(S.genes, "inactivating"),
					};

					// Find the top 5 most mutated genes
					var mutatedGenes = S.genes.filter(function(g){
						return mutGenes[g] ? numMutatedSamples(mutGenes[g].mutated_samples) > 0 : false;
					})
					.sort(function(a, b){
						var x = mutGenes[a] ? numMutatedSamples(mutGenes[a].mutated_samples) : 0,
							y = mutGenes[b] ? numMutatedSamples(mutGenes[b].mutated_samples) : 0;
						return x < y ? 1 : -1;
					});
					d.top_genes = mutatedGenes.slice(0, Math.min(5, mutatedGenes.length)).join(",");
					return d;
				});

				// Create the objects to represent the most mutated gene sets
				genesets.filter(function(S){ return S.mutated_samples > 0; }).sort(function(a, b){ return a.mutated_samples < b.mutated_samples ? 1 : -1; });
				most_mutated_gene_sets = genesets.slice(0, Math.min(genesets.length, 20));

				// Update the summary
				summary = {
					most_mutated_genes: most_mutated_genes,
					most_mutated_gene_sets: most_mutated_gene_sets,
					num_samples: num_samples,
					num_mutated_genes: num_mutated_genes,
					num_snvs: num_snvs,
					num_cnas: num_cnas,
					mutation_plot_data: mutation_plot_data
				};

				promise.resolve();
			});

			return promise.promise;
		}

		// Save the dataset
		function createDataset(){
			// Set up promise
			var d = Q.defer();

			// Transform mutation data into SNV schema format
			var mutGenes = [];
			for (var g in mutSamples){
				// Create the object we want to insert
				var Gene = { gene: g, mutated_samples: mutSamples[g],
					         snvs: {}, cnas: {} };

				if (g in snvs) Gene.snvs = snvs[g];
				if (g in cnas) Gene.cnas = cnas[g];

				mutGenes.push( Gene );
			}

			// Formulate queries and updates for the datbase
			var query = { title: datasetName, group: group_name, is_standard: is_standard },
				newDataset  = {
					title: datasetName,
					samples: samples, // samples from input sample list
					sample_annotations: sampleToAnnotations,
					annotation_colors: annotationToColor,
					group: group_name,
					updated_at: Date.now(),
					summary: summary,
					is_standard: is_standard,
					user_id: user_id,
					color: datasetToColor[datasetName],
					cancer_id: datasetToCancer[datasetName],
					data_matrix_samples: dataMatrixColHeaders,
					data_matrix_name: data_matrix_name
				};

			// Include the user_id if it was provided
			if (user_id) query.user_id = user_id;

			// Use the data matrix samples if no other data was provided
			if (newDataset.samples.length == 0 && newDataset.data_matrix_samples){
				newDataset.samples = newDataset.data_matrix_samples;
			}

			// Find the dataset
			Dataset.remove(query, function(err){
				if (err) throw new Error(err);

				Dataset.create( newDataset, function(err, newDataset){
					if (err) throw new Error(err);

					// Create the data matrix, and map it to the dataset
					var DataMatrixRows = Database.magi.model( 'DataMatrixRow' );
					var rows = Object.keys(geneToDataRow).map(function(g){
						return {gene: g, dataset_id: newDataset._id, row: geneToDataRow[g], updated_at: Date.now() };
					});

					DataMatrixRows.create(rows, function(err, M){
						if (err) throw new Error(err);

						// Update the MutGene data to include the dataset ID
						mutGenes.forEach(function(g){ g.dataset_id = newDataset._id; })

						// Remove any previous MutGenes associated with the dataset
						MutGene.remove({dataset_id: newDataset._id}, function(err){
							if (err) throw new Error(err);

							// Finally, create mutated genes
							MutGene.create(mutGenes, function(err, res){
								if (err) throw new Error(err);
								d.resolve();
							});
						});
					});
				});
			});


			return d.promise;
		}

		// Load the synchronous aberrations and SNVs
		loadAberrations();
		loadSNVs();
		loadDataMatrix();

		// Then load the CNAs, compute the summary, and create the dataset
		return loadCNAs().then( computeSummary ).then( createDataset );

	}

	function loadMatrix(filepath, fileType, sampleIndex, callback){
		var datasetToLines = {};
		datasets.forEach(function(db){
			datasetToLines[db] = [];
			if (!givenSampleList && !(db in datasetToSamples)){
				datasetToSamples[db] = [];
			}
		});

		// Return an empty array for each dataset if a filepath wasn't provided
		if (!filepath){
			callback("", datasetToLines);
			return;
		}

		fs.readFile(filepath, 'utf-8', function (err, data) {
			// Exit if there's an error, else callback
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			var lines = data.trim().split('\n');

			// Make sure there're some lines in the file
			if (lines.length <= 1){
				console.log("Empty " + fileType + " file (requires header). Exiting.")
				process.exit(1);
			}

			// Parse the header line
			var arr = lines[0].trim().split("\t"),
				header = arr.slice(1, arr.length),
				dbToIndices = {};

			if (givenSampleList){
				datasets.forEach(function(db){
					dbToIndices[db] = [];
					datasetToLines[db].push("");
				});
				Object.keys(sampleToDataset).forEach(function(s){
					var i = header.indexOf(s);
					if (i != -1){
						dbToIndices[sampleToDataset[s]].push(i+1);
						datasetToLines[sampleToDataset[s]][0] += "\t" + s;
					}
				});
			}
			else{
				dbToIndices[dataset] = [];
				datasetToLines[dataset].push("");
				var i = 1; //start at one since the first column is the gene
				header.forEach(function(s){
					dbToIndices[dataset].push(i);
					datasetToLines[dataset][0] += "\t" + s;
					i += 1;
				})
			}

			lines.slice(1, lines.length).forEach(function(l){
				// Skip lines that start with '#'
				if (l.lastIndexOf('#', 0) === 0){ return; }

				var arr = l.trim().split("\t");

				datasets.forEach(function(db){
					var newArr = [arr[0]];
					dbToIndices[db].forEach(function(i){
						newArr.push(arr[i]);
					});
					datasetToLines[db].push( newArr.join("\t") );
				});
			});

			// Execute the callback
			callback("", datasetToLines);
		});
	}

	function loadMutationFile(filepath, fileType, sampleIndex, callback){
		// Initialize each dataset with an empty array
		var datasetToLines = {};
		datasets.forEach(function(db){
			datasetToLines[db] = [];
			if (!givenSampleList && !(db in datasetToSamples)){
				datasetToSamples[db] = [];
			}
		})

		// Return an empty array for each dataset if a filepath wasn't provided
		if (!filepath){
			callback("", datasetToLines);
			return;
		}

		fs.readFile(filepath, 'utf-8', function (err, data) {
			// Exit if there's an error, else callback
			if (err) throw new Error(err);

			// Load the lines, but skip the header (the first line)
			var lines = data.trim().split('\n');

			// Make sure there're some lines in the file
			if (lines.length == 0){
				console.log("Empty " + fileType + " file. Exiting.")
				process.exit(1);
			}

			lines.forEach(function(l){
				// Parse the sample from the line
				var sample = l.trim().split("\t")[sampleIndex];

				// Skip lines that start with '#'
				if (l.lastIndexOf('#', 0) === 0){ return; }

				// Skip samples not in the whitelist
				if (givenSampleList){
					if (!(sample in sampleToDataset)) return;
				}
				else{
					sampleToDataset[sample] = dataset;
					if (datasetToSamples[dataset].indexOf(sample) == -1){
						datasetToSamples[dataset].push( sample );
					}
				}

				// Assign the line to the current dataset
				datasetToLines[sampleToDataset[sample]].push( l );
			});

			// Execute the callback
			callback("", datasetToLines);
		});
	}

	function splitDatasets(){
		// Set up promise
		var d = Q.defer();

		loadMutationFile(snvs_file, "SNV", 1, function(err, datasetToSNVLines){
			loadMutationFile(cnas_file, "CNA", 1, function(err, datasetToCNALines){
				loadMutationFile(aberration_file, "aberrations", 0, function(err, datasetToAberrationLines){
					loadMatrix(data_matrix_file, "matrix", 0, function(err, datasetToMatrixLines){
						if (data_matrix_file && !data_matrix_name){
							console.log("Data matrix name is required when passing in a data matrix file.");
							process.exit(1);
						}
						var funcs = datasets.map(function(datasetName){
							var samples = datasetToSamples[datasetName],
								snvLines = datasetToSNVLines[datasetName],
								cnaLines = datasetToCNALines[datasetName],
								aberrationLines = datasetToAberrationLines[datasetName],
								matrixLines = datasetToMatrixLines[datasetName];

								return function(){ return loadDataset( datasetName, samples, cnaLines, snvLines, aberrationLines, matrixLines ) };
						});
						funcs.push( function(){ d.resolve(); } )
						return funcs.slice(1, funcs.length).reduce(Q.when, Q(funcs[0]()))
					});
				});
			});	
		});
		return d.promise;
	}

	return loadCancers().then( loadSampleFile ).then( loadAnnotationColorFile).then( createCancerMapping ).then( splitDatasets );

}