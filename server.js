const express = require('express');
const expressHandlebars = require('express-handlebars');
const https = require('https');
const { createProxyMiddleware } = require('http-proxy-middleware');
const setCurrentCountry = require('./middleware/setCurrentCountry.js');
const setBananaI18n = require('./middleware/setBananaI18n.js');
const localizeContactInfo = require('./viewHelpers/localizeContactInfo.js');
const selectMaskMatchPartialPath = require('./viewHelpers/selectMaskMatchPartialPath');
const selectLargeDonationSitesPartialPath = require('./viewHelpers/selectLargeDonationSitesPartialPath');
const getDonationFormUrl = require('./viewHelpers/getDonationFormUrl.js');
const formatFbLocale = require('./utils/formatFbLocale');
require('dotenv').config();

const herokuVersion = process.env.HEROKU_RELEASE_VERSION;

const app = express();
const router = express.Router();
const port = process.env.PORT || 3000;

app.engine('handlebars', expressHandlebars());
app.set('view engine', 'handlebars');

app.set('strict routing', true);

app.use(setCurrentCountry);
app.use(setBananaI18n);

// Install the webpack-dev-middleware for all the hot-reload goodness in dev.
if (process.env.NODE_ENV !== 'production') {
  /* eslint-disable import/no-extraneous-dependencies, global-require */
  const webpack = require('webpack');
  const middleware = require('webpack-dev-middleware');
  const webpackConfig = require('./webpack-hot.config.js');
  const compiler = webpack(webpackConfig);
  app.use(middleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
  }));
  app.use(require('webpack-hot-middleware')(compiler));
  /* eslint-enable import/no-extraneous-dependencies, global-require */
}

app.use((req, res, next) => {
  const schema = req.headers['x-forwarded-proto'];
  const host = req.headers.host.split(':')[0];

  if (schema === 'https' || host === 'local.findthemasks.com' || host === 'localhost') {
    next();
    return;
  }
  res.redirect(`https://${req.headers.host}${req.url}`);

  res.redirect(`https://${req.headers.host}${req.url}`);
});

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.set('Cache-Control', 'public, max-age=300');
  } else {
    res.set('Cache-Control', 'no-cache');
  }
  next();
});

app.use(express.static('public'));

router.get(['/', '/index.html'], (req, res) => {
  res.render('index', {
    version: herokuVersion,
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: res.locals.banana.i18n('ftm-index-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-index-og-description'),
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    localizeContactInfo: localizeContactInfo(res.locals.currentCountry),
  });
});

router.get('/faq', (req, res) => {
  res.render('faq', {
    version: herokuVersion,
    layout: 'static',
    ogTitle: res.locals.banana.i18n('ftm-index-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
    largeDonationSitesPartialPath: selectLargeDonationSitesPartialPath(res.locals.currentCountry),
    maskMatchPartialPath: selectMaskMatchPartialPath(res.locals.currentCountry),
  });
});

router.get(['/give', '/give.html'], (req, res) => {
  res.render('give', {
    version: herokuVersion,
    layout: 'give',
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: res.locals.banana.i18n('ftm-give-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  });
});

router.get(['/makers'], (req, res) => {
  res.render('makers', {
    version: herokuVersion,
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: res.locals.banana.i18n('ftm-makers-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-makers-og-description'),
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    localizeContactInfo: localizeContactInfo(res.locals.currentCountry),
  });
});

router.get('/privacy-policy', (req, res) => {
  res.render('privacy-policy', {
    version: herokuVersion,
    layout: 'static',
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: res.locals.banana.i18n('ftm-privacy-policy-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-privacy-policy-og-description'),
  });
});

router.get(['/special-projects/la-makers'], (req, res) => {
  res.render('special-projects/la-makers', {
    version: herokuVersion,
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: 'Los Angeles Makers',
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: 'Map of Vetter Makers for the city of Los Angeles',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    localizeContactInfo: localizeContactInfo(res.locals.currentCountry),
  });
});

router.get(['/request', '/request.html'], (req, res) => {
  res.render('request', {
    layout: false,
    version: herokuVersion,
  });
});

router.get(['/stats', '/stats.html'], (req, res) => {
  res.render('stats', {
    layout: false,
    version: herokuVersion,
  });
});

router.get('/volunteer', (req, res) => {
  res.render('volunteer', {
    layout: 'static',
    ogTitle: res.locals.banana.i18n('ftm-index-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
    version: herokuVersion,
  });
});

router.get('/blog/2020-04-21-data-insights', (req, res) => {
  res.render('blog/2020_04_21_data_insights', {
    layout: 'static',
    title: 'Insights from FindTheMasks-US Data',
    ogTitle: 'Insights from FindTheMasks-US Data',
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
  });
});

router.get(['/whoweare', '/whoweare.html'], (req, res) => {
  res.render('whoweare', {
    layout: 'static',
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: res.locals.banana.i18n('ftm-about-us-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
    version: herokuVersion,
  });
});

router.get('/partners', (req, res) => {
  res.render('partners', {
    layout: 'static',
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: res.locals.banana.i18n('ftm-partners-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
    version: herokuVersion,
  });
});

router.get(['/404', '/404.html'], (req, res) => {
  res.render('404', { layout: false });
});

router.get('/donation-form', (req, res) => {
  res.redirect(getDonationFormUrl(res.locals.currentCountry, res.locals.locale));
});

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

app.use('/data(-:countryCode)?.json', (req, res) => {
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

app.use('/data(-:countryCode)?.csv', createProxyMiddleware({
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

app.use(/\/[a-zA-Z]{2}/, gbUkRedirect);
app.use(/\/[a-zA-Z]{2}/, router);
app.use('/', router);

app.use((req, res) => {
  res.status(404).redirect('/');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
