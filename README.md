# MAGI #

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

MAGI has been tested on both Linux and Mac systems using Chrome, Firefox, and Safari.

#### MAGI Annotations ####

Please follow the instructions on setting up [MAGI annotations](https://github.com/raphael-group/magi-annotations) to include protein to include protein-protein interactions and mutation annotations in MAGI.

### Setup ###

Setup consists of five basic steps:

1. Install Node, Python, and MongoDB  (as described above).
2. Create an `ENVIRONMENT` file with your settings. We provide more information below.
3. Run (possibly a subset of the ) commands in `setup.sh` to install dependencies, download data, and initialize the database. We provide more information below.
4. Start the server with `node server`, which serves to `http://localhost:8000` by default.

#### Environment ####

Set the following environment variables to customize MAGI.

##### General #####

| **Name**        | **Default** | **Description**                                           |
| --------------- | ----------- | --------------------------------------------------------- |
| `NODE_ENV`      | development | Environment: production for publicly available on the web, or development for local/testing. |
| `PORT`          | 8080        | Port from which you are serving MAGI                      |
| `SITE_URL`      | localhost   | Domain name from which you are serving MAGI               |
| `MONGO_DB_NAME` | magi        | Name of database in MongoDB you want to use for MAGI      |

##### Third-party services #####

To use authentication with MAGI, you will need to obtain [Google OAuth2](https://developers.google.com/identity/protocols/OAuth2) credentials and set the appropriate environment variables. Similarly, to use the MAGI feedback tool you will need to obtain a [WebEngage](https://webengage.com/) ID.

| **Name**                | **Default** | **Description**                                           |
| ----------------------- | ------------| --------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | None        |  Google OAuth2 client ID                                  |
| `GOOGLE_CLIENT_SECRET`  | None        |  Google OAuth2 client secret                              |
| `WEBENGAGE_ID`          | None        |  WebEngage ID for Javascript SDK integration              |

If you want to be a webmaster for your version of MAGI on Google and Bing, you will need MAGI to serve XML files. Google and Bing will provide the XML files and specific paths/names, which you can set with the following variables.

| **Name**                | **Default** | **Description**                    |
| --------------------    | ------------| ---------------------------------- |
| `GOOGLE_SEO_ROUTE`      | None        |  Local path to Google SEO XML file |
| `GOOGLE_SEO_ROUTE_NAME` | None        |  Name of Google XML file route     |
| `BING_SEO_ROUTE`        | None        |  Local path to Google SEO XML file |

##### MAGI annotations #####

MAGI can retrieve protein-protein interactions and mutation annotations from a MAGI annotations Postgres database. To do so, set the following environment variables.

| **Name**                   | **Default** | **Description**            |
| -------------------------- | ----------- | ---------------------------|
| `POSTGRES_DJANGO_DBNAME`   | magipy      | Name of Postgres database  |
| `POSTGRES_DJANGO_HOST`     | 127.0.0.1   | Name of Postgres host      |
| `POSTGRES_DJANGO_PORT`     | 5432        | Name of Postgres port      |
| `POSTGRES_DJANGO_USER`     | postgres    | Name of Postgres user      |
| `POSTGRES_DJANGO_PASSWORD` | None        | Password for Postgres user |

#### Data ####


### Support ###

MAGI was created and is maintained by the [Raphael research group](http://compbio.cs.brown.edu) in the [Center for Computational Molecular Biology](http://brown.edu/ccmb) and the [Department of Computer Science](http://cs.brown.edu) at [Brown University](http://brown.edu). We offer support for MAGI on the [MAGI Google Group](https://groups.google.com/forum/#!forum/magi-app), or please visit the group website to contact us.

### Citation ###

If you use MAGI in your work please cite

>>> M.D.M. Leiserson, C.C. Gramazio, J. Hu, H-T. Wu, D.H. Laidlaw, B.J. Raphael. MAGI: visualization and collaborative annotation of genomic aberrations. *Nature Methods* **12**, 483-484 (2015). [Publink](http://www.nature.com/nmeth/journal/v12/n6/full/nmeth.3412.html).
