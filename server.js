const express = require('express');
const expressHandlebars = require('express-handlebars');
const vhost = require('vhost');
const rootRoutes = require('./rootRoutes').router;
const navHelpers = require('./viewHelpers/navHelpers');
const setDataset = require('./utils/setDataset');
require('./sendDataJson');
require('dotenv').config();
require('handlebars-helpers')();

const handlebars = expressHandlebars.create({
  helpers: {
    createCountryDropdownHref: navHelpers.createCountryDropdownHref,
    createLocaleDropdownHref: navHelpers.createLocaleDropdownHref,
    createNavbarItemHref: navHelpers.createNavbarItemHref,
    createCrossLink: navHelpers.createCrossLink,
  },
});

const app = express();
const port = process.env.PORT || 3000;

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('strict routing', true);

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

// https redirect, with exclusion for local development.
app.use((req, res, next) => {
  const schema = req.headers['x-forwarded-proto'];
  const host = req.headers.host.split(':')[0];

  if (schema === 'https' || host.match(/local\.findthemasks\.com$/) || host === 'localhost') {
    next();
    return;
  }
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

// Makers virtual host.
app.use(vhost(/findthemakers\.com|www\.findthemakers\.com|makers\.local\.findthemasks.com/, (req, res, next) => {
  res.locals.dataset = setDataset(req.query, 'makers');
  rootRoutes(req, res, next);
}));

app.use('/', (req, res, next) => {
  res.locals.dataset = setDataset(req.query, 'requester');
  rootRoutes(req, res, next);
});

app.use((req, res) => {
  res.status(404).redirect('/');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
