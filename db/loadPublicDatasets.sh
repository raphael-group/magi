#!/usr/bin/python

for db in blca brca coadread gbm hnsc kirc laml luad lusc ov ucec;
do
	# Create a capitalized version as well
	CANCER_TYPE=`echo $db | tr '[:lower:]' '[:upper:]'`
	echo $CANCER_TYPE

	# Skip LAML CNAs
	DATA=../data/datasets/magi-format/tcga-pancancer/$db
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
		-acf ../data/datasets/magi-format/annotation-colors.tsv
done

# TCGA STAD Nature (2014)
echo "TCGA STAD (Nature 2014)"
DATA=../data/datasets/magi-format/tcga-publications/stad/
python loadDataset.py --is_public -c stad -dn STAD -gn "TCGA Publications" \
	-mn "Expression" -dmf $DATA/tcga-stad-expression.txt \
	-sf $DATA/tcga-stad-snvs.tsv -sft MAGI \
	-cf $DATA/tcga-stad-cnas.tsv -cft MAGI \
	-saf $DATA/tcga-stad-sample-annotations-purity-gender-survival.tsv \
	-acf ../data/datasets/magi-format/annotation-colors.tsv
