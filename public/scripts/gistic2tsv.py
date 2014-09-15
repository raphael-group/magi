#!/usr/bin/python
import sys, os, json
from collections import defaultdict

# Hard-coded locations of transcript DBs
GENE = "hg19_genes_list.json"


def load_mutation_data( sample_file, cna_file, run_cancer):
    # Load sample and gene whitelists. Sample file is required for typing.
    if run_cancer == "PANCAN":
        sample2ty = dict([l.rstrip().split()[0], "PANCAN"] for l in open(sample_file))
    else:
        sample2ty = dict( l.rstrip().split() for l in open(sample_file) if l.rstrip().split()[1] == run_cancer)    
    samples_with_mutation = set() # added by Hsin-Ta, output only samples with mutations

    # Load SNVs
    from collections import defaultdict
    gene2cases = defaultdict(lambda: defaultdict(list))
        
    # Load CNAs
    if cna_file:
        arrs = [ l.rstrip().split("\t") for l in open(cna_file)
                 if not l.startswith("#")]
        cna_ty = dict(D="del", A="amp", R="fus") # Hsin-Ta: added fusion type
        for arr in arrs:
            sample, mutations = arr[0], arr[1:]
            if sample in sample2ty:
                samples_with_mutation.add(sample)
                for g in mutations:
                    name = g[:-3]
                    ty = cna_ty[g[-2]]
                    gene2cases[name][sample].append( ty )

    return sample2ty, gene2cases, samples_with_mutation


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
def create_cna_data(gene2cases, interval_db, gene_db, sample2ty, range_cna, ac, dc):
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
                        tmp_pat_seg.append(dict(x0=il, x1=ir, pat=sample, type='AMP', amp=iw))
                    if iw < dc and 'del' in ty and not(gl-range_cna > ir or gr+range_cna < il):
                        tmp_pat_seg.append(dict(x0=il, x1=ir, pat=sample, type='DEL', amp=iw))
            
                if 'fus' in ty:
                    tmp_pat_seg.append(dict(x0="", x1="", pat=sample, type='FUS', amp=0.00))
                        
                cna_interval_data[g][sample2ty[sample]].append(tmp_pat_seg)    
    return cna_interval_data
            

# Main function
def run(args):
    gene_db = json.load(open(GENE))
    # for CNA-browser: read interval inforamtion
    if args.interval_file:
        interval_db = defaultdict(dict)
        for l in open(args.interval_file):
            if not l.startswith("Sample"):
                v = l.rstrip().split()
                patient_id = "-".join(v[0].split("-")[:3])
                if v[1] not in interval_db[patient_id]:
                    interval_db[patient_id][v[1]] = list()
                    interval_db[patient_id][v[1]].append([int(v[2]), int(v[3]), float(v[5])])
                else:
                    interval_db[patient_id][v[1]].append([int(v[2]), int(v[3]), float(v[5])])

    # Store high-level info about the runs
    runs = []
    
    # Load mutation data (if necessary)
    sample2ty, gene2cases, samples_with_mutation = load_mutation_data(args.sample_file, args.cna_file, args.run)
    n = len(samples_with_mutation)
     
    print n, len(sample2ty), len(gene2cases)
    # Create output directory
    output_dir = "%s/" % (args.output_dir)
    try: os.makedirs( output_dir )
    except OSError: pass

    # Declare variables used to keep track of output
            
    # for CNA-browser: cna_interval_data: output cna json
    
    cna_interval_data = create_cna_data(gene2cases, interval_db, gene_db, sample2ty, args.range_cna, args.amp_cutoff, args.del_cutoff)
    
    fout = open(args.output_dir + "/"+ args.run + "_cna.tsv", "w")
    #fout.write("\t".join(['Gene', 'Sample ID', 'CNA Type', 'Left', 'Right', 'Amplitude'])+"\n")
    fout.write("\t".join(['Gene', 'Sample ID', 'CNA Type', 'Left', 'Right'])+"\n")
    for g in cna_interval_data.keys():
        for cancer_type in cna_interval_data[g].keys():
           for seg_db in cna_interval_data[g][cancer_type]:
                for seg_info in seg_db:
                    #fout.write("\t".join([str(s) for s in [g, seg_info['pat'], seg_info['type'], seg_info['x0'], seg_info['x1'], seg_info['amp']]])+"\n")
                    fout.write("\t".join([str(s) for s in [g, seg_info['pat'], seg_info['type'], seg_info['x0'], seg_info['x1']]])+"\n")

    fout.close()    
    return

def parse_args(input_list=None):
    import argparse
    class Args: pass
    args = Args()
    description = 'Creates CNA to TSV data for MAGI.'
    parser = argparse.ArgumentParser(description=description)    
    parser.add_argument('-n', '--run', required=True)
    parser.add_argument('-cna', '--cna_file', default=None,
                        help='CNA file to use for all input files.')
    parser.add_argument('-interval', '--interval_file', default=None,
                        help='CNA interval file to use for all input files.')
    parser.add_argument('-range', '--range_cna', default=500000, type=int,
                        help='Tolerant range of CNA are included in the browser.')
    parser.add_argument('-a', '--amp_cutoff', default=0.3, type=float,
                        help='Amplification changes to be considered.')
    parser.add_argument('-d', '--del_cutoff', default=-0.3, type=float,
                        help='Deletion changes to be considered.')
    parser.add_argument('-s', '--sample_file', default=None,
                        help='Sample file (space-separated samples and types).')
    parser.add_argument('-o', '--output_dir', required=True,
                    help='Output directory.')

    if input_list:
        parser.parse_args(input_list, namespace=args)
    else:
        parser.parse_args(namespace=args)

    return args

if __name__ == "__main__": run( parse_args() )
