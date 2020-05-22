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

  if (response.data.results && response.data.results.length > 0) {
    const result = response.data.results[0];
    const retval = {
      canonical_address: result.formatted_address,
      location: result.geometry.location
    };
    return retval;
  } else {
    console.error(response);
    throw new Error(response);
  }
}

module.exports = { geocodeAddress }
