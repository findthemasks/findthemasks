const express = require('express');
const expressHandlebars = require('express-handlebars');
const setCurrentCountry = require('./middleware/setCurrentCountry.js');
const selectLargeDonationSitesPartialPath = require('./viewHelpers/selectLargeDonationSitesPartialPath');
require('dotenv').config();
const app = new express();
const router = express.Router();
const port = process.env.PORT || 3000;

app.engine('handlebars', expressHandlebars());
app.set('view engine', 'handlebars');

app.set('strict routing', true);

app.use(setCurrentCountry);

app.use(function(req, res, next) {
  const schema = req.headers['x-forwarded-proto'];
  const host = req.headers.host.split(':')[0];

  if (schema === 'https' || host === 'local.findthemasks.com' || host === 'localhost' ) {
    next();
  } else {
    res.redirect('https://' + req.headers.host + req.url);
  }
});

app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300');
  next();
});

app.use(express.static('public'));
router.use(express.static('public'));

router.get(['/', '/index.html'], (req, res) => {
  res.render('index', {
    ogTitle: '#findthemasks',
    ogUrl: 'https://findthemasks.com/',
    ogDescription: 'Find where you can donate your masks or other personal protective equipment (PPE) in your local area.',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    largeDonationSitesPartialPath: selectLargeDonationSitesPartialPath(res.locals.currentCountry)
  });
});

router.get(['/give', '/give.html'], (req, res) => {
  res.render('give', {
    ogTitle: '#findthemasks | give',
    ogUrl: 'https://findthemasks.com/give',
    ogDescription: 'America\'s frontline healthcare workers are treating COVID-19 patients without adequate protective gear, risking their lives! We need to find the masks. All of these masks can save lives now if you get them into the hands of healthcare workers.',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
  });
});

router.get(['/stats', '/stats.html'], (req, res) => {
  res.render('stats', { layout: false });
});

router.get(['/request', '/request.html'], (req, res) => {
  res.render('request', { layout: false });
});

router.get(['/donation-form-bounce', '/donation-form-bounce.html'], (req, res) => {
  res.render('donation-form-bounce', { layout: false });
});

router.get(['/whoweare', '/whoweare.html'], (req, res) => {
  res.render('whoweare', {
    layout: 'static',
    ogTitle: '#findthemasks | About Us',
    ogUrl: 'https://findthemasks.com/whoweare',
    ogDescription: 'America\'s frontline healthcare workers are treating COVID-19 patients without adequate protective gear, risking their lives! We need to find the masks. All of these masks can save lives now if you get them into the hands of healthcare workers.',
  });
});

router.get('/privacy-policy', (req, res) => {
  res.render('privacy-policy', {
    layout: 'static',
    ogTitle: '#findthemasks | Privacy Policy',
    ogUrl: 'https://findthemasks.com/privacy-policy',
    ogDescription: 'Find The Masks privacy policy',
  })
});

router.get(['/404', '/404.html'], (req, res) => {
  res.render('404', { layout: false });
});

router.get('/:countryCode/donation-form', (req, res) => {
  res.redirect(`/${req.params.countryCode}/donation-form-bounce.html?locale=${req.query.locale}`);
});

app.use('/', router);
app.use('/:countryCode', router);

app.listen(port, () => {
  console.log('Server listening on port ' + port);
});
