#!/bin/sh

node loadDataset.js --snv_file=../mutation/pancan-hotnet2/blca-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/blca-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/blca-pancan-samples.tsv \
	--db_name="BLCA" --group_name="TCGA Pan-Can" --color="#A6CEE3"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/brca-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/brca-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/brca-pancan-samples.tsv \
	--db_name="BRCA" --group_name="TCGA Pan-Can" --color="#1F78B4"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/coadread-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/coadread-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/coadread-pancan-samples.tsv \
	--db_name="COADREAD" --group_name="TCGA Pan-Can" --color="#B2DF8A"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/gbm-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/gbm-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/gbm-pancan-samples.tsv \
	--db_name="GBM" --group_name="TCGA Pan-Can" --color="#33A02C"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/hnsc-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/hnsc-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/hnsc-pancan-samples.tsv \
	--db_name="HNSC" --group_name="TCGA Pan-Can" --color="#FB9A99"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/kirc-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/kirc-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/kirc-pancan-samples.tsv \
	--db_name="KIRC" --group_name="TCGA Pan-Can" --color="#E31A1C"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/laml-pancan-snvs.tsv \
	--sample_list=../mutation/pancan-hotnet2/laml-pancan-samples.tsv \
	--db_name="LAML" --group_name="TCGA Pan-Can" --color="#FDBF6F"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/luad-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/luad-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/luad-pancan-samples.tsv \
	--db_name="LUAD" --group_name="TCGA Pan-Can" --color="#FF7F00"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/lusc-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/lusc-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/lusc-pancan-samples.tsv \
	--db_name="LUSC" --group_name="TCGA Pan-Can" --color="#CAB2D6"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/ov-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/ov-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/ov-pancan-samples.tsv \
	--db_name="OV" --group_name="TCGA Pan-Can" --color="#6A3D9A"
node loadDataset.js --snv_file=../mutation/pancan-hotnet2/ucec-pancan-snvs.tsv \
	--cna_file=../mutation/pancan-hotnet2/ucec-pancan-cnas.tsv \
	--sample_list=../mutation/pancan-hotnet2/ucec-pancan-samples.tsv \
	--db_name="UCEC" --group_name="TCGA Pan-Can" --color="#B15928"