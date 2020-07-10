// Routes that stay on the root of the application.

const express = require('express');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const applicationRoutes = require('./applicationRoutes');
const apiRoutes = require('./apiRoutes.js');
const countries = require('./constants/countries.js');
const methods = require('./sendDataJson');

const router = express.Router();

const cachedData = {};
const cachedMakersData = {};
const cachedGupData = {};

async function sendDataJsonFromCache(cache, prefix, countryCode, res) {
  const now = methods.now;
  if (countryCode in cache && cache[countryCode].expires_at > now) {
    return methods.sendDataJson(cache, countryCode, res);
  }
  // Otherwise go fetch it.
  const options = {
    hostname: 'storage.googleapis.com',
    port: 443,
    path: methods.generatePath(prefix, countryCode),
    method: 'GET',
  };
  const fetchData = await methods.makeHttpRequest(options).catch((e) => {
    console.error(`unable to fetch data for ${countryCode}: ${error}. Sending stale data.`);
    // Send stale data.
    methods.sendDataJson(cache, countryCode, res);
    return;
  });
  methods.updateCachedData(cache, countryCode, fetchData);
  methods.sendDataJson(cache, countryCode, res);
}

router.use(express.static('public'));

router.use('/api', (req, res, next) => {
  apiRoutes(req, res, next);
});

router.get('/data(-:countryCode)?.json', (req, res) => {
  const countryCode = req.params.countryCode || 'us';
  sendDataJsonFromCache(cachedData, 'data', countryCode, res);
});

router.get('/getusppe-affiliates(-:countryCode)?.json', (req, res) => {
  sendDataJsonFromCache(cachedGupData, 'getusppe-affiliates', 'us', res);
});

router.get('/makers(-:countryCode)?.json', (req, res) => {
  // All make data is in one file right now. Currently calling it us, though
  // "global" is probably the right name.
  sendDataJsonFromCache(cachedMakersData, 'makers', 'us', res);
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
      return null;
    }
    return applicationRoutes(req, res, next);
  }

  return next();
});

router.use('/', (req, res, next) => {
  // Default values for countryCode and dataset.
  res.locals.countryCode = 'us';

  applicationRoutes(req, res, next);
});

module.exports = {
  router,
  sendDataJsonFromCache,
};
