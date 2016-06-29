#!/bin/bash

################################################################################
# SETTINGS, FILES, AND DIRECTORIES
################################################################################

# Settings
source ENVIRONMENT

# Directories
MAGI_DIR=`pwd`
DATA_DIR=$MAGI_DIR/data
DB_DIR=$MAGI_DIR/db

################################################################################
# INSTALL DEPENDENCIES
################################################################################

npm install
pip install -r requirements.txt

################################################################################
# DOWNLOAD DATA
################################################################################

wget http://compbio-research.cs.brown.edu/software/magi/data/archives/latest.tar
tar -xvzf latest.tar.gz
rm latest.tar.gz

################################################################################
# LOAD SUPPORTING DATA
################################################################################

cd $DB_DIR

# Load genome information
node loadGenome.js --genome_file=$DATA_DIR/genome/hg19_genes_list.tsv

# Load transcripts with protein sequences and phosphosite annotations
python loadTranscripts.py -tf $DATA_DIR/proteome/output/refseq-protein-sequence.tsv \
    -df $DATA_DIR/domains/refseq_transcript_domains.tsv \
    -tdn RefSeq \
    -af $DATA_DIR/proteome/output/phosphosite-human-annotated-sites.tsv

python loadTranscripts.py -tf $DATA_DIR/proteome/output/ensembl-protein-sequence.tsv \
    -df $DATA_DIR/domains/ensembl_transcript_domains.tsv \
    -tdn Ensembl \
    -af $DATA_DIR/proteome/output/phosphosite-human-annotated-sites.tsv

# Load cancer with colors and abbreviations
node loadCancers.js --cancers_file=$DATA_DIR/icgc-tcga-cancers.tsv

# Load pathways
node loadKnownGeneSets.js --gene_set_file=$DATA_DIR/pathways/kegg/kegg-pathways.tsv --dataset="KEGG"
node loadKnownGeneSets.js --gene_set_file=$DATA_DIR/pathways/pindb/pindb-complexes.tsv --dataset="PINdb"

################################################################################
# LOAD PUBLIC DATASETS
################################################################################
echo "Loading public datasets..."
for db in blca brca coadread gbm hnsc kirc laml luad lusc ov ucec;
do
    continue
	# Create a capitalized version as well
	CANCER_TYPE=`echo $db | tr '[:lower:]' '[:upper:]'`
	echo "- $CANCER_TYPE"

	# Skip LAML CNAs
	DATA=$DATA_DIR/datasets/magi-format/tcga-pancancer/$db
	if [ "$db" != "laml" ]
	then
		CNA_ARG="-cf $DATA/tcga-pancancer-$db-cnas.tsv -cft MAGI "
	else
		CNA_ARG=""
	fi

	if [ "$db" == "brca" ]
	then
		SAF_ARG="$DATA/tcga-pancancer-brca-sample-annotations-purity-gender-survival-expression-subtype.tsv"
	else
		SAF_ARG="$DATA/tcga-pancancer-$db-sample-annotations-purity-gender-survival.tsv"
	fi

	python loadDataset.py --is_public -c $db -dn $CANCER_TYPE -gn "TCGA Pan-Cancer" \
		-mn "Expression" -dmf $DATA/tcga-pancancer-$db-expression.txt \
		-sf $DATA/tcga-pancancer-$db-snvs.tsv -sft MAGI $CNA_ARG -saf $SAF_ARG \
		-acf $DATA_DIR/datasets/magi-format/annotation-colors.tsv
done

# TCGA STAD Nature (2014)
echo "- TCGA STAD (Nature 2014)"
DATA=$DATA_DIR/datasets/magi-format/tcga-publications/stad/
python loadDataset.py --is_public -c stad -dn STAD -gn "TCGA Publications" \
	-mn "Expression" -dmf $DATA/tcga-stad-expression.txt \
	-sf $DATA/tcga-stad-snvs.tsv -sft MAGI \
	-cf $DATA/tcga-stad-cnas.tsv -cft MAGI \
	-saf $DATA/tcga-stad-sample-annotations-purity-gender-survival.tsv \
	-acf $DATA_DIR/datasets/magi-format/annotation-colors.tsv
