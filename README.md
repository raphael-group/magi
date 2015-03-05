# MAGI

<a href="http://magi.cs.brown.edu"><img src="http://magi.cs.brown.edu/img/magiTitle.svg" width="200px" align="left" hspace="10" vspace="6"></a>

**MAGI** is a platform for interactive visualization and collaborative annotation of combinations of genetic aberrations. MAGI allows users to upload their own private datasets and view and annotate them in combination with public datasets.

This repository contains the source code for MAGI. MAGI is written in [Node.js](http://nodejs.org/) with a [MongoDB](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/) database. MAGI uses [D3](http://d3js.org/), [jQuery](http://jquery.com/), and [GD3](github.com/raphael-group/gd3) on the front-end. Below, we describe how to get a version of MAGI running on your personal machine.

### Dependencies ###

* [Node.js](http://nodejs.org/) and [NPM](https://www.npmjs.org/) (included with Node.js).
* [MongoDB](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/). Make sure you can run `mongod` from your terminal. Some basic debugging tips are:
   1. Make sure that you make a directory to store the database. The default is `/data/db`,
      so you'll need to make that directory before running `mongod`.
   2. Make sure that the `mongod`, `mongo`, etc. are in your `PATH`.

### Setup ###

1. Clone the repository:

        git clone https://<user>@bitbucket.org/raphaellab/magi.git
        cd magi

2. Install required dependencies:

        npm install

3. Clone the latest version of GD3:

        cd public/components/
        git clone https://github.com/raphael-group/gd3
        cd ../../

4. Start MongoDB:

        mongod &

5. Download the [latest tarball of data files](http://compbio-research.cs.brown.edu/software/magi/data/archives/latest.tar) (~300Mb) from the Raphael group website, and untar in the MAGI directory.

        wget http://compbio-research.cs.brown.edu/software/magi/data/archives/latest.tar
        tar -xvf latest.tar

6. Load the data:

        cd db/
        node loadGenome.js --genome_file=../data/genome/hg19_genes_list.tsv
        node loadDomains.js --domain_file=../data/domains/refseq_transcript_domains.tsv
        node loadDomains.js --domain_file=../data/domains/ensembl_transcript_domains.tsv
        node loadCancers.js --cancers_file=../data/icgc-tcga-cancers.tsv
        node loadKnownGeneSets.js --gene_set_file=../data/pathways/kegg/kegg-pathways.tsv --dataset="KEGG"
        node loadKnownGeneSets.js --gene_set_file=../data/pathways/pindb/pindb-complexes.tsv --dataset="PINdb"
        node loadPPIs.js --ppi_file=../data/ppis/hint-annotated.tsv
        node loadPPIs.js --ppi_file=../data/ppis/hprd-annotated.tsv 
        node loadPPIs.js --ppi_file=../data/ppis/iref9-annotated.tsv
        node loadPPIs.js --ppi_file=../data/ppis/multinet.tsv
        sh loadPublicDatasets.sh
        cd ../

7. Start the server (default port 8000):

        node --harmony server

8. View the website at `http://localhost:8000/`.

#### Authentication ####

MAGI uses the Google OAuth2 protocol for authentication. To set up authentication on your own personal version of MAGI:

1. Visit the [Google OAuth2 documentation](https://developers.google.com/accounts/docs/OAuth2) and obtain credentials.
2. Create a JSON file `oauth2.js` with the following format:

        var ids = {
        	google: {
        		clientID: "YOUR_CLIENT_ID",
        		clientSecret: "YOUR_CLIENT_SECRET",
        		callbackURLSuffix: "auth/google/callback"
        	}
        }

        module.exports = ids

If you do not set up authentication, you will not be able to use the `/upload` feature, and attempting to "Login via Google" will result in server errors. You will, however, be able to view public datasets and upload additional datasets to MongoDB from the command line.

### Support ###

MAGI was created and is maintained by the [Raphael research group](http://compbio.cs.brown.edu) in the [Center for Computational Molecular Biology](http://brown.edu/ccmb) and the [Department of Computer Science](http://cs.brown.edu) at [Brown University](http://brown.edu). Please visit the group website to contact us.
