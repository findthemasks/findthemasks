# Find The Masks

The goal of this document is get the site and backend working locally on your development host as quickly as possible.  More in depth detail is available elsewhere (like in the code).


## Setup


### Public Site

```
$ cd functions/
$ npm install
$ npm install -g http-server
$ cd ..
$ http-server
```

Then you can open http://localhost:8080/ in your browser.  If everything is working you should be able to see the dynamically populated "List of Donation Sites"

### `data.json`

We are still working on a simple way for devs to swap in their own test spreadsheet for testing purposes ([Issue #185](https://github.com/r-pop/findthemasks/issues/185))

For now you can hack things into place.  After starting a NodeJS REPL, you can seed the current data and then use it in the REPL:

```
$ node
> .load index.js
> get_live_data()
> dbl = toDataByLocation(static_data)
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

TODO
