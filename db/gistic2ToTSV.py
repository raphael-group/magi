#!/usr/bin/python
import sys, os, json, argparse
from collections import defaultdict
from mutation_data import MutationData, AMP, DEL, SNV
from gistic_constants import *

dirname, filename = os.path.split(os.path.abspath(__file__))
GENE = dirname + "/data/hg19_genes_list.json"
CENSUS = dirname + "/data/census_glist.txt"
ZACK_AMP = dirname + "/data/zack_cna_amp.lst"
ZACK_DEL = dirname + "/data/zack_cna_del.lst"

def load_mutation_data( M, tumor_ty, cna_consistency_threshold ):
    # Load sample and gene whitelists. Sample file is required for typing.
    
    sample2ty = M.patientID_tumorTypes
    
    # Load SNVs
    from collections import defaultdict
    gene2cases = defaultdict(lambda: defaultdict(list))
        
    # Load CNAs
    for g in M.genes_mutatedPatient[tumor_ty]:
        amps = M.genes_mutatedPatient[tumor_ty][g][AMP]
        dels = M.genes_mutatedPatient[tumor_ty][g][DEL]
        num_amps, num_dels = float(len(amps)), float(len(dels))

        if num_amps == 0 and num_dels == 0: continue

        if num_amps / (num_amps + num_dels) >= cna_consistency_threshold:
            for sample in amps:
                gene2cases[g][sample].append("amp")
        
        elif num_dels / (num_amps + num_dels) >= cna_consistency_threshold:            
            for sample in dels:
                gene2cases[g][sample].append("del")
        else:
            continue

    return sample2ty, gene2cases


def compute_coverage( gene2mutations, geneset ):
    return len( set( s for g in geneset for s in gene2mutations[g] ) )

# Functions for parsing the MAF file and loading gene lengths
def first_match( arr, names ):
    for i in range(len(arr)):
        if arr[i] in names:
            return i
    raise IndexError("Names %s not found" % str(names))

def parse_sample_name( arr ):
    if "TCGA" not in arr: return "-".join(arr)
    else:
        start = arr.index("TCGA")
        return "-".join(arr[start:start+3])
                                    
# for CNA-browser: cna calling
def create_cna_data(gene2cases, dataset, interval_db, gene_db, sample2ty, range_cna, ac, dc):
    cna_interval_data = dict()
    for g in gene2cases:
        if g in gene_db and len(gene_db[g]) == 1:
            [gl, gr, chrom] = gene_db[g][0]
            for sample, ty in gene2cases[g].items():
                #if 'del' in ty or 'amp' in ty:
                if g not in cna_interval_data:
                    #cna_interval_data[g] = dict(gene=g, region=[gl-500000, gr+500000, str(chrom)], geneinfo=list(), seg=list(), cliq=list([gl, gr, "#000", g]))
                    cna_interval_data[g] = dict()
                if sample2ty[sample] not in cna_interval_data[g]:
                    cna_interval_data[g][sample2ty[sample]] = list()
                #cna_interval_data[g].append(dict(cancer_type=sample2ty[sample], seg=list()))
                                    
                tmp_pat_seg = list()
                for il, ir, iw in interval_db[sample][chrom]:
                    if iw > ac and 'amp' in ty and not(gl-range_cna > ir or gr+range_cna < il):
                        tmp_pat_seg.append(dict(name=g, start=il, end=ir, sample=sample, ty='amp', amp=iw, dataset=dataset))
                    if iw < dc and 'del' in ty and not(gl-range_cna > ir or gr+range_cna < il):
                        tmp_pat_seg.append(dict(name=g, start=il, end=ir, sample=sample, ty='del', amp=iw, dataset=dataset))
            
                if 'fus' in ty:
                    tmp_pat_seg.append(dict(name=g, start="", end="", sample=sample, ty='fus', amp=0.00, dataset=dataset))
                        
                cna_interval_data[g][sample2ty[sample]].append(tmp_pat_seg)    
    return cna_interval_data


def CNA_processing(runCancer, cancerDir, t_amp, t_del, gene_db):
    import cnas
    # Load index of single cancer CNA files
    individual_tys_and_paths = [ [runCancer, cancerDir] ]
    
    pan_tys_paths = [['PAN', None]]
    focal_matrix_path = individual_tys_and_paths

    M = MutationData()
    # fetch target that consistency cross multiple cancers, define targets by Zack et al genes, and Census genes
    target, sample2ty, mTable, missingpeak = cnas.check_consistency_cross_cancers(individual_tys_and_paths, pan_tys_paths, gene_db, ZACK_AMP, ZACK_DEL, CENSUS)

    # based on targets, get calling from GISTIC2 matrix
    G2_M = cnas.readGistic2_focal(focal_matrix_path, t_amp, t_del)  # 2 for 0.9, -0.9, 1 for 0.1, -0.1
    
    # output focal Matrix
    cnas.focalMatrixProcessing(M, G2_M, target[AMP], target[DEL], sample2ty)

    return M

def parse_gistic2( input_directory, dataset, amp_cutoff, del_cutoff, cna_consistency_threshold,
                   range_cna, sampleToMuts, geneToCases, sampleWhitelist ):
    if os.path.exists(input_directory + "/" + focalSegs):
        interval_file = input_directory + "/" + focalSegs
    else:
        print "Ooops! ", input_directory, " does not have a valid CNA segmentation file named", focalSegs, "!"
        exit(1)

    if not (os.path.exists(input_directory + "/" + ampPeak) and os.path.exists(input_directory + "/" + delPeak) and os.path.exists(input_directory + "/" + focalMatrix)):    
        print "Ooops! No valid rCNA files!"
        exit(1)

    gene_db = json.load(open(GENE))
    # for CNA-browser: read interval inforamtion

    interval_db = defaultdict(dict)
    for l in open(interval_file):
        if not l.startswith("Sample"):
            v = l.rstrip().split()
            patient_id = parse_sample_name(v[0].split("-"))
            if v[1] not in interval_db[patient_id]:
                interval_db[patient_id][v[1]] = list()
                interval_db[patient_id][v[1]].append([int(v[2]), int(v[3]), float(v[5])])
            else:
                interval_db[patient_id][v[1]].append([int(v[2]), int(v[3]), float(v[5])])

    M = CNA_processing(dataset, input_directory, amp_cutoff, del_cutoff, gene_db)
    
    # Load mutation data (if necessary)
    sample2ty, gene2cases = load_mutation_data(M, dataset, cna_consistency_threshold)
    n = len(M.patients())
    #print n, len(sample2ty), len(gene2cases)    
     
    #print n, len(sample2ty), len(gene2cases)
    # Create output directory

    # Declare variables used to keep track of output
            
    # for CNA-browser: cna_interval_data: output cna json
    
    cna_interval_data = create_cna_data(gene2cases, dataset, interval_db, gene_db, sample2ty, range_cna, amp_cutoff, del_cutoff)

    # Convert the data into MAGI format, and update the 
    cnas = defaultdict(lambda: dict(segments=defaultdict(list)))
    numCNAs = 0
    for gene, datasetToSegments in cna_interval_data.iteritems():
        for dataset, segments in datasetToSegments.iteritems():
            for sampleSegments in segments:
                for segment in sampleSegments:
                    sample = segment['sample']
                    cnaTy = segment['ty'] 
                    if not sampleWhitelist or (sampleWhitelist and sample in sampleWhitelist):
                        cnas[gene]['segments'][sample].append( segment )
                        numCNAs += 1
                        if geneToCases:
                            geneToCases[gene][sample].add( cnaTy if cnaTy else "cna" )
                        if sampleToMuts:
                            sampleToMuts[sample].add(gene)

    for g, d in cnas.iteritems():
        d['segments'] = [ dict(sample=sample, segments=d['segments'][sample]) for sample in d['segments']]

    return cnas, numCNAs

# Main function
def run(args):
    cna_interval_data = parse_gistic2(args.input_directory, args.dataset, args.amp_cutoff, args.del_cutoff,
                                      args.cna_consistency_threshold, args.range_cna, None, None, None)

    if args.output_directory:
        output_dir = "%s/" % (args.output_directory)
        try: os.makedirs( output_dir )
        except OSError: pass
        fout = open(output_dir + "/"+ args.dataset + "_cna.tsv", "w")
        #fout.write("\t".join(['Gene', 'Sample ID', 'CNA Type', 'Left', 'Right', 'Amplitude'])+"\n")
        fout.write("\t".join(['Gene', 'Sample ID', 'CNA Type', 'Left', 'Right'])+"\n")
        for g in cna_interval_data.keys():
            for cancer_type in cna_interval_data[g].keys():
               for seg_db in cna_interval_data[g][cancer_type]:
                    for seg_info in seg_db:
                        #fout.write("\t".join([str(s) for s in [g, seg_info['pat'], seg_info['type'], seg_info['x0'], seg_info['x1'], seg_info['amp']]])+"\n")
                        fout.write("\t".join([str(s) for s in [g, seg_info['pat'], seg_info['type'], seg_info['x0'], seg_info['x1']]])+"\n")

        fout.close()    
    return cna_interval_data

def get_parser():
    description = 'Creates CNA to TSV data for MAGI.'
    parser = argparse.ArgumentParser(description=description)    
    parser.add_argument('-d', '--dataset', required=True)
    parser.add_argument('-i', '--input_directory', required=True,
                        help='Directory containing GISTIC2 output files.')
    parser.add_argument('-range', '--range_cna', default=500000, type=int,
                        help='Tolerant range of CNA are included in the browser.')
    parser.add_argument('-ac', '--amp_cutoff', default=0.3, type=float,
                        help='Amplification changes to be considered.')
    parser.add_argument('-dc', '--del_cutoff', default=-0.3, type=float,
                        help='Deletion changes to be considered.')
    parser.add_argument('-cct', '--cna_consistency_threshold', default=0.75, type=float,
                        help='CNA cna_consistency_threshold to be considered.')    
    parser.add_argument('-o', '--output_directory', required=False, default=None, help='Output directory.')

    return parser

if __name__ == "__main__": run( get_parser().parse_args(sys.argv[1:]) )
