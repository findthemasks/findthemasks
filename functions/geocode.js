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

// Fetch lat & lng for the given address by making a call to the Google Maps API.
// Returns an object with numeric lat and lng fields.
async function geocodeAddress(address) {
  const response = await geocodeLimiter.schedule(() => maps_client.geocode({
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

module.exports = { geocodeAddress, makeAddress }
