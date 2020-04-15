const url = require('url');
const fs = require('fs');
const Banana = require('banana-i18n');

const DEFAULT_LOCALE = 'en';

const localesMap = {
  "en": "public/i18n/en.json",
  "en-US": "public/i18n/en.json",
  "fr": "public/i18n/fr-fr.json",
  "fr-FR": "public/i18n/fr-fr.json",
  "de": "public/i18n/de-de.json",
  "de-DE": "public/i18n/de-de.json",
  "it": "public/i18n/it-it.json",
  "it-IT": "public/i18n/it-it.json",
  "es": "public/i18n/es-es.json",
  "es-ES": "public/i18n/es-es.json",
  "pt": "public/i18n/pt-pt.json",
  "pt-PT": "public/i18n/pt-pt.json",
  "pl": "public/i18n/pl-pl.json",
  "pl-PL": "public/i18n/pl-pl.json",
  "zh-TW": "public/i18n/zh-tw.json"
};

const getConfigForLocale = (locale) => {
  if (!!locale) {
    if (localesMap[locale]) {
      return {
        locale: locale,
        messages: JSON.parse(fs.readFileSync(localesMap[locale], 'utf8'))
      };
    }

    const language = locale.split('-')[0];

    if (language && localesMap[language]) {
      return {
        locale: language,
        messages: JSON.parse(fs.readFileSync(localesMap[language], 'utf8'))
      };
    }
  }

  return {
    locale: DEFAULT_LOCALE,
    messages: JSON.parse(fs.readFileSync(localesMap.en, 'utf8'))
  };
};

module.exports = (req, res, next) => {
  const locale = req.query.locale || req.query.fb_locale || DEFAULT_LOCALE;

  const config = getConfigForLocale(locale);
  const banana = new Banana(config.locale, {
    messages: config.messages
  });

  res.locals.banana = banana;

  next();
};
