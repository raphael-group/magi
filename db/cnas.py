#!/usr/bin/python

from mutation_data import MutationData, AMP, DEL, SNV
import sys, os, re
from gistic_constants import *

def readGistic2_focal(pan_cancer_path, thrA, thrD):
	G2_M = dict()
	S_Array = dict()	
	
	fname = pan_cancer_path[0][1] + '/' + focalMatrix
	for l in open(fname):
		if l.startswith("Gene"):
			v = l.rstrip().split("\t")

			for i in range(len(v)):
				n_sample = v[i]
				if i > 2:
					n_sample = "-".join(v[i].split("-")[0:3])
					G2_M[n_sample] = set()				
				S_Array[i] = n_sample				
			
		else:
			v = l.rstrip().split("\t")
			gene = v[0]
			for i in range(3, len(v)):				
				if float(v[i]) >= thrA :
					G2_M[S_Array[i]].add(gene+"(A)")
				
				elif float(v[i]) <= thrD:
					G2_M[S_Array[i]].add(gene+"(D)")

	return formatG2_M(G2_M)

def formatG2_M(G2_M):
	region2sample_gistic2 = dict()
	for s in G2_M.keys():		
		for g in G2_M[s]:
			gene = g[:-3]
			typ = AMP if g[-2:-1] == 'A' else DEL
			if gene not in region2sample_gistic2:
				region2sample_gistic2[gene] = {AMP:set(), DEL:set()}
			region2sample_gistic2[gene][typ].add(s)

	return region2sample_gistic2

def isFishy(gene):
	if re.search(r'^WWOX|^PARK2|^MIR|^hsa-mir|^FAM\d+|^LOC\d+$|^C\d+orf\d+$|^ANKRD\d+$|^FOXD4L\d+$|^CBWD\d+$|^BAGE\d+$|^GLBIL\d+$', gene, re.I):
		return True
	else:
		return False

def loadGistic(args):
	# Load index of single cancer CNA files
	individual_tys_and_paths = [ l.rstrip().split("\t")
	                        for l in open(args.individual_cna) ]
	
	cen_list = args.census_glist
	# Load index of PAN CNA files
	if args.pan_cna:
		pan_tys_paths = [l.rstrip().split("\t") for l in open(args.pan_cna)]
		focal_matrix_path = pan_tys_paths
	else:
		pan_tys_paths = [['PAN', None]]
		focal_matrix_path = individual_tys_and_paths
	#pan_tys_paths = dict()

	
	# Process the GISTIC directory for each tumor type
	M = MutationData()
	M_dendrix = None

	# pancan	
	initialGList = set()
	
	# fetch target that consistency cross multiple cancers, define targets by Zack et al genes, and Census genes
	target, sample2ty, mTable, missingpeak = check_consistency_cross_cancers(individual_tys_and_paths, pan_tys_paths)
	#print target

	# based on targets, get calling from GISTIC2 matrix
	G2_M = readGistic2_focal(focal_matrix_path, args.t_amp, args.t_del)  # 2 for 0.9, -0.9, 1 for 0.1, -0.1
	
	# output focal Matrix
	focalMatrixProcessing(M, G2_M, target[AMP], target[DEL], sample2ty)

	M_dendrix = MutationData()
	if not args.pan_cna:		
		dendrix_CNA(mTable, M, M_dendrix, list(M.tumor_tys)[0] )
	else:
		dendrix_CNA(mTable, M, M_dendrix, 'PAN' )

	return M, M_dendrix


def dendrix_CNA(table, M, M_dendrix, in_tumor_type ):
	
	tumor_type_set = list()
	if in_tumor_type != 'PAN': 
		tumor_type_set.append(in_tumor_type)
	else:
		tumor_type_set = list(M.tumor_tys)

	for tumor_type in tumor_type_set:

		M_dendrix.genes_mutatedPatient[tumor_type] = dict()
		M_dendrix.tumor_tys.add( tumor_type )
		M_dendrix.patientID_mutatedGenes[tumor_type] = dict()

		M_dendrix.patientID_tumorTypes = M.patientID_tumorTypes
		
		mutations = set()
		patients = set()
		genes = set()
		for pid in M.patientID_mutatedGenes[tumor_type]:
			for ty in M.patientID_mutatedGenes[tumor_type][pid]:
				for g in M.patientID_mutatedGenes[tumor_type][pid][ty]:
					if g in table[ty]:
						mutations.add((pid, table[ty][g], ty))
						genes.add(table[ty][g])
					else:
						mutations.add((pid, g, ty))
						genes.add(g)
			
			patients.add(pid)

		M_dendrix.add_genes(tumor_type, genes)
		M_dendrix.add_patients(tumor_type, patients)
		
		for patient, gene, ty in mutations:
			M_dendrix.add_mutation( tumor_type, patient, gene, ty )

		#print len(M_dendrix.genes()), len(M.genes()), len(M_dendrix.patients()), len(M.patients())

	return M_dendrix



def remove_inconsistent_cnas(args, M):
	# Remove inconsistent CNAs from each tumor type
	for ty in M.tumor_tys:
		percentConsist(args, M, ty)

def percentConsist(args, M, tumor_ty):
	remove_g = set()
	for g in M.genes_mutatedPatient[tumor_ty]:
		amps = M.genes_mutatedPatient[tumor_ty][g][AMP]
		dels = M.genes_mutatedPatient[tumor_ty][g][DEL]
		num_amps, num_dels = float(len(amps)), float(len(dels))

		if num_amps == 0 and num_dels == 0: continue

		if num_amps / (num_amps + num_dels) >= args.cna_consistency_threshold:
			for patient in M.genes_mutatedPatient[tumor_ty][g][DEL]:
				M.patientID_mutatedGenes[tumor_ty][patient][DEL].remove( g )
			M.genes_mutatedPatient[tumor_ty][g][DEL] = set()

		elif num_dels / (num_amps + num_dels) >= args.cna_consistency_threshold:
			for patient in M.genes_mutatedPatient[tumor_ty][g][AMP]:
				M.patientID_mutatedGenes[tumor_ty][patient][AMP].remove( g )
			M.genes_mutatedPatient[tumor_ty][g][AMP] = set()
		else:		
			remove_g.add(g)
			for var_ty, mutations in M.genes_mutatedPatient[tumor_ty][g].items():
				for p in mutations:
					M.patientID_mutatedGenes[tumor_ty][p][var_ty].remove( g )

	for g in remove_g:		
		del M.genes_mutatedPatient[tumor_ty][g]

def getAmpDelThreshold(gistic_f):
	tmpthramp = 0
	tmpthrdel = 0
	gistic_fin = open(gistic_f, 'r')	
	for line in gistic_fin:
		line = line.rstrip()
		v = line.split("\t")
		if v[0] != "Unique Name":
			typeCNA = ""
			if re.search(r'Amp', v[0]):
				typeCNA = "A"
			else:
				typeCNA = "D"
			threset = v[8].split(";")
			if typeCNA == "A":
				matchobj = re.match(r'0: t\<(.+)', threset[0])
				tmpthramp = float(matchobj.group(1))
			if typeCNA == "D":
				matchobj = re.match(r'0: t\>(.+)', threset[0])
				tmpthrdel = float(matchobj.group(1))
		
		if tmpthramp != 0 and tmpthrdel != 0:
			break

	return tmpthramp, tmpthrdel


def focalMatrixProcessing(M, G2_M, listA, listD, sample2ty):
	"""
	Extract wide peak region from Gistic 2.0 results. Then mapping genes located inside the regions.
	"""
	
	genes, patients, mutations = dict(), dict(), dict()

	#print len(listA), len(listD)
	for g in listA.keys():
		if g in G2_M:
			#genes.add( g )
			chrm = listA[g][2]
			left = listA[g][0]
			right = listA[g][1]
			max_peak_ctype = listA[g][3]	

			if 'PAN' in max_peak_ctype:
				for pat in G2_M[g][AMP]:				
					if sample2ty[pat] not in patients:
						patients[sample2ty[pat]] = set()
						mutations[sample2ty[pat]] = list()
						genes[sample2ty[pat]] = set()
					genes[sample2ty[pat]].add(g)
					patients[sample2ty[pat]].add(pat)
					mutations[sample2ty[pat]].append( (pat, g, AMP) )			
			else:
				for pat in G2_M[g][AMP]:				
					if sample2ty[pat] in max_peak_ctype:
						if sample2ty[pat] not in patients:
							patients[sample2ty[pat]] = set()
							mutations[sample2ty[pat]] = list()
							genes[sample2ty[pat]] = set()
						genes[sample2ty[pat]].add(g)
						patients[sample2ty[pat]].add(pat)
						mutations[sample2ty[pat]].append( (pat, g, AMP) )			


	for g in listD.keys():
		#genes.add( g )
		if g in G2_M:
			chrm = listD[g][2]
			left = listD[g][0]
			right = listD[g][1]
			max_peak_ctype = listD[g][3]
			if 'PAN' in max_peak_ctype:
				for pat in G2_M[g][DEL]:	
					if sample2ty[pat] not in patients:
						patients[sample2ty[pat]] = set()
						mutations[sample2ty[pat]] = list()
						genes[sample2ty[pat]] = set()
					genes[sample2ty[pat]].add(g)	
					patients[sample2ty[pat]].add(pat)
					mutations[sample2ty[pat]].append( (pat, g, DEL) )			
			else:
				for pat in G2_M[g][DEL]:	
					if sample2ty[pat] in max_peak_ctype:
						if sample2ty[pat] not in patients:
							patients[sample2ty[pat]] = set()
							mutations[sample2ty[pat]] = list()
							genes[sample2ty[pat]] = set()
						genes[sample2ty[pat]].add(g)	
						patients[sample2ty[pat]].add(pat)
						mutations[sample2ty[pat]].append( (pat, g, DEL) )	


	# Add mutations to mutation data
	for tumor_type in patients.keys():		
		if tumor_type not in M.tumor_tys:
			M.genes_mutatedPatient[tumor_type] = dict()
			M.tumor_tys.add( tumor_type )
			M.patientID_mutatedGenes[tumor_type] = dict()
			M.add_patients(tumor_type, patients[tumor_type])
			M.add_genes(tumor_type, genes[tumor_type])

		for patient in patients[tumor_type]:
			try:
				if M.patientID_tumorTypes[patient] != tumor_type:
					sys.stderr.write("WARNING: Sample ID \"" + patient + "\" shows up in different diseases!! \n")
			except KeyError:
				M.patientID_tumorTypes[patient] = tumor_type

	#M.add_genes(tumor_type, [g for g in genes]) #  if not isFishy(g)]
	#M.add_patients(tumor_type, patients)
		for patient, gene, ty in mutations[tumor_type]:
			#if not isFishy(gene):
			M.add_mutation( tumor_type, patient, gene, ty )



def output_info_file(missingpeak, peak2census, single_gene, zack, using_cen):
	prefix = 'info_'

	fout = open(prefix+'missing.txt', 'w')
	for cna_type in missingpeak.keys():
		for peak, cancer_type in missingpeak[cna_type].items():
			fout.write(peak + "\t" + cancer_type + "\n")
	fout.close()

	fout = open(prefix+'single_in_use.txt', 'w')
	for cna_type in single_gene.keys():
		outc = 'Amp' if cna_type == AMP else 'Del'
		for g in single_gene[cna_type]:
			fout.write(g + "\t" + outc + "\n")
	fout.close()

	fout = open(prefix+'census_in_use.txt', 'w')
	for cna_type in using_cen.keys():
		outc = 'Amp' if cna_type == AMP else 'Del'
		for g in using_cen[cna_type]:
			fout.write(g + "\t" + outc + "\n")
	fout.close()

	fout = open(prefix+'peak_cancer_type.txt', 'w')
	for cna_type in peak2census:	
		outc = 'Amp' if cna_type == AMP else 'Del'	
		for chrm in peak2census[cna_type]:			
			for g in peak2census[cna_type][chrm].keys():								
				fout.write(g + "\t" + outc + "\t" + ",".join(peak2census[cna_type][chrm][g]) + "\n")
	fout.close()					

def check_consistency_cross_cancers(ind_cancer_path, pan_cancer_path, gene_db, zack_amp, zack_del, cen_list):        
	""" 
	Return a list of genes which are mutated consistently among PAN and each individual cancer.
	amp, del: return genes mutated in at least two cancer types, with their 
	minimum intersection of left and right regions
	"""

	peak2census = {AMP: dict(), DEL: dict()}
	mTable = {AMP: dict(), DEL: dict()}
	peak2region = {AMP: dict(), DEL: dict()}
	target = {AMP: dict(), DEL: dict()}
	missingpeak = {AMP:dict(), DEL:dict()}
	#wide_zack = {AMP:set(), DEL:set()}
	single_gene = {AMP:set(), DEL:set()}
	using_cen = {AMP:set(), DEL:set()}
	
	sample2ty = dict()
	

	# read census genes and zack et al genes as IMPORTANT cancer target genes
	cengene = set()
	#geneinfo, g2chrm = readGeneInfo()
	#gene_db = json.load(open(GENE))       
	for l in open(cen_list, 'r'): # adding genes from MasterTable20141030.xlsx
		cengene.add(l.rstrip())


	zack = {AMP: set(), DEL:set()}
	
	for l in open(zack_amp):
		zack[AMP].add(l.rstrip())
		
	for l in open(zack_del):
		zack[DEL].add(l.rstrip())
		
	if pan_cancer_path[0][1]:
		for cna_type in zack.keys():
			for g in zack[cna_type]:
				if len(gene_db[g]) == 1:
					chrm = list(g2chrm[g])[0]
					if chrm not in peak2census[cna_type]:
						peak2census[cna_type][chrm] = dict()
					if g not in peak2census[cna_type][chrm]:
						peak2census[cna_type][chrm][g] = set()
						mTable[cna_type][g] = g

					peak2census[cna_type][chrm][g].add("PAN")
				else:
					print "Wrong", g, gene_db[g]
	else: # if no PAN-CAN path (i.e. individual cancer), put zack into cengene
		for cna_type in zack.keys():
			for g in zack[cna_type]:
				cengene.add(g)

			
	
	# Check target for individual cancer
	rid = 0	
	for cancer_type, gistic_fpath in ind_cancer_path:
		
		file_in = gistic_fpath + "/" + ampPeak				
		rid = getWidePeak(file_in, AMP, cancer_type, peak2census, mTable, cengene, zack, missingpeak, single_gene, using_cen)		
		
		file_in = gistic_fpath + "/" + delPeak	
		rid = getWidePeak(file_in, DEL, cancer_type, peak2census, mTable, cengene, zack, missingpeak, single_gene, using_cen)		

		
		# no focal_input.seg.txt for ACC, using focal_data_by_genes.txt to get sample list
		file_in = gistic_fpath + "/" + focalMatrix			
		for line in open(file_in, 'r'):
			if line.startswith("Gene"):				
				for ss in line.rstrip().split("\t")[3:]:
					patnum = ss.split("-")
					newpat = "-".join(patnum[0:3])
					sample2ty[newpat] = cancer_type					
				break
			# v = line.rstrip().split("\t")
			# if v[0] != "Sample":
			# 	patnum = v[0].split("-")
			# 	newpat = "-".join(patnum[0:3])
			# 	sample2ty[newpat] = cancer_type					
	
	#Check target for PANCANCER (if path error, this will skip)
	# if pan_cancer_path[0][1]:
	# 	for cancer_type, gistic_fpath in pan_cancer_path:
	# 		#print cancer_type, gistic_fpath
	# 		file_in = gistic_fpath + "table_amp.conf_99.txt"				
	# 		if os.path.isfile(file_in):
	# 			rid = getWidePeak(file_in, AMP, 'PAN', peak2census, mTable, cengene, zack, missingpeak, single_gene, using_cen)		
			
	# 		file_in = gistic_fpath + "table_del.conf_99.txt"	
	# 		if os.path.isfile(file_in):
	# 			rid = getWidePeak(file_in, DEL, 'PAN', peak2census, mTable, cengene, zack, missingpeak, single_gene, using_cen)		
	
		
	#output_info_file(missingpeak, peak2census, single_gene, zack, using_cen)
	for cna_type in peak2census:		
		for chrm in peak2census[cna_type]:			
			for g in peak2census[cna_type][chrm].keys():								
				#if g in geneinfo[chrm]:				
				if g in gene_db:
					#target[cna_type][g] = [geneinfo[chrm][g][0], geneinfo[chrm][g][1], chrm, peak2census[cna_type][chrm][g]]
					[gl, gr, chrom] = gene_db[g][0]
					target[cna_type][g] = [gl, gr, chrm, peak2census[cna_type][chrm][g]]
					
	
	return target, sample2ty, mTable, missingpeak


def getWidePeak(file_in, cna_type, cancer_type, peak2census, mTable, cengene, zack, missingpeak, single_gene, using_cen):

	# Check genes in Wide Peak contain census genes or not, if yes, use census genes as target, return intersected region as target.
	# allgene stores 
	fin = open(file_in, 'r')
	for line in fin:

		line = line.rstrip()
		v = line.split("\t")		
		if v[0] != "index":
			if not re.search(r'\[|\]', v[11]):				
				maxpeak_gene = v[11][:-1]

			else:				
				maxpeak_gene = v[11][1:-1]

			if not re.search(r'\[|\]', v[9]):
				widepeak_gene = v[9][:-1]
			else:
				widepeak_gene = v[9][1:-1]
			#print widepeak_gene, maxpeak_gene

			in_cen = False
			if cancer_type == "PAN": # zack list				
				zack_int = zack[cna_type].intersection(set(widepeak_gene.split(",")))
				#wide_zack[cna_type].update(zack_int)
				if len(zack_int) == 1:					
					in_cen = True
					
				if len(zack_int) > 1:
					zack_int_max = zack[cna_type].intersection(set(maxpeak_gene.split(",")))					
					if len(zack_int_max) == 1:
						in_cen = True
					else:
						in_cen = True
					
			if cancer_type != "PAN" or in_cen == False: # not PAN12 or wide/max peaks without zack genes)
				if len(widepeak_gene.split(",")) == 1: # only one gene in wide peak
					g = widepeak_gene
					#print widepeak_gene, cancer_type					
					single_gene[cna_type].add(g)
					in_cen = True
					if v[1] not in peak2census[cna_type]:
						peak2census[cna_type][v[1]] = dict()
					if g not in peak2census[cna_type][v[1]]:
						peak2census[cna_type][v[1]][g] = set()					
					peak2census[cna_type][v[1]][g].add(cancer_type)
				else: # multiple gene in wide peak, check census gens
					cen_int = cengene.intersection(set(widepeak_gene.split(",")))
					if len(cen_int) >= 1: # census in widepeak				
						for g in cen_int:						
							using_cen[cna_type].add(g)
							in_cen = True
							if v[1] not in peak2census[cna_type]:
								peak2census[cna_type][v[1]] = dict()
							if g not in peak2census[cna_type][v[1]]:
								peak2census[cna_type][v[1]][g] = set()
							
							peak2census[cna_type][v[1]][g].add(cancer_type)
							mTable[cna_type][g] = ",".join(cen_int)
					elif len(maxpeak_gene.split(",")) == 1: #check one gene in maxpeak
						g = maxpeak_gene
						#print g
						single_gene[cna_type].add(g)
						in_cen = True
						if v[1] not in peak2census[cna_type]:
							peak2census[cna_type][v[1]] = dict()
						if g not in peak2census[cna_type][v[1]]:
							peak2census[cna_type][v[1]][g] = set()					
						peak2census[cna_type][v[1]][g].add(cancer_type)
										
				if in_cen == False:
					missingpeak[cna_type][widepeak_gene+"\t"+maxpeak_gene] = cancer_type
											
	fin.close()
	
def maxpeakProcessingWithRegion(M, gistic_fpath, tumor_type, listA, listD, sample2ty):
	"""
	Extract wide peak region from Gistic 2.0 results. Then mapping genes located inside the regions.
	"""
	segfile = gistic_fpath + "focal_input.seg.txt"	
	threfile = gistic_fpath + "all_lesions.conf_99.txt"
	thramp, thrdel = getAmpDelThreshold(threfile)
	bs = 500000
	bs_p = 0.7
	seg = dict()
	fin = open(segfile, 'r')
	for line in fin:
		line = line.rstrip()
		v = line.split("\t")
		if v[0] != "Sample":
			patnum = v[0].split("-")
			newpat = "-".join(patnum[0:3])
			if float(v[-1]) >= thramp or float(v[-1]) <= thrdel:
				if newpat not in seg:
					seg[newpat] = dict()			
				if v[1] not in seg[newpat]:
					seg[newpat][v[1]] = list()				
				seg[newpat][v[1]].append([int(v[2]),int(v[3]),float(v[-1])])

	fin.close()

	genes, patients, mutations = set(), set(), list()
	for g in listA.keys():
		genes.add( g )
		chrm = listA[g][2]
		left = listA[g][0]
		right = listA[g][1]
		max_peak_ctype = listA[g][3]		
		for pat in seg:
			if sample2ty[pat] in max_peak_ctype:
				if chrm in seg[pat]:
					for info in seg[pat][chrm]:
						if info[2] >= thramp and (not (left > info[1] or right < info[0])): #overlap	
						    patients.add(pat)
						    mutations.append( (pat, g, AMP) )
			
			else:
				if chrm in seg[pat]:
					for info in seg[pat][chrm]:
							#bs = int((info[1] - info[0])*bs_p)
						if info[2] >= thramp and  (not (left > info[1] or right < info[0])) and ((left - info[0]< bs and info[1]-right < bs) or (left - info[0]< bs and info[1] < right) or (left < info[0] and info[1]-right < bs)) : #overlap	
						#if info[2] >= thramp and  (not (left > info[1] or right < info[0])) : #overlap	
						    patients.add(pat)
						    mutations.append( (pat, g, AMP) )
			
	for g in listD.keys():
		genes.add( g )
		chrm = listD[g][2]
		left = listD[g][0]
		right = listD[g][1]
		max_peak_ctype = listD[g][3]
		for pat in seg:
			if sample2ty[pat] in max_peak_ctype:
				if chrm in seg[pat]:
					for info in seg[pat][chrm]:
						if (not (left > info[1] or right < info[0])) and info[2] <= thrdel: #overlap
						    patients.add(pat)
						    mutations.append( (pat, g, DEL) )
			else:
				if chrm in seg[pat]:
					for info in seg[pat][chrm]:
							#bs = int((info[1] - info[0])*bs_p)
						if (not (left > info[1] or right < info[0])) and ((left - info[0]< bs and info[1]-right < bs) or (left - info[0]< bs and info[1] < right) or (left < info[0] and info[1]-right < bs)) and info[2] <= thrdel: #overlap	
						#if (not (left > info[1] or right < info[0])) and info[2] <= thrdel: #overlap	
						    patients.add(pat)
						    mutations.append( (pat, g, DEL) )
	# Add mutations to mutation data
	if tumor_type not in M.tumor_tys:
		M.genes_mutatedPatient[tumor_type] = dict()
		M.tumor_tys.add( tumor_type )
		M.patientID_mutatedGenes[tumor_type] = dict()

	for patient in patients:
		try:
			if M.patientID_tumorTypes[patient] != tumor_type:
				sys.stderr.write("WARNING: Sample ID \"" + patient + "\" shows up in different diseases!! \n")
		except KeyError:
			M.patientID_tumorTypes[patient] = tumor_type

	M.add_genes(tumor_type, [g for g in genes if not isFishy(g)])
	M.add_patients(tumor_type, patients)
	for patient, gene, ty in mutations:
		if not isFishy(gene):
			M.add_mutation( tumor_type, patient, gene, ty )



def findCloseGenes(metagenebkt, left, right):
	minleft = 10**10
	minright = 10**10
	leftg = ""
	rightg= ""
	for g in metagenebkt:
		if metagenebkt[g][1] < left and left - metagenebkt[g][1] < minleft:
			leftg = g
			minleft = left - metagenebkt[g][1]

		if metagenebkt[g][0] > right and metagenebkt[g][0] - right < minright:
			rightg = g
			minright = metagenebkt[g][0] - right

	if minright < minleft:
		return rightg
	else:
		return leftg

