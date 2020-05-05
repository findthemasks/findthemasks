// Routes that stay on the root of the application.

const express = require('express');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const applicationRoutes = require('./applicationRoutes');
const countries = require('./client/countries.js'); // TODO: Move out of client.

const router = express.Router();

const cachedData = {};
const cachedMakersData = {};

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

function sendDataJsonFromCache(cache, prefix, countryCode, res) {
  const now = new Date();
  if (countryCode in cache && cache[countryCode].expires_at > now) {
    sendDataJson(cache, countryCode, res);
    return;
  }

  // Otherwise go fetch it.
  const options = {
    hostname: 'storage.googleapis.com',
    port: 443,
    path: `/findthemasks.appspot.com/${prefix}-${countryCode}.json`,
    method: 'GET',
  };

  let newData = '';
  const dataReq = https.request(options, (dataRes) => {
    dataRes.on('data', (d) => { newData += d; });
    dataRes.on('end', () => {
      if (dataRes.statusCode === 200) {
        // Cache for 5 mins.
        const newExpiresAt = new Date(now.getTime() + (5 * 60 * 1000));
        cache[countryCode] = {
          expires_at: newExpiresAt,
          data: newData,
        };
      }

      sendDataJson(cache, countryCode, res);
    });
  });

  dataReq.on('error', (error) => {
    console.error(`unable to fetch data for ${countryCode}: ${error}. Sending stale data.`);
    // Send stale data.
    sendDataJson(cache, countryCode, res);
  });

  dataReq.end();
}

router.use(express.static('public'));

router.get('/data(-:countryCode)?.json', (req, res) => {
  const countryCode = req.params.countryCode || 'us';
  sendDataJsonFromCache(cachedData, 'data', countryCode, res);
});

router.get('/makers(-:countryCode)?.json', (req, res) => {
  const countryCode = req.params.countryCode || 'us';
  sendDataJsonFromCache(cachedMakersData, 'makers', countryCode, res);
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
