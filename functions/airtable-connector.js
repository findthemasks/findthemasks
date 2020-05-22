const Airtable = require('airtable');
const functions = require('firebase-functions');
const { geocodeAddress } = require('./geocode.js');
const { readAirtableSharedView, parseAirtableData } = require('./airtable-shared-view.js');

const FIELDS = [
      "approved", 
      "name", 
      "website", 
      "public_contact", 
      "city", 
      "state", 
      "zip", 
      "country", 
      "capabilities", 
      "products", 
      "other_product", 
      "face_shield_type", 
      "collecting_site", 
      "shipping", 
      "accepting_volunteers", 
      "other_type_of_space", 
      "accepting_ppe_requests", 
      "org_collaboration", 
      "other_capability", 
      "group_type",
      "min_request",
      "lat", 
      "lng",
      "description",
];

let AIRTABLE_API_KEY = null;

if (functions.config().findthemasks !== undefined) {
  AIRTABLE_API_KEY = functions.config().findthemasks.airtable_api_key;
}

if (!AIRTABLE_API_KEY) {
  AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
}


// The data.json format is a bit legacy. It has
//   { values: [
//       [this, row, ignored],
//       [header1, header2, header3],
//       [val1, val2, va3],
//     ]
//   }
//
//   The second row is the header instead of the first because when
//   originally using Google sheets, the first row was the human
//   visible display name of the form.
function toDataJson(entries) {
  const values = [];
  for (const entry of entries) {
    const row = [];
    values.push(row);
    for (const field of FIELDS) {
      if (entry[field] !== undefined) {
        row.push(entry[field]);
      } else {
        if (field === 'approved') {
          row.push('x');
        } else {
          row.push('');
        }
      }
    }
  }
  return {
    values: [
      FIELDS,
      FIELDS,
      ...values,
    ]
  };
}

function loadNomData(admin) {
  const base = new Airtable({apiKey: AIRTABLE_API_KEY}).base('appmMuprpuCFw4wCd');

  const items = [];
  return base('Spaces and Groups').select({
    view: "Public Map Export"
  }).all().then(async records => {
    const entries = [];
    const saves = [];
    const geocodePromises = [];
    for (const record of records) {
      const entry = {};
      for (const [fieldname, value] of Object.entries(record.fields)) {
        const stable_header_match = fieldname.match(/\[(\S+)\]$/);
        if (stable_header_match && stable_header_match[1]) {
          const stable_header = stable_header_match[1];
          if (typeof value === 'string') {
            entry[stable_header] = value.trim();
          } else if (Array.isArray(value)) {
            entry[stable_header] = value.join(',');
          } else {
            entry[stable_header] = value;
          }
        }
      }
      entries.push(entry);

      // Missing lat/lng. Geocode it.
      if (!entry.lat || !entry.lng) {
        let geocode = geocodeEntry(entry);
        // eslint-disable-next-line promise/no-nesting
        geocodePromises.push(geocode.then(e => {
          record.set('[lat]', geocode.latitude);
          record.set('[lng]', geocode.longitude);
          return saves.push(record.save());
        }));
      }
    }
    await Promise.all(geocodePromises);
    await Promise.all(saves);
    return entries;
  });
}

async function writeMakerJson(entries, admin, req, res) {
  const data = toDataJson(entries);
  const datafileRef = admin.storage().bucket().file('makers-us.json');
  await datafileRef.save(JSON.stringify(data), {
    gzip: true,
    metadata: {
      cacheControl: "public, max-age=20",
      contentType: "application/json"
    },
    predefinedAcl: "publicRead"
  });
  return res.status(200).send(`<body>loaded: ${JSON.stringify(data, null, 2)}</body>`);
}

function geocodeEntry(entry) {
  let address = "";
  if (entry.zip) {
    address = `${entry.zip}`;
  } else if (entry.country) {
    address = `${entry.country}`;
    if (entry.state) {
      address = `${entry.state} ${address}`;
      if (entry.city) {
        address = `${entry.city}, ${address}`;
      }
    }
  }
  entry.address = address;

  return geocodeAddress(address).then(geocode => {
    entry.lat = geocode.location.lat;
    entry.lng = geocode.location.lng;
    return entry;
  }).catch(e => console.error(e))
}

async function loadOsmsData() {
  const OSMS_SHARED_VIEW = "https://airtable.com/shr3ztpGfdigyTkBI";

  const values = [];

  const airtableData = await readAirtableSharedView(OSMS_SHARED_VIEW);
  const dataRows = parseAirtableData(airtableData);
  const geocodePromises = [];

  for (const entry of dataRows) {
    if (entry['Nation of Makers List']) {
      continue;
    }
    entry.website = entry.url;

    values.push(entry);
    geocodePromises.push(geocodeEntry(entry));
  }

  await Promise.all(geocodePromises);
  return values;
}

async function loadMakerData(admin, req, res) {
  const nomData = await loadNomData();
  const osmsData = await loadOsmsData();

  await writeMakerJson([...nomData, ...osmsData], admin, req, res);
}

module.exports = { loadMakerData };
