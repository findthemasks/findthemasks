const data = {"range":"moderated!A1:Z1501","majorDimension":"ROWS","values":[["Approved","Timestamp","What is the name of the hospital or clinic?","Street address for dropoffs?","Drop off instructions, eg curbside procedure or mailing address ATTN: instructions:","What are they accepting?","State?","Will they accept open boxes/bags?","City","","State?","Lat","Lng"],["approved","timestamp","name","address","instructions","accepting","state","open_box","city","","_","lat","lng"],["x","3/19/2020 11:14:25","Swedish Ballard","5300 Tallman Ave NW\nSeattle, WA 98107","Put in donations bin at registration desk or at medical treatment center.","N95s, Surgical Masks","WA","Yes","Seattle","","","47.6674625","-122.3795306"],["x","3/19/2020 14:37:04","Zuckerberg San Francisco General Hospital","1001 Potrero Ave\nSan Francisco, CA 94110","For now, call ahead: call the switchboard (628-206-8000), ask for \"Donations Medical Equipment\" or the front desk to arrange drop-off at the main entrance off 23rd St.","N95s, Surgical Masks","CA","No","San Francisco","",""],["x","3/19/2020 15:11:30","Franciscan Women's Health Associates - Burien","16045 1st Ave S\nBurien, WA 98148","Bring up stairs to the Women's care desk or call and a staff member will come down to get them.","N95s, Surgical Masks","WA","Yes","Burien","",""]]};

"use strict";

const Client = require("@googlemaps/google-maps-services-js").Client;


// Fetch array with lat & lng for the given address.  Returns "N/A", "N/A" if geocoding fails.
// Either fetches by making a call to the Google Maps API or retrieving from a cache.
function getLatLng(address, client) {
  var location;
  // BEFORE CHECKING IN, REPLACE THE KEY BELOW WITH A REFERENCE TO
  // A PRODUCTION KEY (NOT DEV KEY!)
  var foo = client
    .geocode({
      params: {
        address: address,
        key: 'AIzaSyD6gBXBlViBs-6OXMftR2PdNW6Q7ycZ47g'
      },
      timeout: 1000 // milliseconds
    })
    .then(r => {
      console.log(r.data);
      if (r.data.results && r.data.results.length > 0) {
        location = r.data.results[0].geometry.location;
        console.log("latlng:" + location.lat + ", " + location.lng); 
      }
    })
    .catch(e => {
      console.log(e);
    });
    
  Promise.all([ foo ])
    .then(function() {
        console.log('location: ' + location);
    });
  
  if (location != null) {
    return [ location.lat, location.lng ];
    console.log('location: '+ location);
  } else {
    return [ "N/A", "N/A"];
  }          
}

function toDataByLocation(data) {

  const client = new Client({});
  
  const headers = data.values[1];
  const approvedIndex = headers.findIndex( e => e === 'approved' );
  const stateIndex = headers.findIndex( e => e === 'state' );
  const cityIndex = headers.findIndex( e => e === 'city' );
  const addressIndex = headers.findIndex( e => e === 'address' );
  const latIndex = headers.findIndex( e => e === 'lat' );
  const lngIndex = headers.findIndex( e => e === 'lng' );
  const data_by_location = {};

  const published_entries = data.values.slice(1).filter((entry) => entry[approvedIndex] === "x");

  published_entries.forEach( entry => {
    const state = entry[stateIndex];
    const city = entry[cityIndex];

    // Do geocoding and add lat/lng to data iff we don't already have a latLng for
    // the address *and* the address has been moderated.  (In this code block, all
    // data has already been moderated.)
    const address = entry[addressIndex];

    // Check if entry's length is too short to possibly have a latitude, we need
    // to geocode.  If the value for lat is "", we also need to geocode.
    // @Someone who knows JavaScript better than me: what's the right way to do this?
    if (entry.length < (latIndex + 1) || entry[latIndex] == "") {
      var lat_lng = getLatLng(address, client);
      
     // // Update entry to include the latLng pair returned by geocoding.
     // entry[latIndex] = lat_lng[0];
     // entry[lngIndex] = lat_lng[1];
    }

///////////////////////////////////////////////////////////////////////
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
        entry_obj[value] = entry[index].trim()
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


  const data_by_location = toDataByLocation(data);
 // const html_snippets = toHtmlSnippets(data_by_location);
 // console.log(html_snippets);



