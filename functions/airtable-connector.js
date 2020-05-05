const Airtable = require('airtable');
const functions = require('firebase-functions');
const zipcodes = require('zipcodes');

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
      "lat", 
      "lng",
];

let AIRTABLE_API_KEY = '';

if (functions.config().findthemasks !== undefined) {
  AIRTABLE_API_KEY = functions.config().findthemasks.airtable_api_key;
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

function loadMakerData(admin, req, res) {
  const base = new Airtable({apiKey: 'key7sP7fMv2drjUnJ'}).base('appmMuprpuCFw4wCd');

  const items = [];
  base('Spaces and Groups').select({
    view: "Public Map Export"
  }).all().then(async records => {
    const entries = [];
    const saves = [];
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
        let geocode = null;
        if (entry.zip) {
          geocode = zipcodes.lookup(entry.zip);
        } else {
          geocode = zipcodes.lookup(entry.city, entry.state);
        }
        if (geocode && geocode.latitude && geocode.longitude) {
          entry.lat = geocode.latitude;
          entry.lng = geocode.longitude;
          record.set('[lat]', geocode.latitude);
          record.set('[lng]', geocode.longitude);
          saves.push(record.save());
        }
      }
    }
    await Promise.all(saves);
    return entries;
  }).then(async (entries) => {
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
  }).catch(err => {
    return res.status(500).send(err);
  });

}

module.exports = { loadMakerData };
