

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

function updateCachedData(response, cache, countryCode, now, res) {
  let newData = '';
  response.on('data', (d) => { newData += d; });
  response.on('end', () => {
    console.log('we hit end');
    if (response.statusCode === 200) {
      // Cache for 5 mins.
      const newExpiresAt = new Date(now.getTime() + (5 * 60 * 1000));
      // eslint-disable-next-line no-param-reassign
      cache[countryCode] = {
        expires_at: newExpiresAt,
        data: newData,
      };
    }
    sendDataJson(cache, countryCode, res);
  });
}

const methods = {
  sendDataJson,
  generatePath,
  updateCachedData,
};

module.exports = methods;