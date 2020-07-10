const https = require('https');

const now = new Date();

function sendDataJson(cache, countryCode, res) {
  const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (countryCode in cache) {
    // Return memoized data.
    res.writeHead(200, HEADERS);
    res.write(cache[countryCode].data);
    res.end();
  } else {
    res.sendStatus(404);
  }
}

function generatePath(prefix, countryCode) {
  return `/findthemasks.appspot.com/${prefix}-${countryCode}.json`;
}

function updateCachedData (cache, countryCode, newData) {
  const newExpiresAt = new Date(now.getTime() + (5 * 60 * 1000));
  // eslint-disable-next-line no-param-reassign
  cache[countryCode] = {
    expires_at: newExpiresAt,
    data: newData,
  };
}

function makeHttpRequest (options) {
  return new Promise((resolve, reject) => {
    const dataReq = new https.request(options, (res) => {
      let newData = '';
      res.on('data', (d) => { newData += d });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(newData);
        }
        else{
          reject(new Error(`Bad status code: ${res.statusCode}`));
        }
      });
    });

    dataReq.on('error', (error) => {
      reject(error);
    });

    dataReq.end();
  });
}

const methods = {
  now,
  sendDataJson,
  generatePath,
  makeHttpRequest,
  updateCachedData,
};

module.exports = methods;