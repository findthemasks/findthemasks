const fetch = require('node-fetch');
const assert = require('assert');

const OSMS_SHARED_VIEW = 'https://airtable.com/shrjbq5Lc5GfY1XxC/tbl2MGCIVfMuZA5Am';

async function getText(url) {
  const response = await fetch(url);
  return await response.text();
}

async function loadData(url, headers) {
  const response = await fetch(url, { headers, redirect: 'follow'});
  const json = await response.json();
  return json;
}

// Given a shared view URL, returns the raw internal airtable REST API data.
async function readAirtableSharedView(sharedViewUrl) {
  const body = await getText(sharedViewUrl);
  const readSharedViewDataRegExp = new RegExp('"\\S*readSharedViewData\\?stringifiedObjectParams\\S*"');
  const headersRegExp = new RegExp('^.*headers = ({.*}).*$', 'm');
  const jsonPath = JSON.parse(body.match(readSharedViewDataRegExp)[0]);
  const headers = JSON.parse(body.match(headersRegExp)[1]);
  headers['x-time-zone'] = 'America/Los_Angeles';
  const url = `https://airtable.com${jsonPath}`;
  return await loadData(url, headers);
}

// the multiSelect and select column types have a "choice" dictionary which
// maps the choice id to { id, name, color }.
function createMultiSelectTranslator(colMetadata) {
  assert(colMetadata.type === 'multiSelect');
  return ids => ids.map(id => colMetadata.typeOptions.choices[id].name).join(',');
}
function createSelectTranslator(colMetadata) {
  assert(colMetadata.type === 'select');
  return id => colMetadata.typeOptions.choices[id].name;
}

function identityTranslator(x) { return x.trim(); }

// Get all the column names and data translation setup.
function mapColumns(airtableDataColumns) {
  // Column types are:
  // "type": "foreignKey",
  // "type": "formula",
  // "type": "grid",
  // "type": "multiSelect",
  // "type": "multilineText",
  // "type": "select",
  // "type": "text",
  const columnNames = {};
  for (const col of airtableDataColumns) {
    const match = col.name.match(/\[(\S+)\]$/);
    if (match) {
      col.ftm_name = match[1];
    }

    col.valueTranslator = identityTranslator;
    if (col.type === 'select') {
      col.valueTranslator = createSelectTranslator(col);
    } else if (col.type === 'multiSelect') {
      col.valueTranslator = createMultiSelectTranslator(col);
    } else if (col.type === 'foreignKey') {
      col.valueTranslator = values => values.map(v => v.foreignRowDisplayName).join(',');
    }

    columnNames[col.id] = col;
  }
  return columnNames;
}

// Takes the airtable json from readSharedViewData and converts it into an array
// of values in the style FindTheMasks expects.
function parseAirtableData(airtableData) {
  const columnNames = mapColumns(airtableData.data.table.columns);

  // Go through data rows and create a data struct for us.
  const data = [];
  for (const row of airtableData.data.table.rows) {
    const entry = {};
    for (const [key, value] of Object.entries(row.cellValuesByColumnId)) {
      if (key in columnNames) {
        const column = columnNames[key];
        entry['row'] = row.id;
        if (column.ftm_name) {
          entry[column.ftm_name] = column.valueTranslator(value);
        } else {
          entry[column.name] = column.valueTranslator(value);
        }
      }
    }

    if (Object.keys(entry).length !== 0) {
      data.push(entry);
    }
  }

  return data;
}

module.exports = { readAirtableSharedView, parseAirtableData, mapColumns, identityTranslator };
