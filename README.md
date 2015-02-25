# MAGI

<a href="http://magi.cs.brown.edu"><img src="http://magi.cs.brown.edu/img/magiTitle.svg" width="200px" align="left" hspace="10" vspace="6"></a>

**MAGI** is a platform for interactive visualization and collaborative annotation of combinations of genetic aberrations. MAGI allows users to upload their own private datasets and view and annotate them in combination with public datasets.

This repository contains the source code for MAGI. MAGI is written in [Node.js](http://nodejs.org/) with a [MongoDB](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/) database. MAGI uses [D3](http://d3js.org/), [jQuery](http://jquery.com/), and [GD3](github.com/raphael-group/gd3) on the front-end. Below, we describe how to get a version of MAGI running on your personal machine.

## Dependencies

* [Node.js](http://nodejs.org/) and [NPM](https://www.npmjs.org/) (included with Node.js).
* [MongoDB](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/). Make sure you can run `mongod` from your terminal. Some basic debugging tips are:
   1. Make sure that you make a directory to store the database. The default is `/data/db`,
      so you'll need to make that directory before running `mongod`.
   2. Make sure that the `mongod`, `mongo`, etc. are in your `PATH`.

## Setup

1. Clone the repository:

        git clone https://<user>@bitbucket.org/raphaellab/magi.git

2. Install required dependencies:

        npm install

3. Start MongoDB:

        mongod &

4. Start the server (default port 8000):

        node server.js

5. Load data in the following order:

   * PPIs (hint, hprd, iref, multinet)
   * Cancers
   * Genome
   * Domains
   * Pathways (kegg, pindb)
   * Mutations (pancan-hotnet2 (regenerate_pancan_data.sh), tcga-gastric) -- loadDataset

6. View the website at `http://localhost:8000/`.
