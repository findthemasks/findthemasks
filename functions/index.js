const functions = require('firebase-functions');
const admin = require('firebase-admin');
const csv_stringify = require('csv-stringify');
const {request} = require('gaxios');

admin.initializeApp();

const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');
const Client = require("@googlemaps/google-maps-services-js").Client;

// TODO: Use firebase functions:config:set to configure your googleapi object:
// googleapi.client_id = Google API client ID,
// googleapi.client_secret = client secret, and
// googleapi.sheet_id = Google Sheet id (long string in middle of sheet URL)
let CONFIG_CLIENT_ID = '';
let CONFIG_CLIENT_SECRET = '';
let GOOGLE_MAPS_API_KEY = '';

const SHEETS = {
  at: '19gKSyKmT4yU7F32R3lBM6p0rmMJXusX_uMYDq1CMTIo',
  ca: '1STjEiAZVZncXMCUBkfLumRNk1PySLSmkvZuPqflQ1Yk',
  ch: '1mFbEzrWW8XLfrkAL0eCzGd1pCVNl6-QUxkoeubtdbPI',
  de: '1qiR4JRvPrbOwlPnEXCoUFWpfZtV9xadjBTCOhVy-dJM',
  es: '1S3FO5gmXUvQdsGXjC0hBSUxBJZoaUzy1ctylTjUGOlM',
  fr: '1YGWlGPOfJFEsUP6VTFCVohlsHxKMYA5HppatbLwNBVk',
  gb: '1qPUdGOEZl-c8sQ6Vlm7h48OZScBOVGjzz88AyGCQvEc',
  it: '1YHt6G1ghcXrRqXflevxHAwg2XOXmG2Cym6nSS5vXe7Q',
  pt: '1QnyjUUBT_P476dEl0WfQwVnW15Ie7ogty7DiOkMhHLo',
  us: '1GwP7Ly6iaqgcms0T80QGCNW4y2gJ7tzVND2CktFqnXM',
};

if (functions.config().googleapi !== undefined) {
  CONFIG_CLIENT_ID = functions.config().googleapi.client_id
  CONFIG_CLIENT_SECRET = functions.config().googleapi.client_secret;
  GOOGLE_MAPS_API_KEY = functions.config().findthemasks.geocode_key;
}

const COLUMNS = [
'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM',
'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ'
];
const WRITEBACK_SHEET = "'Combined'";

// The OAuth Callback Redirect.
const FUNCTIONS_REDIRECT = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/oauthcallback`;

// setup for authGoogleAPI
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const functionsOauthClient = new OAuth2Client(CONFIG_CLIENT_ID, CONFIG_CLIENT_SECRET,
  FUNCTIONS_REDIRECT);

// OAuth token cached locally.
let oauthTokens = null;

// visit the URL for this Function to request tokens
module.exports.authgoogleapi = functions.https.onRequest((req, res) => {
  res.set('Cache-Control', 'private, max-age=0, s-maxage=0');
  res.redirect(functionsOauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  }));
});

// setup for OauthCallback
const DB_TOKEN_PATH = '/api_tokens';

// after you grant access, you will be redirected to the URL for this Function
// this Function stores the tokens to your Firebase database
module.exports.oauthcallback = functions.https.onRequest(async (req, res) => {
  res.set('Cache-Control', 'private, max-age=0, s-maxage=0');
  const code = req.query.code;
  try {
    const {tokens} = await functionsOauthClient.getToken(code);
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    await admin.database().ref(DB_TOKEN_PATH).set(tokens);
    return res.status(200).send('App successfully configured with new Credentials. '
        + 'You can now close this page.');
  } catch (error) {
    return res.status(400).send(error);
  }
});

// checks if oauthTokens have been loaded into memory, and if not, retrieves them
async function getAuthorizedClient() {
  if (oauthTokens) {
    return functionsOauthClient;
  }
  const snapshot = await admin.database().ref(DB_TOKEN_PATH).once('value');
  oauthTokens = snapshot.val();
  functionsOauthClient.setCredentials(oauthTokens);
  return functionsOauthClient;
}

function splitValues(data) { return [ data.values[0], data.values[1], data.values.slice(2) ]; }

async function annotateGeocode(data, sheet_id, client) {
  // Annotate Geocodes for missing items. Track the updated rows. Write back.
  const headers = data.values[1];
  const maps_client = new Client({});
  const [header_values, col_labels, real_values] = splitValues(data);

  const approvedIndex = headers.findIndex( e => e === 'approved' );
  const addressIndex = headers.findIndex( e => e === 'address' );
  const latIndex = headers.findIndex( e => e === 'lat' );
  const lngIndex = headers.findIndex( e => e === 'lng' );
  const timestampIdx = headers.findIndex( e => e === 'timestamp' );

  // The timestamp column is the first of the form response columns.
  // Subtracting it off gives us the right column ordinal for the
  // form response sheet.
  const latColumn = COLUMNS[latIndex];
  const lngColumn = COLUMNS[lngIndex];
  console.log(`writing lat-long cols ${latColumn},${lngColumn}`);

  const to_write_back = [];
  const promises = [];
  let num_lookups = 0;
  real_values.forEach( (entry, index) => {
    if (entry[approvedIndex] === "x") {
      // Row numbers start at 1.  First 2 rows are headers, so we need to add 2.
      const row_num = index + 1 + 2;

      // Check if entry's length is too short to possibly have a latitude, we need
      // to geocode.  If the value for lat is "", we also need to geocode.
      if (num_lookups < 50 && ((entry.length < (latIndex + 1)) || (entry[latIndex] === ""))) {

        // Geolocation only allows 50qps. Overkilling it causes rejects. Artifically cap here.
        // TODO(awong): do some smarter throttle system.
        num_lookups = num_lookups + 1;
        
        // Do geocoding and add lat/lng to data iff we don't already have a latLng for
        // the address *and* the address has been moderated.  (In this code block, all
        // data has already been moderated.)
        const address = entry[addressIndex];

        promises.push(getLatLng(address, maps_client).then(lat_lng => {
          entry[latIndex] = lat_lng.lat;
          entry[lngIndex] = lat_lng.lng;
          to_write_back.push({row_num, lat_lng});
          return lat_lng;
        }).catch( e => {
          console.error(e);
          entry[latIndex] = 'N/A';
          entry[lngIndex] = 'N/A';
        }));
      }
    }
  });

  console.log("Got latLngs");
  await Promise.all(promises);
  // Attempt to write back now.
  if (to_write_back.length > 0) {
    const data = [];
    const write_request = {
      spreadsheetId: sheet_id,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: data,
      }
    };
    write_request.auth = client;

    to_write_back.forEach( e => {
      console.log(`writing lat-long cols ${latColumn},${lngColumn} : ${JSON.stringify(e)}`);
      // TODO(awong): Don't hardcode the columns. Make it more robust somehow.
      data.push({
        range: `${WRITEBACK_SHEET}!${latColumn}${e.row_num}`,
        values: [ [e.lat_lng.lat] ]
      });

      data.push({
        range: `${WRITEBACK_SHEET}!${lngColumn}${e.row_num}`,
        values: [ [e.lat_lng.lng] ]
      });
    });
    const write_response = await google.sheets('v4').spreadsheets.values.batchUpdate(write_request);
  }
}

async function getSpreadsheet(country, client) {
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId: SHEETS[country],
    range: 'Form Responses 1'
    };
  request.auth = client;

  // Transition code as we rename the output sheet from
  // Form Responses 1 to Combined.
  let response = null;
  try {
    response = await sheets.spreadsheets.values.get(request);
  } catch (err) {
    request.range = 'Combined';
    response = await sheets.spreadsheets.values.get(request);
  }
  const data = response.data;

  // Geocode annotation is being done via appscript right now.
  // When reenabling, ensure the oauth scope is made read/write.
  // await annotateGeocode(response.data, SHEETS[country], client);

  try {
    request.range = 'MergeConfig';
    response = await sheets.spreadsheets.values.get(request);
    const config_values = response.data.values;

    // All parallel translation rows have in column 0 something of the form:
    //   field_name|lang
    // Search for things with a pipe. Split. And then create parallel array.
    const field_translations = data['field_translations'] = {};
    for (const row of config_values) {
      console.log(row);
      if (row.length > 0) {
        const pipe_index = row[0].indexOf('|');
        if (pipe_index !== -1) {
          const field_name = row[0].substr(0, pipe_index);
          const lang = row[0].substr(pipe_index + 1);
          if (lang) {
            field_translations[field_name] = field_translations[field_name] || {};
            field_translations[field_name][lang] = row.slice(1);
          }
        }
      }
    }

  } catch (err) {
    console.error("Unable to fetch MergeConfig ", err);
  }

  return data;
}

async function snapshotData(country) {
  const base_filename = `data-${country}`;
  const csv_filename = `${base_filename}.csv`;
  const json_filename = `${base_filename}.json`;
  const html_snippet_filename = `data_snippet-${country}.html`;

  // Talk to sheets.
  const client = await getAuthorizedClient();
  let data = {}
  try {
    data = await getSpreadsheet(country, client);

    if (data.values.length < 2) {
      throw new Error("Too few rows. Is row 2 a the column labels?");
    }

    // The first row is human readable form values.
    // The second row is reserved for a machine usable field tag.
    // Save those and filter the rest.
    const [orig_headers, orig_col_labels, real_values] = splitValues(data);

    // Find all columns to be published.
    const published_cols = new Set();
    const headers = [];
    const col_labels = [];
    for (let i = 0; i < orig_col_labels.length; i++) {
      const orig_label = orig_col_labels[i];
      if (orig_label && !orig_label.startsWith('_')) {
        headers.push(orig_headers[i]);
        col_labels.push(orig_label);
        published_cols.add(i);
      }
    }

    // Add a row number label.
    headers.push('Row');
    col_labels.push('row');

    const trimmed_values = real_values.map((row, row_num) => {
      const result = row.filter((_, col_num) => published_cols.has(col_num));
      result.push(row_num + 3);  // 2 rows of header and 1-base indexing.
      return result;
    });
    const approvedIndex = col_labels.findIndex( e => e === 'approved' );
    if (approvedIndex === -1) {
      throw new Error("sheet missing expected columns. Ensure row 2 headers are sane?");
    }

    const approved_rows = trimmed_values.filter(e => e[approvedIndex] === "x");
    data.values = [headers, col_labels, ...approved_rows];
  } catch (err) {
    console.error(err);
  }

  const datafileRef = admin.storage().bucket().file(json_filename);
  await datafileRef.save(JSON.stringify(data), {
    gzip: true,
    metadata: {
      cacheControl: "public, max-age=20",
      contentType: "application/json"
    },
    predefinedAcl: "publicRead",
  });

  // Build a simple csv file
  console.log("Preparing CSV File");
  const csvFileRef = admin.storage().bucket().file(csv_filename);

  // TODO(awong): This looks like a race as the async callback isn't
  // guaranteed to execute before the calling function returns.
  csv_stringify(data.values, async (err, output) => {
    if (err !== null) {
      console.log(err)
    } else {
      await csvFileRef.save(output, {
	      gzip: true,
	      metadata: {
	        cacheControl: "public, max-age=20",
                contentType: "application/text"
	      },
	      predefinedAcl: "publicRead",
	 });
    }
  });

  const data_by_location = toDataByLocation(data);
  const html_snippets = toHtmlSnippets(data_by_location);

  const htmlSnippetfileRef = admin.storage().bucket().file(html_snippet_filename);
  await htmlSnippetfileRef.save(html_snippets, {
    gzip: true,
    metadata: {
      cacheControl: "public, max-age=20",
      contentType: "text/html"
    },
    predefinedAcl: "publicRead",
  });

  return [data, html_snippets];
}

// Fetch lat & lng for the given address by making a call to the Google Maps API.
// Returns an object with numeric lat and lng fields.
async function getLatLng(address, client) {
  const response = await client.geocode({
    params: {
      address: address,
      key: GOOGLE_MAPS_API_KEY,
    },
    timeout: 5000 // milliseconds
  });

  if (response.data.results && response.data.results.length > 0) {
    return response.data.results[0].geometry.location;
  } else {
    console.error(response);
    throw new Error(response);
  }
}

function toDataByLocation(data) {
  const headers = data.values[1];
  const approvedIndex = headers.findIndex( e => e === 'approved' );
  const stateIndex = headers.findIndex( e => e === 'state' );
  const cityIndex = headers.findIndex( e => e === 'city' );
  const data_by_location = {};

  const published_entries = data.values.slice(1).filter((entry) => entry[approvedIndex] === "x");

  published_entries.forEach(async (entry) => {
    let entry_array;
    const state = entry[stateIndex];
    const city = entry[cityIndex];
    if (!(state in data_by_location) || !(city in data_by_location[state])) {
      entry_array = [];
      if (state in data_by_location) {
        data_by_location[state][city] = entry_array;
      } else {
        data_by_location[state] = { [city]: entry_array };
      }
    } else {
      entry_array = data_by_location[state][city];
    }
    const entry_obj = {};
    headers.forEach( (value, index) => {
      if (entry[index] !== "") {
        entry_obj[value] = (typeof entry[index]) === 'string' ? entry[index].trim() : entry[index];
      }
    });
    entry_array.push(entry_obj);
  });

  return data_by_location;
}

function toHtmlSnippets(data_by_location) {
  let padding = 0;
  const lines = [];
  let addLine = str => lines.push(' '.repeat(padding) + str);

  addLine('<article>');
  padding += 2;

  // Output each entry by state.
  for (const state of Object.keys(data_by_location).sort()) {
    addLine(`<section data-state="${state}">`);
    padding += 2;

    addLine(`<h2>${state}</h2>`);

    const cities = data_by_location[state];
    for (const city of Object.keys(cities).sort()) {
      addLine(`<section data-city="${city}">`);
      padding += 2;

      addLine(`<h3 data-state="${city}">${city}</h3>`);

      for (const entry of cities[city]) {
        const name = entry['name'];
        const address = entry['address'] || '';
        const instructions = entry['instructions'];
        const accepting = entry['accepting'];
        const lat = entry['lat'];
        const lng = entry['lng'];
        const open_box = entry['open_box'];

        addLine(`<article data-entry=${JSON.stringify(name)} data-accepting=${JSON.stringify(accepting)} data-lat=${JSON.stringify(lat)} data-lng=${JSON.stringify(lng)} data-open-box=${JSON.stringify(open_box)}>`);
        padding += 2;
        addLine(`<h4 class="marginBottomZero">${name}</h4>`);

        addLine('<label>Address</label>')
        addLine(`<p class="marginTopZero medEmph">${address.replace(/\n/g,'<br>')}</p>`);

        if (instructions !== "") {
          addLine('<label>Instructions</label>')
          addLine(`<p>${instructions}</p>`);
        }
        if (accepting !== "") {
          addLine('<label>Accepting</label>')
          addLine(`<p>${accepting}</p>`);
        }
        if (open_box !== "") {
          addLine('<label>Open packages?</label>')
          addLine(`<p>${open_box}</p>`);
        }

        padding -= 2;
        addLine(`</article>`);
      }

      padding -= 2;
      addLine(`</section>`);
    }

    padding -= 2;
    addLine(`</section>`);
  }
  padding -= 2;
  addLine('</article>');
  return lines.join("\n");
}

module.exports.reloadsheetdata = functions.https.onRequest(async (req, res) => {
  const country = req.path.split('/',2)[1] || 'us';
  if (!(country in SHEETS)) {
    res.status(400).send(`invalid country: ${country} for ${req.path}`);
    return;
  }

  const [data, html_snippets] = await snapshotData(country);
  res.status(200).send(html_snippets);
});

async function updateSheetWithGeocodes(country) {
  const client = await getAuthorizedClient();
  let data = {}

  // Open relevant sheet
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId: SHEETS[country],
    range: 'Form Responses 1'
  };
  request.auth = client;

  // Transition code as we rename the output sheet from
  // Form Responses 1 to Combined.
  let response = null;
  try {
    response = await sheets.spreadsheets.values.get(request);
  } catch (err) {
    request.range = 'Combined';
    response = await sheets.spreadsheets.values.get(request);
  }
  // Find rows that have been approved but not geocoded.
  // Call geocoder.
  // Fill in cells with lat, lng
  await annotateGeocode(response.data, SHEETS[country], client);
}

module.exports.geocode = functions.https.onRequest(async (req, res) => {
  const country = req.path.split('/',2)[1] || 'us';
  if (!(country in SHEETS)) {
    res.status(400).send(`invalid country: ${country} for ${req.path}`);
    return;
  }

  await updateSheetWithGeocodes(country);
  res.status(200).send("Geocoded and updated spreadsheet successfully");
});


// Local Dev Tooling to get a copy of data to play with

data_static = null;

async function get_live_data() {
  const url = 'https://findthemasks.com/data.json';
  let resp = await request({url});
  console.log('Setting global variable `data_static` to the contents of ' + url);
  data_static = resp.data;
}
