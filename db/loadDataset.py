#!/usr/bin/env python

# Load required modules
import sys, os, argparse, json, datetime, urllib2, shutil
from collections import defaultdict
import tarfile, tempfile, gzip
pathsToDelete = set()

# Set up the connection to the MongoDB database
from pymongo import MongoClient
from bson.objectid import ObjectId

dbHost = os.getenv("MONGO_HOST") or "localhost"
dbName = os.getenv("MONGO_DB_NAME") or "magi"
client = MongoClient("mongodb://" + dbHost + ":27017/" + dbName)
db = client[dbName]
print "Connected to mongodb://{}:27017/{}".format(dbHost, dbName)

# Make a dictionary of cancers to their IDs, so we can validate
# the cancer passed as an argument
cancers = list(db.cancers.find())
cancerToId = dict( (c['abbr'], c['_id']) for c in cancers )
cancerToColor = dict( (c['abbr'], c['color']) for c in cancers )

###############################################################################
# Constants
cnaTypes = set(["del", "amp", "fus", "cna"])
snvTypes = set(["snv", "inactive_snv"])
inactiveTys = set(["frame_shift_ins", "nonstop_mutation", "nonsense_mutation",
  				   "splice_site", "frame_shift_del"])
mutationMatrixTypes = set(["del", "amp", "fus", "snv", "inactive_snv"])

###############################################################################
# Utility functions

# Load files either from URL or locally
def is_url(filename):
	return filename.lower().startswith("http://") or filename.lower().startswith("https://")

def load_file(filename):
	if is_url(filename):
		response = urllib2.urlopen(filename)
		return response.read().split("\n")
	else:
		with open(filename) as f:
			return f.readlines()

#
def load_file_to_tmp(filename, needs_dir=False):
	# Determine whether the file should be read as binary (if it's a tarball),
	# or as text
	url = filename.lower()
	if url.endswith(".tar"):
		suffix = ".tar"
		mode = 'wb'
	elif url.endswith(".gz"):
		suffix = ".gz"
		mode = 'wb'
	else: # we'll pretend it's a text file
		suffix = ".txt"
		mode = 'w'

	# Create a temporary file to copy the input file to
	isURL = is_url(filename)
	if isURL:
		_, tmp = tempfile.mkstemp(suffix=suffix)
		pathsToDelete.add(tmp)
		with open(tmp, mode) as outfile:
			response = urllib2.urlopen(filename)
			outfile.write(response.read())
	else:
		tmp = filename

	# Then load the tar or GZIP file
	tmpDir = tempfile.mkdtemp()
	pathsToDelete.add(tmpDir)
	if suffix == ".txt":
		return tmp
	elif suffix == ".gz":
		_, tmp2 = tempfile.mkstemp(suffix='.txt')
		f = gzip.open(tmp, 'rb')
		fileContent = f.read()
		f.close()
		pathsToDelete.add(tmp2)
		with open(tmp2, 'w') as outfile2: outfile2.write(fileContent)
		return tmp2
	elif suffix == ".tar":
		if not tarfile.is_tarfile(tmp):
			raise IOError("Not a valid TAR file.")
		else:
			# Extract the tar file
			tar = tarfile.open(tmp)
			tar.extractall(path=tmpDir)
			tar.close()

		# Either take the first file, or return the directory
		if needs_dir:
			return tmpDir
		else:
			return tmpDir + "/" + os.listdir(tmpDir)[0]

# Load the file, split it on tabs, and restrict to the rows in the whitelist
def load_split_restrict_file(filename, sampleWhitelist, sampleIndex):
	# Load the SNV file and restrict to those mutations occurring
	# in samples in the whitelist (if a whitelist was provided)
	arrs = [ l.rstrip().split("\t") for i, l in enumerate(load_file(filename))
			 if i == 0 or not l.startswith("#") ] # always keep the first line
	arrs.pop(0) # skip the header, even if it wasn't commented out
	if sampleWhitelist:
		# Skip lines where the sampleIndex would be out of bounds anyway
		# (It's len(arr) > sampleIndex instead of >= because indexing starts at 0)
		arrs = [ arr for arr in arrs if len(arr) > sampleIndex and arr[sampleIndex] in sampleWhitelist]
	return arrs

# Return true or false based on whether the argument can be converted
# to an integer
def is_int(num):
	try:
		int(num)
		return True
	except (ValueError, TypeError):
		return False

# Return true or false based on whether the argument can be converted
# to a float
def is_float(num):
	try:
		float(num)
		return True
	except (ValueError, TypeError):
		return False

# Return whether or not an SNV is inactivating
def is_inactivating(ty): return ty.lower() in inactiveTys

###############################################################################
# Parse MAGI file types
def load_sample_file(filename):
	lines = load_file(filename)
	arrs = [ l.rstrip().split("\t") for l in lines if not l.startswith("#") ]
	header = arrs.pop(0)
	samples = [ arr[0] for arr in arrs ]

	# Load the annotations if they were provided
	if len(header) > 1:
		categories = header[1:]
		numCategories = len(categories)
		def replace_blank(xs):
			return [ x if x != "" else None for x in xs ] + [None] * (numCategories-len(xs))

		sampleToAnnotations = dict( (arr[0], dict(zip(categories, replace_blank(arr[1:])))) for arr in arrs )
	else:
		categories, sampleToAnnotations = [], dict()

	if "Dataset" in categories:
		categories.remove("Dataset")
		for s, annotations in sampleToAnnotations.iteritems():
			del sampleToAnnotations[s]["Dataset"]

	return samples, categories, sampleToAnnotations

def load_annotation_color_file(filename, categories):
	lines = load_file(filename)
	annotationToColor = dict( (c, {}) for c in categories)
	for l in lines:
		if l.startswith("#"): continue
		arr = l.rstrip().split("\t")
		if arr[0] in annotationToColor:
			annotationToColor[arr[0]][arr[1]] = arr[2]
	return annotationToColor

def load_snv_file(filename, dataset, sampleToMuts, geneToCases, sampleWhitelist):
	# Create a map of genes to transcripts to SNVs
	arrs = load_split_restrict_file(filename, sampleWhitelist, 1)
	snvs = defaultdict(lambda : defaultdict(lambda : dict(mutations=[])))
	numSNVs = 0
	for arr in arrs:
		# Check if the line is long enough, and pad it with blanks
		# if it isn't
		if len(arr) < 2: continue
		if len(arr) < 8: arr += ["--"] * (8-len(arr))
		gene, sample, transcript, transcriptLength, locus, mutTy, aao, aan = arr

		mutClass = "snv"
		if (transcript != "--" and mutTy != "--" and is_int(locus) and is_int(transcriptLength)):
			mut = dict( sample=sample, dataset=dataset, locus=int(locus),
				         aan=aan, aao=aao, ty=mutTy )
			snvs[gene][transcript]['length'] = int(transcriptLength)
			snvs[gene][transcript]['mutations'].append(mut)
			mutClass = "inactive_snv" if is_inactivating(mutTy) else "snv"
			geneToCases[gene][sample].add( mutTy )
		sampleToMuts[sample].add( gene )
		geneToCases[gene][sample].add( mutClass )
		numSNVs += 1

	return snvs, numSNVs

def load_cna_file(filename, dataset, sampleToMuts, geneToCases, sampleWhitelist):
	# Create a mapping of genes to samples to segments
	arrs = load_split_restrict_file(filename, sampleWhitelist, 1)
	cnas = defaultdict(lambda: dict(segments=defaultdict(list)))
	numCNAs = 0
	for arr in arrs:
		# We skip rows that don't have both genes and samples, and fill
		# in missing columns with None
		if len(arr) < 2: continue
		if len(arr) < 5: arr += [None] * (5-len(arr))

		# Record the current segment
		gene, sample, cnaTy, start, end = arr
		cnaTy = cnaTy.lower()
		if is_int(start) and is_int(end):
			mut = dict(dataset=dataset, ty=cnaTy, sample=sample, start=int(start), end=int(end))
			cnas[gene]['segments'][sample].append( mut )

		# Record the given gene as mutated as a generic "cna" unless
		# a CNA type was provided
		geneToCases[gene][sample].add( cnaTy if cnaTy else "cna" )
		sampleToMuts[sample].add(gene)
		numCNAs += 1

	for g, d in cnas.iteritems():
		d['segments'] = [ dict(sample=sample, segments=d['segments'][sample]) for sample in d['segments']]

	return cnas, numCNAs

def load_aberrations_file(filename, aberrationType, dataset, sampleToMuts,
						  geneToCases, sampleWhitelist):
	# Record the aberrations in each sample
	arrs = load_split_restrict_file(filename, sampleWhitelist, 0)
	geneToAberrations = defaultdict(set)
	for arr in arrs:
		if len(arr) < 2: continue
		sample, muts = arr[0], set(arr[1:])
		sampleToMuts[sample] |= muts
		for gene in muts:
			geneToCases[gene][sample].add(aberrationType)
			geneToAberrations[gene].add(sample)

	return geneToAberrations

def load_data_matrix_file(filename, sampleWhitelist):
	lines = load_file(filename)
	arrs = [ l.rstrip().split("\t") for i, l in enumerate(lines) if i == 0 or not l.startswith("#")]
	header = arrs.pop(0)[1:]
	n = len(header) + 1
	if sampleWhitelist:
		samples = sampleWhitelist
		indices = [ i for i, s in enumerate(header) if s in sampleWhitelist ]
	else:
		samples = set(header)
		indices = range(len(header))
	geneToDataRow = dict()
	for arr in arrs:
		if len(arr) < 2: continue
		if len(arr) < n: arr += [None] * (n-len(arr))
		geneToDataRow[arr[0]] = [ float(arr[1+i]) if is_float(arr[1+i]) else None for i in indices]
	return geneToDataRow, samples

###############################################################################
# Functions for interacting with MongoDB to retrieve information
# that we load with the dataset

# Add the neighbors to the given CNAs
def add_neighbors(cnas):
	# For each gene with CNAs, find the neighbors of that gene that lie between
	# the extent of the segments overlapping the gene
	for gene in db.genes.find({"name": {"$in": cnas.keys()}}):
		g = gene['name']

		# Find the boundaries
		segs = [ seg for s in cnas[g]['segments'] for seg in s['segments'] ]
		minSegX = min( seg['start'] for seg in segs )
		maxSegX = max( seg['end'] for seg in segs )
		segWidthBoundary = round(0.1 * (maxSegX - minSegX))

		# Construct a query to load the neighbors
		query = dict(chr=gene['chr'],
					 start={ "$gt": minSegX - segWidthBoundary },
					 end={"$lt": maxSegX + segWidthBoundary} )
		cnas[g]['neighbors'] = list(db.genes.find(query, {"_id": False}))
		cnas[g]['region'] = dict(chr=gene['chr'], minSegX=minSegX, maxSegX=maxSegX)

# Load the transcripts from MongoDB
def load_transcripts(transcriptFile):
	db.transcripts.find()
	with open(transcriptFile) as f:
		return json.load(f)

###############################################################################
# Functions for loading SNV/CNA/aberration/data matrix/sample files

# Wrapper for loading the sample annotation and annotation color file,
# or to just return blank data structures
def load_samples(sample_annotation_file, annotation_color_file):
	# Load the sample file (if provided)
	if (sample_annotation_file):
		# Load the samples and sample annotations (if provided)
		samples, categories, sampleToAnnotations = load_sample_file(sample_annotation_file)
		sampleWhitelist = set(samples)
		sampleToMuts = dict( (s, set()) for s in sampleWhitelist)

		# If we're given a sample file then we need to try and load the
		# annotation colors
		if (len(categories) > 0 and annotation_color_file):
			annotationToColor = load_annotation_color_file(annotation_color_file, categories)
		else:
			annotationToColor = dict( (c, {}) for c in categories )
	else:
		samples, categories, sampleToAnnotations, annotationToColor, sampleWhitelist = None, None, None, None, None
		sampleToMuts = defaultdict(set)

	return samples, categories, sampleToAnnotations, annotationToColor, sampleWhitelist, sampleToMuts

# Wrapper to load SNVs file
def load_snvs(snvFile, snvFileType, dataset, sampleToMuts, geneToCases, sampleWhitelist):
	if snvFile:
		if snvFileType == 'MAGI':
			snvs, numSNVs = load_snv_file(snvFile, dataset, sampleToMuts, geneToCases, sampleWhitelist)
		else:
			from mafToTSV import parse_maf, transcriptFile
			filename = load_file_to_tmp(snvFile)
			dbToTranscripts = load_transcripts(transcriptFile)
			snvs, numSNVs = parse_maf( filename, dbToTranscripts, dataset, sampleToMuts,
										   geneToCases, sampleWhitelist, inactiveTys )
	else:
		snvs, numSNVs = {}, 0

	return snvs, numSNVs

# Wrapper to load the CNA file
def load_cnas(cnaFile, cnaFileType, dataset, sampleToMuts, geneToCases, sampleWhitelist,
			  ampCutoff, delCutoff, CNAConsistencyThreshold, rangeCNA):
	if (cnaFile):
		if cnaFileType == 'MAGI':
			cnas, numCNAs = load_cna_file(cnaFile, dataset, sampleToMuts, geneToCases, sampleWhitelist)
		elif cnaFileType == 'GISTIC2':
			# GISTIC2 requires a tarball. So verify that there is a tarball, then
			# untar it to a temporary directory
			cnaDir = load_file_to_tmp(cnaFile, needs_dir=True)
			print cnaDir

			# Parse the CNAs
			from gistic2ToTSV import parse_gistic2
			cnas, numCNAs = parse_gistic2(cnaDir, dataset, ampCutoff, delCutoff,
										  CNAConsistencyThreshold, rangeCNA, sampleToMuts,
										  geneToCases, sampleWhitelist)

		# Identify the neighbors of each gene with CNAs
		add_neighbors(cnas)

	else:
		cnas, numCNAs = {}, 0

	return cnas, numCNAs

# Wrapper to load the aberrations file or return a blank data structure
def load_aberrations(aberrationsFile, aberrationType, dataset, sampleToMuts,
					 geneToCases, sampleWhitelist):
	if (aberrationsFile):
		aberrations = load_aberrations_file(aberrationsFile, aberrationType,
			dataset, sampleToMuts, geneToCases, sampleWhitelist)
		mutationMatrixTypes.add(aberrationType)
	else:
		aberrations = {}
	return aberrations

# Wrapper to load the data matrix or return blank data structures
def load_data_matrix(dataMatrixFile, sampleWhitelist):
	if dataMatrixFile:
		dataMatrix, dataMatrixSamples = load_data_matrix_file(dataMatrixFile, sampleWhitelist)
	else:
		dataMatrix, dataMatrixSamples = None, None
	return dataMatrix, dataMatrixSamples

###############################################################################
#
def identify_mutations_in_samples(samples, snvs, cnas, aberrations):
	# Initialize the dictionary of samples to mutations
	sampleToMutations = dict( (s, defaultdict(list)) for s in samples )

	def sample_mutation_type(mut):
		mut = mut.lower()
		if mut.startswith("missense"): return "missense"
		elif mut.startswith("nonsense"): return "nonsense"
		elif mut.startswith("amp"): return "amp"
		elif mut.startswith("del"): return "del"
		else: return mut

	# Load SNVs (if necessary)
	if snvs:
		for g, transcriptToMutations in snvs.iteritems():
			for t, d in transcriptToMutations.iteritems():
				for m in d['mutations']:
					mutation = { "gene": g, "class": "snv", "type": sample_mutation_type(m['ty']) }
					mutation['change'] = "p.{}{}{}".format(m['aao'], m['locus'], m['aan'])
					sampleToMutations[m['sample']][g].append( mutation )

	# Load CNAs (if necessary)
	if cnas:
		for g, datum in cnas.iteritems():
			for d in datum['segments']:
				sampleTys = set()
				for s in d['segments']:
					if s['ty'] not in sampleTys:
						mutation = { "gene": g, "class": "cna", "type": sample_mutation_type(s['ty']) }
						sampleToMutations[s['sample']][g].append( mutation )
						sampleTys.add( s['ty'] )

	# Load generic aberrations (if necessary)
	if aberrations:
		pass # TO-DO: add this later


	# Flatten the data structure
	sampleToMutations = dict( (s, [ dict(name=g, mutations=sampleToMutations[s][g]) for g in datum.keys() ])
							  for s, datum in sampleToMutations.iteritems())

	return sampleToMutations

###############################################################################
# Parse arguments
def get_parser():
	# Parse arguments
	desc = "Load a dataset into MAGI."
	parser = argparse.ArgumentParser(description=desc)

	# Metadata
	parser.add_argument('-c', '--cancer', required=True, type=str, choices=cancerToId.keys(),
		help='Cancer name (lowercase).')
	parser.add_argument('-dn', '--dataset_name', required=True, type=str,
		help='Name for this dataset in MAGI.')
	parser.add_argument('-gn', '--group_name', default=None, required=False, type=str,
		help='Add this dataset to a particular group.')
	parser.add_argument('-col', '--color', required=False, default=None,
		help='Color (hex) for this dataset. Default is the default for the given cancer type.')
	parser.add_argument('--is_public', required=False, default=False, action='store_true',
		help='Flag that this should be a public dataset.')
	parser.add_argument('--user_id', required=False, default=None,
		help='User ID to associate with this dataset.')

	# SNVs
	parser.add_argument('-sf', '--snv_file', required=False, type=str, default=None,
		help='Path (or URL) to input SNV file.')
	parser.add_argument('-sft', '--snv_file_type', default='MAGI', type=str,
		choices=["MAF", "MAGI"], help='SNV file type.')

	# CNAs
	parser.add_argument('-cf', '--cna_file', required=False, type=str, default=None,
		help='Path (or URL) to input CNA file.')
	parser.add_argument('-cft', '--cna_file_type', default='MAGI', type=str,
		choices=["GISTIC2", "MAGI"], help='CNA File type.')
	parser.add_argument('-ac', '--amp_cutoff', default=0.3, type=float,
    	help='Amplification changes to be considered.')
	parser.add_argument('-dc', '--del_cutoff', default=-0.3, type=float,
		help='Deletion changes to be considered.')
	parser.add_argument('-cct', '--cna_consistency_threshold', default=0.75,
		type=float, help='CNA cna_consistency_threshold to be considered.')
	parser.add_argument('-range', '--range_cna', default=500000, type=int,
		help='Tolerant range of CNA are included in the browser.')

	# Data matrix
	parser.add_argument('-dmf', '--data_matrix_file', required=False, type=str, default=None,
		help='Path (or URL) to input data matrix file.')
	parser.add_argument('-mn', '--matrix_name', required=False, default="",
		help='Name of data stored in data matrix.')

	# Generic aberrations file
	parser.add_argument('-af', '--aberrations_file', required=False, type=str, default=None,
		help='Path (or URL) to input aberrations file.')
	parser.add_argument('-at', '--aberration_type', required=False,
		default="Other", type=str, help='Name of aberration type stored in aberration file.')

	# Sample annotation file
	parser.add_argument('-saf', '--sample_annotation_file', required=False, type=str, default=None,
		help='Path (or URL) to input sample file.')
	parser.add_argument('-acf', '--annotation_color_file', required=False,
		default=None, type=str, help='Path to color mapping annotations to colors.')

	return parser

# Run
def run( args ):
	###########################################################################
	# Do some additional argument checks
	assert(args.snv_file or args.cna_file or args.data_matrix_file or data.aberrations_file)
	assert(args.is_public or args.user_id)

	###########################################################################
	# Load the data

	# Keep a map of genes -> samples -> mutation types
	geneToCases = defaultdict(lambda: defaultdict(set))

	# Load samples
	try:
		samples, categories, sampleToAnnotations, annotationToColor, sampleWhitelist, sampleToMuts = load_samples(args.sample_annotation_file, args.annotation_color_file)
	except (urllib2.HTTPError, urllib2.URLError):
		sys.stderr.write("urllib2 error when parsing sample annotation or annotation color file.")
		os._exit(4) # Samples/Annotation colors URL file error
	except IOError as e:
		sys.stderr.write("IOError when parsing sample annotation or annotation color file.\n")
		os._exit(5) # Samples/Annotation colors local file error

	# Load SNVs
	try:
		snvs, numSNVs = load_snvs(args.snv_file, args.snv_file_type, args.dataset_name,
								  sampleToMuts, geneToCases, sampleWhitelist)
	except (urllib2.HTTPError, urllib2.URLError):
		sys.stderr.write("urllib2 error when parsing SNV file.\n")
		os._exit(14) # SNV URL file error
	except IOError as e:
		sys.stderr.write("IOError when parsing SNV file.\n")
		os._exit(15) # SNV local file error

	# Load CNAs
	try:
		cnas, numCNAs = load_cnas(args.cna_file, args.cna_file_type, args.dataset_name,
								  sampleToMuts, geneToCases, sampleWhitelist,
								  args.amp_cutoff, args.del_cutoff,
								  args.cna_consistency_threshold, args.range_cna)
	except (urllib2.HTTPError, urllib2.URLError):
		sys.stderr.write("urllib2 error parsing CNA file.\n")
		os._exit(24) # CNA URL file error
	except IOError as e:
		sys.stderr.write("IOError when parsing CNA file.\n")
		os._exit(25) # CNA local file error

	# Load aberrations
	try:
		aberrations = load_aberrations(args.aberrations_file, args.aberration_type,
									   args.dataset_name, sampleToMuts, geneToCases,
									   sampleWhitelist)
	except (urllib2.HTTPError, urllib2.URLError):
		sys.stderr.write("urllib2 error when parsing aberrations file.\n")
		os._exit(34) # aberrations URL file error
	except IOError as e:
		sys.stderr.write("IOError when parsing aberrations file.\n")
		os._exit(35) # aberrations local file error

	# Load the data matrix (if given)
	try:
		dataMatrix, dataMatrixSamples = load_data_matrix(args.data_matrix_file, sampleWhitelist)
	except urllib2.HTTPError as e:
		sys.stderr.write("urllib2 error when parsing data matrix color file.\n")
		os._exit(44) # data matrix URL file error
	except (urllib2.HTTPError, urllib2.URLError):
		sys.stderr.write("IOError when parsing data matrix file.\n")
		os._exit(45) # data matrix local file error

	# Create a list of the samples in this dataset if one wasn't provided
	if not sampleWhitelist:
		if args.snv_file or args.cna_file or args.aberrations_file:
			samples = sampleToMuts.keys()
		else:
			samples = dataMatrixSamples
	print len(samples)

	# Create a mapping of samples to their mutation types
	sampleToMutations = identify_mutations_in_samples(samples, snvs, cnas, aberrations)

	mutationTypes = set( t for g, cases in geneToCases.iteritems() for s, muts in cases.iteritems() for t in muts )

	###########################################################################
	# Compute the summary of the dataset

	# Count the number of samples with mutations of the given types in the gene
	def numMutSamples(gs, types):
		return sum(1 for g in gs for s, muts in geneToCases[g].iteritems() if len(types & muts) > 0 )

	# Sort the genes by their total number of mutated samples
	genesWithCount = sorted([ (g, len(cases)) for g, cases in geneToCases.iteritems() ],
							 key=lambda (g, c): c, reverse=True)

	# Do some quick error checking
	if len(genesWithCount) == 0 or genesWithCount[0][1] == 0:
		if args.data_matrix_file:
			print "Warning: No valid mutation data in files. Only loading data matrix..."
		else:
			sys.stderr.write("Fatal error: No valid mutation data in files and no data matrix.\n")
			os._exit(60) # no data

	# Identify the most mutated genes and data for the mutation plot
	mostMutatedGenes, mutationPlotData = [], dict()
	for i, (g, num_mutated_samples) in enumerate(genesWithCount[:500]):
		# Record data to show in the most mutated genes table
		datum = dict(name=g)
		datum['mutated_samples'] = num_mutated_samples
		datum['inactivating'] = numMutSamples([g], set(['inactive_snv']))
		datum['cnas'] = numMutSamples([g], cnaTypes)
		datum['snvs'] = numMutSamples([g], snvTypes)
		if i < 100:
			mostMutatedGenes.append(datum)

		# Record additional data for the mutation plot summary
		point = dict(datum.items())
		del point['name']
		for t in mutationTypes:
			# Skip the types we computed manually above
			if t in datum or t in ['snv', 'inactive_snv']: continue
			point[t.lower()] = numMutSamples([g], set([t]))

		mutationPlotData[g] = point

	# Identify the gene sets with the most mutations
	mostMutatedGeneSets = []
	for S in db.genesets.find({}):
		gset = S['genes']
		datum = dict(name=S['description'], database=S['database'], num_genes=len(gset),
					 mutated_samples=len(set( s for g in gset for s in geneToCases[g] )),
					 cnas=numMutSamples(gset, cnaTypes), snvs=numMutSamples(gset, snvTypes),
					 inactivating=numMutSamples(gset, set(["inactive_snv"])))
		if datum['mutated_samples'] > 0:
			mutatedGenes = [ g for g in gset if len(geneToCases[g]) > 0 ]
			topGenes = sorted(mutatedGenes, key=lambda g: len(geneToCases[g]), reverse=True)[:5]
			datum['top_genes'] = "%2C".join(topGenes)
			mostMutatedGeneSets.append(datum)

	mostMutatedGeneSets = sorted(mostMutatedGeneSets, key=lambda d: d['mutated_samples'], reverse=True)[:20]

	# Create a single summary object
	summary = {
		"num_snvs": numSNVs,
		"num_cnas": numCNAs,
		"num_samples": len(samples),
		"most_mutated_genes": mostMutatedGenes,
		"most_mutated_gene_sets": mostMutatedGeneSets,
		"mutation_plot_data": mutationPlotData,
		"num_mutated_genes": len(geneToCases)
	}

	# Then convert the sets in the mutated genes to lists,
	# restricting to either (a) the user-defined aberration type
	# or (b) the types recognized by the mutation matrix. This will remove
	# the custom types that might appear in the SNV/MAF file or the
	# CNA/GISTIC2 files.
	for g, cases in geneToCases.iteritems():
		for s, muts in cases.iteritems():
			geneToCases[g][s] = list(muts & mutationMatrixTypes)

	###########################################################################
	# Remove datasets with the same identifiers, as well as any of their
	# associated mutgenes or data matrix rows
	userID = ObjectId(args.user_id) if args.user_id else None
	dbQuery = dict(title=args.dataset_name, group=args.group_name, is_public=args.is_public, user_id=userID)
	oldDatasetIds = [ oldDB['_id'] for oldDB in db.datasets.find(dbQuery, {"_id": True}) ]
	db.mutgenes.remove({"dataset_id": {"$in": oldDatasetIds}})
	db.samples.remove({"dataset_id": {"$in": oldDatasetIds}})
	db.datamatricesrow.remove({"dataset_id": {"$in": oldDatasetIds}})
	db.datasets.remove({"_id": {"$in": oldDatasetIds}})

	# Save the new dataset
	dataset_id = db.datasets.insert({
		"title": args.dataset_name,
		"samples": list(samples), # samples from input sample list
		"sample_annotations": sampleToAnnotations,
		"annotation_colors": annotationToColor,
		"group": args.group_name,
		"updated_at": datetime.datetime.utcnow(),
		"summary": summary,
		"is_public": args.is_public,
		"user_id": userID,
		"color": args.color if args.color else cancerToColor[args.cancer],
		"cancer_id": cancerToId[args.cancer],
		"data_matrix_samples": list(dataMatrixSamples) if dataMatrixSamples else None,
		"data_matrix_name": args.matrix_name
	})
	print "Dataset ID:", dataset_id

	# Add mutated samples
	if args.cna_file or args.snv_file or args.aberrations_file:
		dbSamples = [ dict(name=s, mutations=sampleToMutations[s], dataset_id=dataset_id) for s in samples ]
	else: # there must only be data matrix samples
		dbSamples = [ dict(name=s, mutations=[], dataset_id=dataset_id) for s in dataMatrixSamples ]
	db.samples.insert( dbSamples )

	# Save the data matrix rows
	if dataMatrix and dataMatrixSamples:
		db.datamatricesrow.insert([
			dict(gene=g, dataset_id=dataset_id, row=row, updated_at=datetime.datetime.utcnow())
			for g, row in dataMatrix.iteritems()
		])

	# Save the mutated genes
	mutGenes = [ dict(gene=g, mutated_samples=mutSamples,
					  snvs=snvs[g] if g in snvs else None,
					  cnas=cnas[g] if g in cnas else None,
					  dataset_id=dataset_id)
				for g, mutSamples in geneToCases.iteritems() ]
	db.mutgenes.insert(mutGenes)


if __name__ == "__main__":
	run( get_parser().parse_args(sys.argv[1:]) )
	for path in pathsToDelete:
		if os.path.isfile(path): os.remove(path)
		elif os.path.isdir(path): shutil.rmtree(path)
		print path, 'removed'
