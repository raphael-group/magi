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
* [Python](https://www.python.org/). Tested with version 2.7.x.
    * [PyMongo](https://api.mongodb.org/python/current/installation.html) to load data into MAGI.
    * [Numpy](http://www.numpy.org/), [SciPy](http://scikit-learn.org/stable/), and [Scikit-Learn](http://www.scipy.org/) to compute the statistical association of mutations with different sample annotations/categories, or the (dis)similarity of different sample annotations/categories.

* [Postgres](https://wiki.postgresql.org/wiki/Detailed_installation_guides)
MAGI has been tested on both Linux and Mac systems using Chrome, Firefox, and Safari.

* [librsvg](https://wiki.gnome.org/action/show/Projects/LibRsvg?action=show&redirect=LibRsvg). MAGI requires librsvg for converting figures to PNG/PDF format. You can install librsvg on Mac OS X with [Homebrew](http://brew.sh/):

        brew install librsvg

### Setup ###

1. Clone the repository:

        git clone https://github.com/raphael-group/magi.git
        cd magi

2. Install required dependencies:

        npm install

3. Clone the latest version of GD3:

        cd public/components/
        git clone https://github.com/raphael-group/gd3
        cd ../../

4. Start MongoDB and create a Postgresql database:

        mongod &
        postgres createdb $POSTGRES_DBNAME

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

        node server

8. View the website at `http://localhost:8000/`.

### Configuration ###

Users can customize MAGI and integrate it with different APIs by setting Linux environment variables. (For a quick tutorial, see [this blog post on Digital Ocean](https://www.digitalocean.com/community/tutorials/how-to-read-and-set-environmental-and-shell-variables-on-a-linux-vps).)

1. **Mode**. You can run MAGI in either development or production mode, by setting the `NODE_ENV` environment variable. For example,

        export NODE_ENV="development"
   Development mode has more verbose error reports, while production mode requires a site URL (see below).

2. **Authentication**. MAGI uses the Google OpenID Connect protocol for authentication. To set up authentication on your own personal version of MAGI, visit the [Google OAuth2 documentation](https://developers.google.com/accounts/docs/OAuth2) and obtain credentials. Then set the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables. If you do not set up authentication, you will not be able to use the `/upload` feature, and attempting to "Login via Google" will result in server errors. You will, however, be able to view public datasets and upload additional datasets to MongoDB from the command line.
3. **Site URL**. In development mode, MAGI automatically uses `"localhost"` as the site URL. In production mode, you will need to set a site URL. For example, if you hosting MAGI on `http://magi.cs.brown.edu`, you would do the following:

        export SITE_URL="http://magi.cs.brown.edu"

4. **Port**. By default, MAGI serves on port 8000, but you can choose your own port by setting the `PORT` environment variable.
5. **MongoDB**. By default, MAGI assumes that MongoDB is running on the `"localhost"` server using a database named `"magi"`. You can configure to look for data on a different server or in a different database using the `MONGO_HOST` and/or `MONGO_DB_NAME` environment variables.  If you use a non-standard port for Mongo, you can set the `MONGO_PORT` environment variable accordingly.
6. **Feedback**. MAGI uses [WebEngage](https://webengage.com/) for collecting feedback from users. If you want to use WebEngage for your own version of MAGI, you first need to set up an account on the WebEngage website. Then, you can configure MAGI to use your account by setting the `WEBENGAGE_ID` environment variable to use your site's WebEngage ID.
7. **Webmaster tools**. In order to use Google and Bing's webmaster tools, you need to serve a file from your web server. MAGI can be configured to do this automatically by setting the `GOOGLE_SEO_ROUTE`, `GOOGLE_SEO_ROUTE_NAME`, and/or `BING_SEO_ROUTE` environment variables. First, place the files in the MAGI directory, and then point to them using the environment variables.
8. **Postgres server**  The `POSTGRES_DBNAME`, `POSTGRES_HOST`, `POSTGRES_PORT`, and `POSTGRES_USER` should be set to the database name, host machine, port, and postgres user that was used to create the database.

Defaults are assumed if values are not provided.  If you did not specify a dbname, "magi" is assumed by default. Localhost is assumed to be the postgres host.  If you did not specify a port, it is assumed that postgres runs on port 5432 by default.  If you did not specify a user, the user defaults to postgres.

### Support ###

MAGI was created and is maintained by the [Raphael research group](http://compbio.cs.brown.edu) in the [Center for Computational Molecular Biology](http://brown.edu/ccmb) and the [Department of Computer Science](http://cs.brown.edu) at [Brown University](http://brown.edu). We offer support for MAGI on the [MAGI Google Group](https://groups.google.com/forum/#!forum/magi-app), or please visit the group website to contact us.

### Citation ###

If you use MAGI in your work please cite

>>> M.D.M. Leiserson, C.C. Gramazio, J. Hu, H-T. Wu, D.H. Laidlaw, B.J. Raphael. MAGI: visualization and collaborative annotation of genomic aberrations. *Nature Methods* **12**, 483-484 (2015). [Publink](http://www.nature.com/nmeth/journal/v12/n6/full/nmeth.3412.html).
