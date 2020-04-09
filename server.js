const express = require('express');
const expressHandlebars = require('express-handlebars');
require('dotenv').config();
const app = new express();
const router = express.Router();
const port = process.env.PORT || 3000;

app.engine('handlebars', expressHandlebars());
app.set('view engine', 'handlebars');

app.set('strict routing', true);

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
    ogDescription: 'Find where you can donate your masks or other personal protective equipment (PPE) in your local area.'
  });
});

router.get(['/give', '/give.html'], (req, res) => {
  res.render('give', {
    ogTitle: '#findthemasks | give',
    ogUrl: 'https://findthemasks.com/give',
    ogDescription: 'America’s frontline healthcare workers are treating COVID-19 patients without adequate protective gear, risking their lives! We need to find the masks. All of these masks can save lives now if you get them into the hands of healthcare workers.'
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
  res.render('whoweare', { layout: false });
});

router.get(['/404', '/404.html'], (req, res) => {
  res.render('404', { layout: false });
});

router.get('/:countryCode/donation-form', (req, res) => {
  res.redirect(`/${req.params.countryCode}/donation-form-bounce.html?locale=${req.query.locale}`);
});

app.get('/config.js', (req, res) => {
  const envVariables = [
    'GOOGLE_MAPS_API_KEY'
  ];
  const envVarJSON = getEnvironmentVarJSON(envVariables);
  const windowVarScript = createWindowVarScript(envVarJSON);
  res.type('.js');
  res.send(windowVarScript);
});

app.use('/', router);
app.use('/:countryCode', router);

const getEnvironmentVarJSON = variableArray => {
  let varJSON = {};
  variableArray.forEach(variable => {
    varJSON[variable] = process.env[variable];
  });
  return varJSON;
};

const createWindowVarScript = jsonData => {
  var windowScript = '';
  for (property in jsonData) {
    windowScript += `window.${property} = "${jsonData[property]}";\n`;
  }
  return windowScript;
};

app.listen(port, () => {
  console.log('Server listening on port ' + port);
});
