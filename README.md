# gd3 server
This repository contains the code to run a webserver based on the gd3 suite of genomic visualization tools. The server allows you to query a set of genes' mutations in cohorts of tumors, and to see mutations and protein-protein interactions among those genes.

The site consists of two pages:

1. The `index` page allows the user to choose his/her query genes and datasets.
2. The `view` page displays the gd3 visualizations for the given query genes and datasets. The `view` is an AngularJS app. The Angular controller for the `view` takes the genes and datasets encoded in the query params, and makes a GET request to the server for a JSON object, and then uses Angular-D3 directives to render the resulting visualizations.

## Setup

1. Clone the repository:

        git clone https://<user>@bitbucket.org/raphaellab/gd3-server.git

2. Install required dependencies:

        npm install

3. Install MongoDB, following the instructions at http://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/

4. Start MongoDB:

        mongod

5. Start the server (default port 8000):

        node server.js

6. View the website at `http://localhost:8000/`.

## Organization
* `data/parsers`: Node.js scripts for loading TSV files into Mongo. To add data to the database, put TSV files containing mutation data, protein-protein interactions, and transcript domain locations in `data/` and load them using the parsers. 
* `model/`: the models for the server. These scripts define the schemas for each document in Mongo, and also contain functions for loading data in TSV files into the database, and for making specific queries of the database.
* `public/components`: contains all Bower components.
* `public/js`: Javascript for the AngularJS app.
* `public/js/gd3`: the gd3 visualization scripts.
* `routes/`: implementation of all the routes the server provides.