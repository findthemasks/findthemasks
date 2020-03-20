const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const {OAuth2Client} = require('google-auth-library');
const {google} = require('googleapis');

// TODO: Use firebase functions:config:set to configure your googleapi object:
// googleapi.client_id = Google API client ID,
// googleapi.client_secret = client secret, and
// googleapi.sheet_id = Google Sheet id (long string in middle of sheet URL)
const CONFIG_CLIENT_ID = functions.config().googleapi.client_id;
const CONFIG_CLIENT_SECRET = functions.config().googleapi.client_secret;
const CONFIG_SHEET_ID = functions.config().googleapi.sheet_id;

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

async function snapshotData(filename) {
  // Talk to sheets.
  const client = await getAuthorizedClient();
  // Talk to sheets.
  const data = await getSpreadsheet(client);
  const datafileRef = admin.storage().bucket().file(filename);

  await datafileRef.save(JSON.stringify(data), {
    gzip: true,
    metadata: {
      cacheControl: "public, max-age=300",
      contentType: "application/json"
    },
    predefinedAcl: "publicRead",
  });

  return data;
}

function toDataByLocation(data) {
  const headers = data.values[0];
  const approvedIndex = headers.findIndex( e => e === 'Approved' );
  const stateIndex = headers.findIndex( e => e === 'State?' );
  const cityIndex = headers.findIndex( e => e === 'City' );
  const data_by_location = {};

  const published_entries = data.values.slice(1).filter((entry) => entry[approvedIndex] === "x");

  published_entries.forEach( entry => {
    const state = entry[stateIndex];
    const city = entry[cityIndex];
    let entry_array;
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
        entry_obj[value] = entry[index]
      } else {
        entry_obj[value] = ""
      }
    });
    entry_array.push(entry_obj);
  });

  return data_by_location;
}

function toHtmlSnippets(data_by_location) {
   let padding = '      ';
  const lines = [ `${padding}<article>` ];
  padding += '  ';

  lines.push(`${padding}<h1>List of donation sites</h1>`);
  padding += '  ';

  for (const state of Object.keys(data_by_location).sort()) {
    lines.push(`${padding}<h2>${state}</h2>`);
    padding += '  ';

    const cities = data_by_location[state];
    for (const city of Object.keys(cities).sort()) {
      lines.push(`${padding}<h3>${city}</h3>`);
      padding += '  ';

      for (const entry of cities[city]) {
        const name = entry["What is the name of the hospital or clinic?"];
        const address = entry["Street address for dropoffs?"];
        const instructions = entry["Drop off instructions, eg curbside procedure or mailing address ATTN: instructions:"];
        const accepting = entry["What are they accepting?"];
        const will_they_accept = entry["Will they accept open boxes/bags?"];

        lines.push(`${padding}<h4 class="marginBottomZero">${name}</h4>`);
        padding += '  ';

        lines.push(`${padding}<p class="marginTopZero medEmph">${address.replace(/\n/g,'<br>')}</p>`);
        if (instructions !== "") {
          lines.push(`${padding}<p">${instructions}</p>`);
        }
        if (accepting !== "") {
          lines.push(`${padding}<p">${accepting}</p>`);
        }
        if (will_they_accept !== "") {
          lines.push(`${padding}<p">${will_they_accept}</p>`);
        }

        padding = padding.substring(0, padding.length - 2);
      }

      padding = padding.substring(0, padding.length - 2);
    }

    padding = padding.substring(0, padding.length - 2);
  }
  lines.push('      </article>');
  return lines;
}

const DATA_FILE_NAME = 'data.json';
exports.reloadsheetdata = functions.https.onRequest(async (req, res) => {
  const data = await snapshotData(DATA_FILE_NAME);
  const data_by_location = toDataByLocation(data);
  const html_snippets = toHtmlSnippets(data_by_location);

  res.status(200).send(html_snippets.join("\n"));
});
