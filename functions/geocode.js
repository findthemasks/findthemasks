const admin = require('firebase-admin');
const Bottleneck = require('bottleneck');
const Client = require("@googlemaps/google-maps-services-js").Client;
const functions = require('firebase-functions');

let GOOGLE_MAPS_API_KEY = null;

if (functions.config().googleapi !== undefined) {
  GOOGLE_MAPS_API_KEY = functions.config().findthemasks.geocode_key;
}

if (!GOOGLE_MAPS_API_KEY) {
  GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
}

// 50qps is rate limit for maps geocoding.
//   https://developers.google.com/maps/faq
const geocodeLimiter = new Bottleneck({
  minTime: 30
});

const maps_client = new Client({});

const GEOCODE_CACHE_PATH = '/geocode_cache';

// Fetch lat & lng for the given address by making a call to the Google Maps API.
// Returns an object with numeric lat and lng fields.
async function geocodeAddress(address) {
  // Cache the result of the geocode in the realtime db since that is muuuch
  // cheaper than the geocode api.
  const base64Address = Buffer.from(address).toString('base64');
  const geocodeCacheRef = admin.database().ref(`${GEOCODE_CACHE_PATH}/${base64Address}`);
  const snapshot = await geocodeCacheRef.once('value');

  let response = null;
  if (snapshot.exists()) {
    return snapshot.val().geocode;
  }
  response = await geocodeLimiter.schedule(() => maps_client.geocode({
    params: {
      address: address,
      key: GOOGLE_MAPS_API_KEY
    },
    timeout: 5000 // milliseconds
  }));

  const retval = {
    canonical_address: "",
    location: {lat: undefined, lng: undefined}
  };
  if (response.status === 200 && response.data.status === 'OK') {
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      retval.canonical_address = result.formatted_address;
      retval.location = result.geometry.location;
    }
  } else {
    throw new Error(`status: ${response.status} req: ${response.config.url} ${JSON.stringify(response.config.params)} result: ${response.data}`);
  }

  // Store the unencoded address too so it's readable in the firebase data dumps.
  await geocodeCacheRef.set({address, geocode: retval});
  return retval;
}

function makeAddress(street, city, state, zip, country) {
  let address = country || '';
  if (zip) {
    address = `${zip}, ${address}`;
  }
  if (state) {
    address = `${state} ${address}`;
  }

  if (city) {
    address = `${city}, ${address}`;
  }

  if (street) {
    address = `${street} ${address}`;
  }

  address = address.trim();
  // remove triling commas
  while (address && address.charAt(address.length - 1) === ',') {
    address = address.slice(0, address.length - 1)
  }

  return address;
}
function initiateWriteRequest (sheet_id, client) {
  const write_request = {
    spreadsheetId: sheet_id,
    resource: {
      valueInputOption: 'USER_ENTERED',
    }
  };
  write_request.auth = client;
  return write_request;
}
function fillWriteRequest(to_write_back, columns, COMBINED_WRITEBACK_SHEET) {
  const { latColumn, lngColumn, addressColumn } = columns;
  const data = [];
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
  return data;
}

const methods = {
  geocodeAddress,
  makeAddress,
  fillWriteRequest,
  initiateWriteRequest,
};

module.exports.methods = methods;
