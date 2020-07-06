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
module.exports = { sendDataJson };