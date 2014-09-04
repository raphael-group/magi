# MAGI
This repository contains the code to run a webserver based on the [GD3](https://github.com/raphael-group/gd3) suite of genomic visualization tools. The server allows you to query a set of genes' mutations in cohorts of tumors, and to see mutations and protein-protein interactions among those genes.

The site consists of two main pages:

1. The `index` page allows the user to choose his/her query genes and datasets.
2. The `view` page displays the GD3 visualizations for the given query genes and datasets. The `view` is an AngularJS app. The Angular controller for the `view` takes the genes and datasets encoded in the query params, and makes a GET request to the server for a JSON object, and then uses Angular-D3 directives to render the resulting visualizations.

## Dependencies

* [Node.js](http://nodejs.org/) and [NPM](https://www.npmjs.org/) (generally included with Node.js).
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