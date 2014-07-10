#!/usr/bin/python

# Load required modules
import re, sys, math, os, json

# Hard-code locations of transcript annotations
transcriptFile = dict(refseq="refseq_transcript_lengths_new.json",
                      ensembl="ensembl_transcript_lengths_new.json")
# Parse args
def parse_args(input_list=None):
    # Parse arguments
    import argparse
    class Args: pass
    args = Args()
    description = ''
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument('-m', '--maf_file', required=True, help='MAF file.')
    parser.add_argument('-t', '--transcript_db', required=True,
                        choices=['refseq', 'ensembl'])
    parser.add_argument('-o', '--output_prefix', required=True, help='Output prefix.')

    if input_list: parser.parse_args(input_list, namespace=args)
    else: parser.parse_args(namespace=args)

    return args

################################################################################
# Parse the different mutation formats to get the amino acid change
def snp_mutation( aa_change ):
    # parsing SNP, DNP and TNP
    aao, aan, aaloc = "", "", ""
    
    # capture formats like p.A222Q, p.*222Q, p.222Q, p.A222*
    if re.search(r'p.([a-zA-z*_]+)?(\d+)([a-zA-Z*_]+)', aa_change): 
        aao = re.search(r'p.([a-zA-Z*_]+)?(\d+)([a-zA-Z*_]+)', aa_change).group(1)
        aan = re.search(r'p.([a-zA-Z*]+)?(\d+)([a-zA-Z*_]+)', aa_change).group(3)
        aaloc = re.search(r'p.([a-zA-Z*_]+)?(\d+)([a-zA-Z*_]+)', aa_change).group(2)  
        if not aao:
            aao = ""
    else:
        sys.stderr.write("Error format can't be parsed: " + aa_change + "\n")
        raise ValueError("Error format can't be parsed: " + aa_change + "\n")

    return aao, aan, aaloc

def splice_site_mutation(aa_change, codon):
    aao, aan, aaloc = "", "", ""

    # cpauter formats like p.A222_splice or e20-1
    if re.search(r'^p\.[A-Z]\d+_splice', aa_change):
        aao = aa_change[2]
        aan = 'splice'
        aaloc = aa_change[3:-7]                             
    #elif re.search(r'p.([\w*]+)?(\d+)([\w*]+)', aa_change):
    #    aao = re.search(r'p.([\w*]+)?(\d+)([\w*]+)', aa_change).group(1)
    #    aan = re.search(r'p.([\w*]+)?(\d+)([\w*]+)', aa_change).group(3)
    #    aaloc = re.search(r'p.([\w*]+)?(\d+)([\w*]+)', aa_change).group(2)  
    #    aao = "" if aao == None
    elif re.search(r'^e', aa_change) and re.search(r'c\.(\d+)(\+|\-)(\d+)', codon):
        aao = 'splice'
        aan = 'splice'
        aaloc = int(math.ceil( float(re.search(r'^c\.(\d+)(\+|\-)(\d+)', codon).group(1)) / 3))
    else:
        sys.stderr.write("Error format can't be parsed: " + aa_change + "\n")
        raise ValueError("Error format can't be parsed: " + aa_change + "\n")

    return aao, aan, aaloc

def ins_del_mutation(aa_change, codon):
    aao, aan, aaloc = "", "", ""

    # capture formats like p.A222Q, p.*222Q, p.222Q, p.A222*, inframe_shift, or splice format
    if re.search(r'p.([a-zA-Z*_]+)?(\d+)([a-zA-Z*_]+)', aa_change):
        aao = re.search(r'p.([a-zA-Z*_]+)?(\d+)([a-zA-Z*_]+)', aa_change).group(1)
        aan = re.search(r'p.([a-zA-Z*_]+)?(\d+)([a-zA-Z*_]+)', aa_change).group(3)
        aaloc = re.search(r'p.([a-zA-Z*_]+)?(\d+)([a-zA-Z*_]+)', aa_change).group(2)
        if not aao:
            aao = ""
    elif re.search(r'p.(\d+)_(\d+)(\w+)', aa_change):
        aao = re.search(r'p.(\d+)_(\d+)(\w+)', aa_change).group(3)
        aan = re.search(r'p.(\d+)_(\d+)(\w+)', aa_change).group(3)
        aaloc = re.search(r'p.(\d+)_(\d+)(\w+)', aa_change).group(1)                                                
        aaloc2 = re.search(r'p.(\d+)_(\d+)(\w+)', aa_change).group(2)
        if aaloc == aaloc2:
            aaloc2 = -1
    elif re.search(r'^e', aa_change) and re.search(r'^c\.(\d+)(\+|\-)(\d+)', codon): 
        aao = 'splice'
        aan = 'splice'
        aaloc =  math.ceil(float(re.search(r'^c\.(\d+)(\+|\-)(\d+)', codon).group(1))/3)                
    else:
        sys.stderr.write("Error format can't be parsed: " + aa_change + "\n")
        raise ValueError("Error format can't be parsed: " + aa_change + "\n")
    
    return aao, aan, aaloc

################################################################################
# Parse the MAF

## Parse the MAF's header ##
# 
def first_match( arr, names ):
    for i in range(len(arr)):
        if arr[i] in names:
            return i
    raise IndexError("Names %s not found" % str(names))

def parse_indices( arr ):
    # VERY IMPORTANT 
    # MAKE SURE THAT TERMS ARE ALL LOWER CASE

    hugo = ["hugo_symbol"]  # GENE NAME
    tumor = ["tumor_sample_barcode"]	# SAMPLE NAME
    classtype = ["variant_classification"]	# SILENT OR NOT
    validstat = ["validation_status"] # FOR WILDTYPE CHECKING
    mutstat = ["mutation_status"] # FOR GERMLINE CHECKING
    mutty = ["variant_type"] # MUTATION TYPE
    loc = ["start_position"] # FOR POSITION OF MUTATION
    codon = ["codon_change", "c_position", "c_position_wu", "chromchange"] # CODON
    aachange = ["protein_change", "amino_acid_change", "aachange", "amino_acid_change_wu"] # Protein change
    transcript_id = ["refseq_mrna_id", "transcript_name", "transcript_name_wu", "transcriptid"]

    header_terms = [hugo, tumor, classtype, mutty, validstat, mutstat,
                    loc, transcript_id, codon, aachange]
    arr = map(str.lower, arr)

    return [ first_match(arr, ts) for ts in header_terms ]

## Determine the amino acid change given the variant type ##
def amino_acid_change( aa_change, var_ty, var_class, codon ):
    de_novo = re.compile('De_novo*')
    if aa_change not in ("N/A", ".", "NULL") and aa_change:
        if var_ty in ("SNP", "DNP", "TNP"):
            if var_class in ("Missense_Mutation", "Nonsense_Mutation", "RNA", "Translation_Start_Site"):
                aao, aan, aaloc = snp_mutation(aa_change)
            elif var_class == "Splice_Site":
                aao, aan, aaloc = splice_site_mutation(aa_change, codon)
            #no longer available type in current MAF format skip.
            elif de_novo.match(var_class) or var_class == '5\'Flank' or var_class == 'Read-through' or var_class == "Nonstop_Mutation":
                return None, None, None
            else:
                sys.stderr.write("New mutation effect can't be parsed: %s\n" % var_class)
                exit(1)

        elif var_ty in ("DEL", "INS"):
            aao, aan, aaloc = ins_del_mutation(aa_change, codon)
        else:
            sys.stderr.write("New mutation type can't be parsed: %s\n" % var_ty)
            exit(1)
    else:
        return None, None, None

    return aao, aan, aaloc         

# Shorten the TCGA sample names (if necessary)
def parse_sample_name( arr ):
    if "TCGA" not in arr: return "-".join(arr)
    else:
        start = arr.index("TCGA")
        return "-".join(arr[start:start+3])
                                    
def parse_maf( maf_file, transcripts ):
    # Load the MAF
    from collections import defaultdict
    sample2inactive = defaultdict(set)
    gene2mutations  = defaultdict(dict)
    genes, samples, mut_tys = set(), set(), set()
    missing_transcripts = set()

    # Create a "no transcript"
    NO_TRANSCRIPT = '--'

    with open(maf_file) as MAF:
        # Parse the header of the MAF file
        indices = parse_indices( MAF.readline().rstrip().split("\t") )
        for line in MAF:
            arr = line.rstrip().split("\t")
            gene, sample, var_class, var_ty, val_stat = [arr[i] for i in indices[:5]]
            mut_stat, loc, transcript, codon, aa_change = [arr[i] for i in indices[5:]]

            sample = parse_sample_name( sample.split("-") )

            # Record the mutation type, sample ID, and gene name
            mut_tys.add( var_class )
            genes.add(gene)
            samples.add( sample )

            if var_class not in ("Silent", "Intron", "3'UTR", "5'UTR"):
                if val_stat != 'Wildtype' and mut_stat != 'Germline':
                    # print var_class, var_ty, val_stat, mut_stat, loc, "[%s]" % aa_change
                    # Parse the amino acid change and location
                    try:
                        aao, aan, loc = amino_acid_change(aa_change, var_ty, var_class, codon)
                    except ValueError:
                        continue

                    # Construct the mutation if there is an amino acid change
                    if aao and aan and loc:
                        mut = dict( sample=sample, ty=var_class, aao=aao,
                                    aan=aan, locus=loc)
                        #deal with version issues
                        if '.' in transcript:
                            transcript = transcript.split('.')[0]
                        if transcript not in transcripts:
                            missing_transcripts.add( transcript )
                            transcript = NO_TRANSCRIPT
                            length = '--'
                        else:
                            length  = transcripts[transcript]

                        if transcript in gene2mutations[gene]:
                            gene2mutations[gene][transcript]['mutations'].append( mut )
                        else:
                            transcript_info = dict(mutations=[mut], length=length)
                            gene2mutations[gene][transcript] = transcript_info
                            
            
    # Print summary to STDOUT
    print "SUMMARY OF MUTATION DATA"
    print "* Samples:", len(samples)
    print "* Genes:", len(genes)
    print "* Mutation types:", ", ".join(sorted(mut_tys))
    print "* Number of missing transcripts:", len(missing_transcripts)

    return gene2mutations, samples

################################################################################
# Main function
def run( args ):
    # Load the transcript information and then parse the MAF
    transcripts = json.load( open(transcriptFile[args.transcript_db]) )
    gene2transcripts, samples = parse_maf( args.maf_file, transcripts )

    #  Output as TSV file
    header = "#Gene\tSample\tTranscript\tTranscript_Length\tLocus\t"\
             "Mutation_Type\tOriginal_Amino_Acid\tNew_Amino_Acid"
    tbl = [ header ]
    for gene, transcripts in gene2transcripts.iteritems():
        for t, transcript_data in transcripts.iteritems():
            
            # Extract mutations and transcript length
            mutations = transcript_data['mutations']
            length    = transcript_data['length']

            # Iterate through the mutations and add each to the output table
            for mut in mutations:
                # Parse mutation
                sample, mut_ty = mut['sample'], mut['ty']
                aao, aan, locus = mut['aao'], mut['aan'], mut['locus']

                # Add a new row
                row = [gene, sample, t, length, locus, mut_ty, aao, aan ]
                tbl.append( "\t".join( map(str, row) ) )

    # Create output files
    open("%s-snvs.tsv" % args.output_prefix, "w").write( "\n".join( sorted(tbl) ) )
    open("%s-samples.tsv" % args.output_prefix, "w").write( "\n".join( sorted(samples) ) )


if __name__ == '__main__': run( parse_args() )
