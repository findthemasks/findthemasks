// Routes that are mounted under country codes or other paths.

const express = require('express');
const formatFbLocale = require('./utils/formatFbLocale');
const setDataset = require('./utils/setDataset');
const getDonationFormUrl = require('./viewHelpers/getDonationFormUrl.js');
const localizePartialPath = require('./viewHelpers/localizePartialPath');
const getLocalContactEmail = require('./viewHelpers/getLocalContactEmail');
const setBananaI18n = require('./middleware/setBananaI18n.js');
const setCurrentUrl = require('./middleware/setCurrentUrl.js');
const linkPartners = require('./linkPartners.js');

const herokuVersion = process.env.HEROKU_RELEASE_VERSION;

const router = express.Router();

router.use(setCurrentUrl);
router.use(setBananaI18n);

router.get(['/', '/index.html'], (req, res) => {
  const isMaker = res.locals.dataset === 'makers';
  res.render('index', {
    version: herokuVersion,
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: isMaker ? res.locals.banana.i18n('ftm-makers-og-title') : res.locals.banana.i18n('ftm-index-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: isMaker ? res.locals.banana.i18n('ftm-makers-og-description') : res.locals.banana.i18n('ftm-index-og-description'),
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    localizeContactInfo: localizePartialPath('contact_info', res.locals.countryCode),
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
  });
});

router.get('/faq', (req, res) => {
  res.render('faq', {
    version: herokuVersion,
    layout: 'static',
    ogTitle: res.locals.banana.i18n('ftm-index-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
    largeDonationSitesPartialPath: localizePartialPath('large_donation_sites', res.locals.countryCode),
    maskMatchPartialPath: localizePartialPath('mask_match', res.locals.countryCode),
    localContactEmail: getLocalContactEmail(res.locals.countryCode),
  });
});

router.get(['/give', '/give.html', '/embed'], (req, res) => {
  // Set up partner links, when applicable.
  if (req.headers.referer) {
    const referer = new URL(req.headers.referer);
    if (linkPartners[referer.hostname]) {
      res.locals.partnerSite = `${referer.origin}${linkPartners[referer.hostname]}`;
      res.locals.partnerStyleClass = `icon-${referer.hostname}`;
    }
  }

  const isMaker = res.locals.dataset === 'makers';
  res.render('give', {
    version: herokuVersion,
    layout: 'give',
    ogLocale: formatFbLocale(res.locals.locale),
    ogTitle: isMaker ? '#findthemasks | makers embed' : res.locals.banana.i18n('ftm-give-og-title'),
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-description'),
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
    hideList: req.query['hide-list'] === 'true',
    hideFilters: req.query['hide-filters'] === 'true',
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
    localizeContactInfo: localizePartialPath('contact_info', res.locals.countryCode),
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
    localContactEmail: getLocalContactEmail(res.locals.countryCode),
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

router.get('/blog/2020-05-14-data-update', (req, res) => {
  res.render('blog/2020_05_14_data_update', {
    layout: 'static',
    title: 'FindTheMasks-US Data Update',
    ogTitle: 'FindTheMasks-US Data Update',
    ogUrl: `http://${req.hostname}${req.originalUrl}`,
    ogDescription: res.locals.banana.i18n('ftm-default-og-datablog-2'),
    ogImage: 'https://findthemasks.com/images/needs20200514Preview.png',
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
    regionalSpotlightPartialPath: localizePartialPath('regional_spotlight', res.locals.countryCode),
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
  res.redirect(getDonationFormUrl(res.locals.countryCode, res.locals.locale));
});

router.get('/maker-form', (req, res) => {
  res.redirect('https://airtable.com/shruH5B27UP3PqKgg');
});

// Recursively handle routes for makers overriding the dataset so the main
// map functionality can be run in a different "mode" so to speak.
router.use('/makers', (req, res, next) => {
  // Override the dataset. Expect countryCode to be set at the top-level routing.
  res.locals.dataset = setDataset(req.query, 'makers');

  router(req, res, next);
});

module.exports = router;
