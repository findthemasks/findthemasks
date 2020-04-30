// Routes that stay on the root of the application.

const express = require('express');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const applicationRoutes = require('./applicationRoutes');
const countries = require('./client/countries.js'); // TODO: Move out of client.

const router = express.Router();

const cachedData = {};

function sendDataJson(countryCode, res) {
  const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (countryCode in cachedData) {
    // Return memoized data.
    res.writeHead(200, HEADERS);
    res.write(cachedData[countryCode].data);
    res.end();
  } else {
    res.sendStatus(404);
  }
}

router.use(express.static('public'));

router.get('/data(-:countryCode)?.json', (req, res) => {
  const countryCode = req.params.countryCode || 'us';

  const now = new Date();
  if (countryCode in cachedData && cachedData[countryCode].expires_at > now) {
    sendDataJson(countryCode, res);
    return;
  }

  // Otherwise go fetch it.
  const options = {
    hostname: 'storage.googleapis.com',
    port: 443,
    path: `/findthemasks.appspot.com/data-${countryCode}.json`,
    method: 'GET',
  };

  let newData = '';
  const dataReq = https.request(options, (dataRes) => {
    dataRes.on('data', (d) => { newData += d; });
    dataRes.on('end', () => {
      if (dataRes.statusCode === 200) {
        // Cache for 5 mins.
        const newExpiresAt = new Date(now.getTime() + (5 * 60 * 1000));
        cachedData[countryCode] = {
          expires_at: newExpiresAt,
          data: newData,
        };
      }

      sendDataJson(countryCode, res);
    });
  });

  dataReq.on('error', (error) => {
    console.error(`unable to fetch data for ${countryCode}: ${error}. Sending stale data.`);
    // Send stale data.
    sendDataJson(countryCode, res);
  });

  dataReq.end();
});

router.get('/data(-:countryCode)?.csv', createProxyMiddleware({
  target: 'https://storage.googleapis.com',
  pathRewrite: {
    '^/': '/findthemasks.appspot.com/',
  },
  changeOrigin: true,
}));

// redirect gb -> uk
const gbUkRedirect = (req, res, next) => {
  const { originalUrl } = req;

  if (originalUrl.startsWith('/gb')) {
    res.status(302).redirect(originalUrl.replace(/^\/gb/, '/uk'));
    return;
  }

  next();
};

router.use(/\/[a-zA-Z]{2}/, gbUkRedirect);

const ALL_COUNTRIES = new Set(Object.keys(countries));

router.use('/:countryCode', (req, res, next) => {
  const lowerCased = req.params.countryCode.toLowerCase();

  if (ALL_COUNTRIES.has(lowerCased)) {
    res.locals.countryCode = req.params.countryCode;

    // Redirect to lower-cased path.
    if (req.params.countryCode !== lowerCased) {
      res.status(302).redirect(`/${lowerCased}`);
      return;
    }
    applicationRoutes(req, res, next);
  } else {
    next();
  }
});

router.use('/', (req, res, next) => {
  // Default values for countryCode and dataset.
  res.locals.countryCode = 'us';

  applicationRoutes(req, res, next);
});

module.exports = router;
