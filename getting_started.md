# Find The Masks

The goal of this document is get the site and backend working locally on your development host as quickly as possible.  More in depth detail is available elsewhere (like in the code).


## Setup


### Public Site

#### Running locally

Install `node >= 12.x.x` and `npm`: https://nodejs.org/en/download/.

If you are on Linux or macOS you can install using either [n](https://github.com/tj/n) or [nvm](https://github.com/nvm-sh/nvm)

From the root directory of this repo:

```
$ ./local_setup.sh
$ npm install
$ npm run dev
```

#### Running in docker (optional)

Requirements:
* docker
* docker-compose

Two very simple steps:
1. Run `docker-compose build`
2. Run `docker-compose up`

This starts Find The Masks server in a docker container using nodemon and mounts this directory to the container.

If you make any changes to the code and save them, nodemon automatically detects them and restarts node server that runs in the container. 

Then you can open http://localhost:3000/ (or http://local.findthemasks.com:3000) in your browser.  If everything is working you should be able to see the dynamically populated "List of Donation Sites"

### `data.json`

We are still working on a simple way for devs to swap in their own test spreadsheet for testing purposes ([Issue #185](https://github.com/findthemasks/findthemasks/issues/185))

First, run the npm install to populate the local `node_modules/` cache

```
$ cd functions/
$ npm install
```

For now you can hack things into place.  After starting a NodeJS REPL, you can seed the current data and then use it in the REPL:

```
$ node
> .load index.js
> get_live_data()
> dbl = toDataByLocation(data_static)
```

* (TODO) Running firebase locally

## Architecture Overview

### Public Site

* `index.html` reads `data.json`
    * `data.json` is stored in a Firebase bucket, and is edited by running a firebase function that reads from Google Sheets and writes into Firebase.
* A javascript function then applies filters and converts the relevant data from `data.json` into HTML, injecting it into the DOM.

### Updating `data.json`

* Firebase function `/reloadsheetdata` is called
* `snapshotData` is triggered, which
    * grabs the contents of the spreadsheet at `CONFIG_SHEET_ID` and saves it as JSON to a Firebase bucket as `data.json`
    * formats the same data as HTML and saves it to a different Firebase bucket file `data_snippet.html`

### Submission Workflow

This is the current Google Forms process:
	1.	User submits form in some language (e.g. French)
	2.	AppScript converts the "enum" categories to English so that filtering can be applied in a single language
	3.	Sheet written to data.json file
	4.	App loads sheet and renders it
