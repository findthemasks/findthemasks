const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');
const Client = require("@googlemaps/google-maps-services-js").Client;

// TODO: Use firebase functions:config:set to configure your googleapi object:
// googleapi.client_id = Google API client ID,
// googleapi.client_secret = client secret, and
// googleapi.sheet_id = Google Sheet id (long string in middle of sheet URL)
const CONFIG_CLIENT_ID = functions.config().googleapi.client_id;
const CONFIG_CLIENT_SECRET = functions.config().googleapi.client_secret;
const CONFIG_SHEET_ID = functions.config().googleapi.sheet_id;
const GOOGLE_MAPS_API_KEY = functions.config().findthemasks.geocode_key;

// The OAuth Callback Redirect.
const FUNCTIONS_REDIRECT = `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com/oauthcallback`;

// setup for authGoogleAPI
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const functionsOauthClient = new OAuth2Client(CONFIG_CLIENT_ID, CONFIG_CLIENT_SECRET,
  FUNCTIONS_REDIRECT);

// OAuth token cached locally.
let oauthTokens = null;

// visit the URL for this Function to request tokens
exports.authgoogleapi = functions.https.onRequest((req, res) => {
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
exports.oauthcallback = functions.https.onRequest(async (req, res) => {
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

async function getSpreadsheet(client) {
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId: CONFIG_SHEET_ID,
    range: 'moderated'};
  request.auth = client;
  console.log("Request", request);

  const response = await sheets.spreadsheets.values.get(request);
  return response.data;
}

async function snapshotData(filename, html_snippet_filename) {
  // Talk to sheets.
  const client = await getAuthorizedClient();
  const data = await getSpreadsheet(client);

  const headers = data.values[1];
  const approvedIndex = headers.findIndex( e => e === 'approved' );
  // The first row is human readable form values.
  // The second row is reserved for a machine usable field tag.
  // Save those and filter the rest.
  const raw_values = data.values;
  data.values = raw_values.slice(0,2);
  data.values.push(...raw_values.slice(2).filter((entry) => entry[approvedIndex] === "x"));

  const datafileRef = admin.storage().bucket().file(filename);
  await datafileRef.save(JSON.stringify(data), {
    gzip: true,
    metadata: {
      cacheControl: "public, max-age=20",
      contentType: "application/json"
    },
    predefinedAcl: "publicRead",
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
    timeout: 1000 // milliseconds
  });

  if (response.data.results && response.data.results.length > 0) {
    return response.data.results[0].geometry.location;
  } else {
    throw new Error('bad geocode response');
  }
}

function toDataByLocation(data) {
  const maps_client = new Client({});

  const headers = data.values[1];
  const approvedIndex = headers.findIndex( e => e === 'approved' );
  const stateIndex = headers.findIndex( e => e === 'state' );
  const cityIndex = headers.findIndex( e => e === 'city' );
  const addressIndex = headers.findIndex( e => e === 'address' );
  const latIndex = headers.findIndex( e => e === 'lat' );
  const lngIndex = headers.findIndex( e => e === 'lng' );
  const data_by_location = {};

  const published_entries = data.values.slice(1).filter((entry) => entry[approvedIndex] === "x");

  published_entries.forEach(async (entry) => {
    // Do geocoding and add lat/lng to data iff we don't already have a latLng for
    // the address *and* the address has been moderated.  (In this code block, all
    // data has already been moderated.)
    const address = entry[addressIndex];

    // Check if entry's length is too short to possibly have a latitude, we need
    // to geocode.  If the value for lat is "", we also need to geocode.
    if ((entry.length < (latIndex + 1)) || (entry[latIndex] === "")) {
      try {
        const lat_lng = await getLatLng(address, maps_client);
        entry[latIndex] = lat_lng.lat;
        entry[lngIndex] = lat_lng.lng;
      } catch (e) {
        console.error(e);
        entry[latIndex] = 'N/A';
        entry[lngIndex] = 'N/A';
      }
    }

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
      if (entry[index] !== undefined) {
        entry_obj[value] = (typeof entry[index]) === 'string' ? entry[index].trim() : entry[index];
      } else {
        entry_obj[value] = ""
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

  addLine('<h1>List of donation sites</h1>');

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
        const address = entry['address'];
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

exports.reloadsheetdata = functions.https.onRequest(async (req, res) => {
  const [data, html_snippets] = await snapshotData('data.json', 'data_snippet.html');

  res.status(200).send(html_snippets);
});
