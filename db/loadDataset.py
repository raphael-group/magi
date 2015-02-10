#!/usr/local/bin/python

# Load required modules
import sys, os, argparse, json, datetime, urllib2, shutil
from collections import defaultdict
import tarfile, tempfile

# Set up the connection to the MongoDB database
from pymongo import MongoClient
from bson.objectid import ObjectId
client = MongoClient("mongodb://localhost:27017/magi")
db = client.magi

# Define a custom error to be used if we fail at parsing for any reason
class MAGIFileParsingException(Exception): pass

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
	return filename.lower().startswith("http://")

def load_file(filename):
	if is_url(filename):
		try:
			response = urllib2.urlopen(filename)
			return response.read().split("\n")
		except urllib2.HTTPError as e:
			raise MAGIFileParsingException("Loading {}: {}".format(filename, e))
	else:
		with open(filename) as f:
			return f.readlines()

#
def load_file_to_tmp(filename):
	# Determine
	if filename.lower().endswith(".tar"):
		suffix = ".tar"
		mode = 'wb'
	else:
		suffix = '.txt'
		mode = 'w'
	_, tmpfile = tempfile.mkstemp(suffix=suffix)
	print tmpfile
	with open(tmpfile, mode) as outfile:
		if is_url(filename):
			try:
				response = urllib2.urlopen(filename)
				outfile.write(response.read())
			except urllib2.HTTPError as e:
				raise MAGIFileParsingException("Loading {}: {}".format(filename, e))
		else:
			with open(filename) as f:
				outfile.write(f.read())
	return tmpfile

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
	except ValueError:
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
		if len(arr) < 8: arr += ["--"] * 8-len(arr)
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

def load_data_matrix(filename, sampleWhitelist):
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
	# Do some additional argument checks
	assert(args.snv_file or args.cna_file or args.data_matrix_file or data.aberrations_file)

	# Load the sample file (if provided)
	if (args.sample_annotation_file):
		# Load the samples and sample annotations (if provided)
		samples, categories, sampleToAnnotations = load_sample_file(args.sample_annotation_file)
		sampleWhitelist = set(samples)
		sampleToMuts = dict( (s, set()) for s in sampleWhitelist)

		# If we're given a sample file then we need to try and load the
		# annotation colors
		if (len(categories) > 0 and args.annotation_color_file):
			annotationToColor = load_annotation_color_file(args.annotation_color_file, categories)
		else:
			annotationToColor = dict( (c, {}) for c in categories )
	else:
		samples, categories, sampleToAnnotations, annotationToColor, sampleWhitelist = None, None, None, None, None
		sampleToMuts = defaultdict(set)

	# Load the mutations
	geneToCases = defaultdict(lambda: defaultdict(set))

	if args.snv_file:
		if args.snv_file_type == 'MAGI':
			snvs, numSNVs = load_snv_file(args.snv_file, args.dataset_name, sampleToMuts, geneToCases, sampleWhitelist)
		else:
			from mafToTSV import parse_maf, transcriptFile
			filename = load_file_to_tmp(args.snv_file)
			with open(transcriptFile) as f:
				dbToTranscripts = json.load(f)
				try:
					snvs, numSNVs = parse_maf( filename, dbToTranscripts, args.dataset_name,
											   sampleToMuts, geneToCases, sampleWhitelist, inactiveTys )
				except ValueError as e:
					raise MAGIFileParsingException(e)
				except:
					raise MAGIFileParsingException("Could not parse MAF.")
			os.remove(filename) # remove the temporary file
	else:
		snvs, numSNVs = {}, 0

	if (args.cna_file):
		if args.cna_file_type == 'MAGI':
			cnas, numCNAs = load_cna_file(args.cna_file, args.dataset_name, sampleToMuts, geneToCases, sampleWhitelist)
		elif args.cna_file_type == 'GISTIC2':
			# GISTIC2 requires a tarball. So verify that there is a tarball, then 
			# untar it to a temporary directory
			filename = load_file_to_tmp(args.cna_file)
			cnaDir = tempfile.mkdtemp()

			if not tarfile.is_tarfile(filename):
				sys.stderr.write("CNA file is not a valid TAR file.\n")
				sys.exit(100)
			else:
				tar = tarfile.open(filename)
				tar.extractall(path=cnaDir)
				tar.close()
				os.remove(filename)

			# Parse the CNAs
			from gistic2ToTSV import parse_gistic2
			cnas, numCNAs = parse_gistic2(cnaDir, args.dataset_name, args.amp_cutoff, args.del_cutoff,
										  args.cna_consistency_threshold, args.range_cna, sampleToMuts,
										  geneToCases, sampleWhitelist)
			shutil.rmtree(cnaDir) # clear the extracted tar direcotry

		# Identify the neighbors of each gene with CNAs
		add_neighbors(cnas)

	else:
		cnas, numCNAs = {}, 0

	if (args.aberrations_file):
		aberrations = load_aberrations_file(args.aberrations_file, args.aberration_type,
			args.dataset_name, sampleToMuts, geneToCases, sampleWhitelist)
		mutationMatrixTypes.add(args.aberration_type)
	else:
		aberrations = {}

	# Load the data matrix (if given)
	if args.data_matrix_file:
		dataMatrix, dataMatrixSamples = load_data_matrix(args.data_matrix_file, sampleWhitelist)
	else:
		dataMatrix, dataMatrixSamples = None, None

	# Create a list of the samples in this dataset if one wasn't provided
	if not sampleWhitelist:
		samples = sampleToMuts.keys()

	mutationTypes = set( t for g, cases in geneToCases.iteritems() for s, muts in cases.iteritems() for t in muts )

	###########################################################################
	# Compute the summary of the dataset

	# Count the number of samples with mutations of the given types in the gene
	def numMutSamples(gs, types):
		return sum(1 for g in gs for s, muts in geneToCases[g].iteritems() if len(types & muts) > 0 )

	# Sort the genes by their total number of mutated samples
	genesWithCount = sorted([ (g, len(cases)) for g, cases in geneToCases.iteritems() ],
							 key=lambda (g, c): c, reverse=True)
	mostMutatedGenes, mutationPlotData = [], []
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
		for t in mutationTypes:
			if t in datum: continue # skip the types we computed manually above
			datum[t.replace("_", "")] = numMutSamples([g], set([t]))
		mutationPlotData.append(datum)


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


if __name__ == "__main__": run( get_parser().parse_args(sys.argv[1:]) )