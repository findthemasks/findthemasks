const express = require('express');
const expressHandlebars = require('express-handlebars');
const vhost = require('vhost');
const setBananaI18n = require('./middleware/setBananaI18n.js');
const setCurrentUrl = require('./middleware/setCurrentUrl.js');
const rootRoutes = require('./rootRoutes');
require('dotenv').config();
require('handlebars-helpers')();

const handlebars = expressHandlebars.create({
  helpers: {
    createLocaleDropdownHref: (localeCode, settings) => {
      const url = new URL(settings.data.root.currentUrl);
      url.searchParams.set('locale', localeCode);

      return url.href;
    },
  },
});

const app = express();
const port = process.env.PORT || 3000;

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('strict routing', true);

app.use(setCurrentUrl);
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

// Makers virutal host.
app.use(vhost(/findthemakers.com|makers.local.findthemasks.com/, (req, res, next) => {
  res.locals.dataset = 'makers';
  rootRoutes(req, res, next);
}));

app.use('/', (req, res, next) => {
  res.locals.dataset = 'requester';
  rootRoutes(req, res, next);
});

app.use((req, res) => {
  res.status(404).redirect('/');
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
