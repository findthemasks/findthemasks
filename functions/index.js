const admin = require('firebase-admin');
const constants = require('./constants.js');
const crypto = require('crypto');
const csv_stringify = require('csv-stringify');
const ftmEncrypt = require('./ftm-encrypt.js');
const functions = require('firebase-functions');
const urlsafeBase64 = require('url-safe-base64');
const { geocodeAddress, makeAddress } = require('./geocode.js');
const { loadMakerData } = require('./airtable-connector.js');
const { request } = require('gaxios');

admin.initializeApp();

const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');

// TODO: Use firebase functions:config:set to configure your googleapi object:
// googleapi.client_id = Google API client ID,
// googleapi.client_secret = client secret, and
// googleapi.sheet_id = Google Sheet id (long string in middle of sheet URL)
//
const CONFIG_CLIENT_ID = functions.config().googleapi.client_id;
const CONFIG_CLIENT_SECRET = functions.config().googleapi.client_secret;
const SMARTY_STREETS_AUTH_ID = functions.config().findthemasks.smarty_streets_auth_id;
const SMARTY_STREETS_AUTH_TOKEN = functions.config().findthemasks.smarty_streets_auth_token;
const APPSCRIPT_AUTH_SECRET = functions.config().findthemasks.appscript_auth_secret;

const COLUMNS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM',
  'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ',
  'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM',
  'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX', 'BY', 'BZ',
];
const COMBINED_WRITEBACK_SHEET = "'Combined'";
const SMARTY_STREETS_OUTPUT_SHEET = "'Smarty Street Output'";
const SMARTY_STREETS_US_API_URL = 'https://us-street.api.smartystreets.com/street-address';
const SMARTY_STREETS_INTL_API_URL = 'https://international-street.api.smartystreets.com/verify';

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
    prompt: 'consent'
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
    const { tokens } = await functionsOauthClient.getToken(code);
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

function splitValues(data) {
  return [data.values[0], data.values[1], data.values.slice(2)];
}

function get_country_from_path(req) {
  return req.path.split('/', 2)[1] || 'us';
}

async function annotateGeocode(data, sheet_id, client) {
  // Annotate Geocodes for missing items. Track the updated rows. Write back.
  const headers = data.values[1];
  const [header_values, col_labels, real_values] = splitValues(data);

  const approvedIndex = headers.findIndex(e => e === 'approved');
  const addressIndex = headers.findIndex(e => e === 'address');
  const stateIndex = headers.findIndex(e => e === 'state');
  const cityIndex = headers.findIndex(e => e === 'city');
  const origAddressIndex = headers.findIndex(e => e === 'orig_address');
  const latIndex = headers.findIndex(e => e === 'lat');
  const lngIndex = headers.findIndex(e => e === 'lng');
  const timestampIdx = headers.findIndex(e => e === 'timestamp');

  // The timestamp column is the first of the form response columns.
  // Subtracting it off gives us the right column ordinal for the
  // form response sheet.
  const latColumn = COLUMNS[latIndex];
  const lngColumn = COLUMNS[lngIndex];
  const addressColumn = COLUMNS[addressIndex];

  const to_write_back = [];
  const promises = [];
  const doGeocode = (address, entry, row_num, do_latlong) => {
    return geocodeAddress(address).then(geocode => {
      if (entry[addressIndex]) {
        // Do not overwrite if there is already an address listed.
        geocode.canonical_address = null;
      } else {
        entry[addressIndex] = geocode.canonical_address;
      }

      if (do_latlong) {
        entry[latIndex] = geocode.location.lat;
        entry[lngIndex] = geocode.location.lng;
      } else {
        geocode.location = null;
      }
      console.log("Writing ", geocode);
      to_write_back.push({ row_num, geocode });
      return geocode;
    }).catch(e => {
      console.error(e);
      entry[latIndex] = 'N/A';
      entry[lngIndex] = 'N/A';
    });
  };

  real_values.forEach((entry, index) => {
    const final_address = entry[addressIndex];
    const needs_latlong = entry[approvedIndex] === "x";

    // Row numbers start at 1.  First 2 rows are headers, so we need to add 2.
    const row_num = index + 1 + 2;

    // Check if entry's length is too short to possibly have a latitude, we need
    // to geocode.  If the value for lat or lng is "", we also need to geocode.
    const missing_lat_lng = (entry.length < (latIndex + 1)) || !entry[latIndex] || !entry[lngIndex];

    if (!final_address || (needs_latlong && missing_lat_lng)) {
      const address = final_address || makeAddress(entry[origAddressIndex], entry[cityIndex], entry[stateIndex]);

      console.debug(`Calling geocoder for entry: ${entry} on row: ${row_num} and address: ${address} `);
      if (address) {
        promises.push(doGeocode(address, entry, row_num, needs_latlong));
      }
    }
  });

  await Promise.all(promises);
  // Attempt to write back now.
  if (to_write_back.length > 0) {
    const data = [];
    const write_request = {
      spreadsheetId: sheet_id,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: data
      }
    };
    write_request.auth = client;

    to_write_back.forEach(e => {
      console.log(`writing lat-long,address cols ${latColumn},${lngColumn},${addressColumn} : ${JSON.stringify(e)}`);
      // TODO(awong): Don't hardcode the columns. Make it more robust somehow.
      if (e.geocode.location) {
        data.push({
          range: `${COMBINED_WRITEBACK_SHEET}!${latColumn}${e.row_num}`,
          values: [[e.geocode.location.lat]]
        });

        data.push({
          range: `${COMBINED_WRITEBACK_SHEET}!${lngColumn}${e.row_num}`,
          values: [[e.geocode.location.lng]]
        });
      }

      if (e.geocode.canonical_address) {
        data.push({
          range: `${COMBINED_WRITEBACK_SHEET}!${addressColumn}${e.row_num}`,
          values: [[e.geocode.canonical_address]]
        });
      }
    });
    const write_response = await google.sheets('v4').spreadsheets.values.batchUpdate(write_request);
  }
}

async function getSpreadsheet(prefix, country, client) {
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId: constants.SHEETS[country],
    range: 'Combined'
  };

  if (prefix === 'getusppe-affiliates') {
   request.spreadsheetId = constants.GETUSPPE_AFFILIATES_SHEET_ID;
  }

  request.auth = client;

  let response = await sheets.spreadsheets.values.get(request);
  const data = response.data;

  try {
    request.range = 'MergeConfig';
    response = await sheets.spreadsheets.values.get(request);
    const config_values = response.data.values;

    // All parallel translation rows have in column 0 something of the form:
    //   field_name|lang
    // Search for things with a pipe. Split. And then create parallel array.
    const field_translations = data['field_translations'] = {};
    for (const row of config_values) {
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

const encryptEmail = (email) => {
  try {
    const recipient = { email: email };
    const json = JSON.stringify(recipient);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', EMAIL_ENCRYPTION_KEY, iv);
    let ciphertext = cipher.update(json, 'utf-8', 'latin1');
    ciphertext += cipher.final('latin1');
    const cipherBuffer = Buffer.from(ciphertext, 'latin1');
    const result = Buffer.concat([iv, cipherBuffer], iv.length + cipherBuffer.length);
    return encodeURIComponent(result.toString('base64'));
  } catch (error) {
    console.error(error);
    return null;
  }
};

const ENCRYPTED_EMAIL_HEADER_NAME = 'Encrypted Email';
const ENCRYPTED_EMAIL_COL_LABEL = 'encrypted_email';


async function snapshotData(prefix, country) {
  if (!prefix || !country) {
    throw new Error(`Invalid prefix '${prefix}'or country '${country}'`);
  }
  const base_filename = `${prefix}-${country}`;
  const csv_filename = `${base_filename}.csv`;
  const json_filename = `${base_filename}.json`;

  // Talk to sheets.
  const client = await getAuthorizedClient();
  let data = {};
  let csvDataValues = [];

  try {
    data = await getSpreadsheet(prefix, country, client);

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

    let emailIndex;

    for (let i = 0; i < orig_col_labels.length; i++) {
      const orig_label = orig_col_labels[i];
      if (orig_label && !orig_label.startsWith('_')) {
        headers.push(orig_headers[i]);
        col_labels.push(orig_label);
        published_cols.add(i);
      } else if (orig_label && orig_label === '_email') {
        headers.push(ENCRYPTED_EMAIL_HEADER_NAME);
        col_labels.push(ENCRYPTED_EMAIL_COL_LABEL);
        published_cols.add(i);
        emailIndex = i;
      }
    }

    // Add a row number label.
    headers.push('Row');
    col_labels.push('row');

    const contactFormOptOutIndex = orig_col_labels.findIndex(e => e === '_contact_form_opt_out');

    let resultEmailIndex = -1;

    const trimmed_values = real_values.map((row, row_num) => {
      const result = [];

      // Opt out of mail relay if
      // country's sheet does not have opt out option
      // OR opt out column has content in it
      const hasOptedOutOfContact = contactFormOptOutIndex === -1
        || (Boolean(row[contactFormOptOutIndex]) && row[contactFormOptOutIndex].trim().length > 0);

      row.forEach((value, col_num) => {
        if (published_cols.has(col_num)) {
          if (col_num === emailIndex) {
            if (hasOptedOutOfContact || !value) {
              result.push('');
            } else {
              result.push(encryptEmail(value));
            }
            resultEmailIndex = result.length - 1;
          } else {
            result.push(value);
          }
        }
      });

      result.push(row_num + 3);  // 2 rows of header and 1-base indexing.
      return result;
    });

    const approvedIndex = col_labels.findIndex(e => e === 'approved');
    if (approvedIndex === -1) {
      throw new Error("sheet missing expected columns. Ensure row 2 headers are sane?");
    }

    const approved_rows = trimmed_values.filter(e => e[approvedIndex].toLowerCase() === "x");

    const approvedCSVRows = approved_rows.map((row) => (
      row.filter((_, colNumber) => colNumber !== resultEmailIndex)
    ));

    data.values = [headers, col_labels, ...approved_rows];
    csvDataValues = [
      headers.filter((header, index) => index !== resultEmailIndex),
      col_labels.filter((header, index) => index !== resultEmailIndex),
      ...approvedCSVRows
    ];
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
    predefinedAcl: "publicRead"
  });
  // Build a simple csv file
  console.log("Preparing CSV File");
  const csvFileRef = admin.storage().bucket().file(csv_filename);

  // TODO(awong): This looks like a race as the async callback isn't
  // guaranteed to execute before the calling function returns.
  csv_stringify(csvDataValues, async (err, output) => {
    if (err) {
      console.error(err)
    } else {
      await csvFileRef.save(output, {
        gzip: true,
        metadata: {
          cacheControl: "public, max-age=20",
          contentType: "application/text"
        },
        predefinedAcl: "publicRead"
      });
    }
  });

  return [data];
}

module.exports.reloadsheetdata = functions.https.onRequest(async (req, res) => {
  const country = get_country_from_path(req);
  if (country === 'makers') {
    await loadMakerData(admin, req, res);
    return;
  }

  let data = 'data';
  if (country === 'getusppe-affiliates') {
    [data] = await snapshotData('getusppe-affiliates', 'us');
  } else  {
    if (!(country in constants.SHEETS)) {
      res.status(400).send(`invalid country: ${country} for ${req.path}`);
      return;
    }
    [data] = await snapshotData(data, country);
  }

  res.status(200).send(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
});

async function updateSheetWithGeocodes(spreadsheetId) {
  const client = await getAuthorizedClient();

  // Open relevant sheet
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId,
    range: 'Combined'
  };
  request.auth = client;

  let response = await sheets.spreadsheets.values.get(request);

  // Find rows that have been approved but not geocoded.
  // Call geocoder.
  // Fill in cells with lat, lng
  await annotateGeocode(response.data, spreadsheetId, client);
}

module.exports.geocode = functions.https.onRequest(async (req, res) => {
  const country = get_country_from_path(req);
  let spreadsheetId = null;
  if (country === 'getusppe-affiliates') {
    spreadsheetId = constants.GETUSPPE_AFFILIATES_SHEET_ID;
  } else if (country in constants.SHEETS) {
    spreadsheetId = constants.SHEETS[country];
  } else {
    res.status(400).send(`invalid country: ${country} for ${req.path}`);
    return;
  }

  await updateSheetWithGeocodes(spreadsheetId);
  res.status(200).send("Geocoded and updated spreadsheet successfully");
});


// Local Dev Tooling to get a copy of data to play with

data_static = null;

async function get_live_data() {
  const url = 'https://storage.googleapis.com/findthemasks.appspot.com/data-us.json';
  let resp = await request({ url });
  console.log('Setting global variable `data_static` to the contents of ' + url);
  data_static = resp.data;
}

const makeSmartyStreetRequest = async (url) => {
  try {
    const response = await request({
      url: url
    });
    return response.data;
  } catch (error) {
    console.error('Smarty Street Error', error);
    return null;
  }
};

const annotateSmartyStreetsAddresses = async (country) => {
  const client = await getAuthorizedClient();

  const sheetId = constants.SHEETS[country];

  // Open relevant sheet
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId: sheetId,
    range: 'Combined'
  };
  request.auth = client;

  try {
    const response = await sheets.spreadsheets.values.get(request);
    const data = response.data;

    const upperCaseCountry = country.toUpperCase();

    const headers = data.values[1];
    const [header_values, col_labels, real_values] = splitValues(data);

    const approvedIndex = headers.findIndex(e => e === 'approved');
    const addressIndex = headers.findIndex(e => e === 'address');
    const smartyStreetIndex = headers.findIndex(e => e === '_smarty_street_run');
    const smartyStreetColumn = COLUMNS[smartyStreetIndex];
    const rdiIndex = headers.findIndex(e => e === 'rdi');
    const rdiColumn = COLUMNS[rdiIndex];

    const toWrite = [];
    const approvedWithAddress = [];

    // only run 50 at a time to avoid quota limits
    real_values.forEach((entry, index) => {
      const finalAddress = entry[addressIndex];
      const isApproved = entry[approvedIndex] === "x";
      const smartyStreetRun = entry[smartyStreetIndex] === "x";

      if (finalAddress && isApproved && !smartyStreetRun && approvedWithAddress.length <= 50) {
        approvedWithAddress.push({
          entry: entry,
          index: index
        });
      }
    });

    await Promise.all(approvedWithAddress.map(async (approved) => {
      const entry = approved.entry;
      const index = approved.index;
      const finalAddress = entry[addressIndex];

      // Row numbers start at 1.  First 2 rows are headers, so we need to add 2.
      const rowIndex = index + 1 + 2;

      const oneLineAddress = finalAddress.replace("\n", ", ").trim();

      if (upperCaseCountry === 'US') {
        const encodedParams = `street=${encodeURIComponent(oneLineAddress)}&auth-id=${encodeURIComponent(SMARTY_STREETS_AUTH_ID)}&auth-token=${encodeURIComponent(SMARTY_STREETS_AUTH_TOKEN)}`;
        const url = `${SMARTY_STREETS_US_API_URL}?${encodedParams}`;

        const data = await makeSmartyStreetRequest(url);

        if (Array.isArray(data)) {
          // smarty street can return multiple, just pick the one it has highest confidence in
          const predictedAddress = data[0];

          toWrite.push({ rowIndex, predictedAddress });
        } else {
          console.error(`Smarty Streets returned no results for address: ${oneLineAddress}`, data);
          toWrite.push({ rowIndex });
        }
      } else {
        const encodedParams = encodeURIComponent(`country=${encodeURIComponent(upperCaseCountry)}&freeform=${encodeURIComponent(address)}&auth-id=${encodeURIComponent(SMARTY_STREETS_AUTH_ID)}&auth-token=${encodeURIComponent(SMARTY_STREETS_AUTH_TOKEN)}`);
        const url = `${SMARTY_STREETS_INTL_API_URL}?${encodedParams}`;
        console.log('Unsupported intl address');
      }
    }));

    if (toWrite.length > 0) {
      const smartyStreetsWriteData = [];
      const combinedSheetWriteData = [];

      toWrite.forEach((row) => {
        const predictedAddress = row.predictedAddress || {};
        const components = predictedAddress.components || {};
        const metadata = predictedAddress.metadata || {};
        const analysis = predictedAddress.analysis || {};

        combinedSheetWriteData.push({
          range: `${COMBINED_WRITEBACK_SHEET}!${smartyStreetColumn}${row.rowIndex}`,
          values: [['x']]
        });

        if (rdiIndex !== -1) {
          combinedSheetWriteData.push({
            range: `${COMBINED_WRITEBACK_SHEET}!${rdiColumn}${row.rowIndex}`,
            values: [[metadata.rdi]]
          });
        }

        smartyStreetsWriteData.push({
          range: `${SMARTY_STREETS_OUTPUT_SHEET}!${row.rowIndex}:${row.rowIndex}`,
          values: [
            [
              row.rowIndex,
              predictedAddress.delivery_line_1,
              predictedAddress.last_line,
              predictedAddress.delivery_point_barcode,
              components.primary_number,
              components.street_name,
              components.street_postdirection,
              components.street_suffix,
              components.city_name,
              components.default_city_name,
              components.state_abbreviation,
              components.zipcode,
              components.plus4_code,
              components.delivery_point,
              components.delivery_point_check_digit,
              metadata.record_type,
              metadata.zip_type,
              metadata.county_fips,
              metadata.county_name,
              metadata.carrier_route,
              metadata.congressional_district,
              metadata.rdi,
              metadata.elot_sequence,
              metadata.elot_sort,
              metadata.latitude,
              metadata.longitude,
              metadata.precision,
              metadata.time_zone,
              metadata.utc_offset,
              metadata.dst,
              metadata.dpv_match_code,
              analysis.dpv_footnotes,
              analysis.dpv_cmra,
              analysis.dpv_vacant,
              analysis.active
            ]
          ]
        });
      });

      const smartyStreetsWriteRequest = {
        spreadsheetId: sheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: smartyStreetsWriteData
        }
      };

      smartyStreetsWriteRequest.auth = client;

      const combinedSheetWriteRequest = {
        spreadsheetId: sheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: combinedSheetWriteData
        }
      };

      smartyStreetsWriteRequest.auth = client;
      combinedSheetWriteRequest.auth = client;

      await google.sheets('v4').spreadsheets.values.batchUpdate(smartyStreetsWriteRequest);
      await google.sheets('v4').spreadsheets.values.batchUpdate(combinedSheetWriteRequest);
    }
  } catch (error) {
    console.error(`Error getting sheet for ${country}`, error);
  }
};

module.exports.smarty_streets_analysis = functions.https.onRequest(async (req, res) => {
  const country = get_country_from_path(req);
  if (!(country in constants.SHEETS)) {
    res.status(400).send(`invalid country: ${country} for ${req.path}`);
    return;
  }

  await annotateSmartyStreetsAddresses(country);
  res.status(200).send("Smarty Streets Output tab updated successfully!");
});

async function writeCommandLinks(country) {
  const client = await getAuthorizedClient();

  const sheetId = constants.SHEETS[country];

  // Open relevant sheet
  const sheets = google.sheets('v4');
  const request = {
    spreadsheetId: sheetId,
    range: 'Combined'
  };
  request.auth = client;

  const response = await sheets.spreadsheets.values.get(request);
  const data = response.data;

  const upperCaseCountry = country.toUpperCase();

  const headers = data.values[1];
  const [header_values, col_labels, real_values] = splitValues(data);

  const rowIdIndex = headers.findIndex(e => e === 'row_id');
  const lgtmLinkIndex = headers.findIndex(e => e === 'lgtm_link');
  const removeLinkIndex = headers.findIndex(e => e === 'remove_link');
  if (rowIdIndex === -1 || lgtmLinkIndex === -1 || removeLinkIndex === -1) {
    console.error('No row_id or lgtm_link or remove_link');
    return;
  }

  const lgtmLinkColumn = COLUMNS[lgtmLinkIndex];
  const removeLinkColumn = COLUMNS[removeLinkIndex];

  const writeData = [];
  const writeRequest = {
    spreadsheetId: sheetId,
    resource: {
      valueInputOption: 'USER_ENTERED',
      data: writeData
    }
  };
  writeRequest.auth = client;
  const date = (new Date()).getTime();
  real_values.forEach((entry, index) => {
    const row_id = entry[rowIdIndex];

    // Row numbers start at 1.  First 2 rows are headers, so we need to add 2.
    const row_num = index + 1 + 2;

    const command = { i: row_id, d: date, a: 'g', c: country };
    const commandUrl = 'https://findthemasks.com/api/command/';
    // Commands:
    //   g = still good
    //   r = remove
    writeData.push({
      range: `${COMBINED_WRITEBACK_SHEET}!${lgtmLinkColumn}${row_num}`,
      values: [[commandUrl + ftmEncrypt.encryptCommand(command)]]
    });

    command.a = 'r';
    writeData.push({
      range: `${COMBINED_WRITEBACK_SHEET}!${removeLinkColumn}${row_num}`,
      values: [[commandUrl + ftmEncrypt.encryptCommand(command)]]
    });
  });

  await google.sheets('v4').spreadsheets.values.batchUpdate(writeRequest);
}

module.exports.make_command_links = functions.https.onRequest(async (req, res) => {
  const country = get_country_from_path(req);
  if (!(country in constants.SHEETS)) {
    res.status(400).send(`invalid country: ${country} for ${req.path}`);
    return;
  }

  try {
    await writeCommandLinks(country);
    res.status(200).send("Write back mail links");
  } catch (e) {
    console.log(e);
    res.status(500).send("Failed to write back email links");
  }
});

module.exports.exec = functions.https.onRequest(async (req, res) => {
  if (!req.query.cmd) {
    res.status(400).send("Missing command");
    return;
  }

  const scriptId = "MQPwW8kpoHYv45_afG7B_v2XJ7hljrEEe";

  // Call the Apps Script API run method
  //   'scriptId' is the URL parameter that states what script to run
  //   'resource' describes the run request body (with the function name
  //              to execute)
  const script = google.script('v1');
  const command = {
    action: JSON.parse(req.query.cmd),
    ts: (new Date()).getTime()
  };
  const cmdJson = JSON.stringify(command);
  const signature = crypto.createHmac("sha256", APPSCRIPT_AUTH_SECRET).update(cmdJson).digest("base64");

  const request = {
    scriptId,
    resource: {
      function: 'executeCommand',
      parameters: [
        cmdJson,
        signature,
      ],
    }
  };
  const client = await getAuthorizedClient();
  request.auth = client;
  const scriptResp = await script.scripts.run(request);
  res.status(200).send(JSON.stringify(scriptResp.data, null, 2));
});
