const fs = require('fs');
const Banana = require('banana-i18n');
const locales = require('../client/locales');
const countries = require('../client/countries');

const DEFAULT_LOCALE = 'en';

const localesMap = {
  en: 'public/i18n/en.json',
  'en-US': 'public/i18n/en.json',
  fr: 'public/i18n/fr-fr.json',
  'fr-FR': 'public/i18n/fr-fr.json',
  de: 'public/i18n/de-de.json',
  'de-DE': 'public/i18n/de-de.json',
  it: 'public/i18n/it-it.json',
  'it-IT': 'public/i18n/it-it.json',
  es: 'public/i18n/es-es.json',
  'es-ES': 'public/i18n/es-es.json',
  pt: 'public/i18n/pt-pt.json',
  'pt-PT': 'public/i18n/pt-pt.json',
  pl: 'public/i18n/pl-pl.json',
  'pl-PL': 'public/i18n/pl-pl.json',
  'zh-TW': 'public/i18n/zh-tw.json',
};

const getConfigForLocale = (locale) => {
  if (locale) {
    if (localesMap[locale]) {
      return {
        locale,
        messages: JSON.parse(fs.readFileSync(localesMap[locale], 'utf8')),
      };
    }

    const language = locale.split('-')[0];

    if (language && localesMap[language]) {
      return {
        locale: language,
        messages: JSON.parse(fs.readFileSync(localesMap[language], 'utf8')),
      };
    }
  }

  return {
    locale: DEFAULT_LOCALE,
    messages: JSON.parse(fs.readFileSync(localesMap.en, 'utf8')),
  };
};

module.exports = (req, res, next) => {
  let locale = req.query.locale || req.query.fb_locale || DEFAULT_LOCALE;

  // Normalize FB locale from fr_FR -> fr-FR
  locale = locale.replace('_', '-');

  const config = getConfigForLocale(locale);
  const banana = new Banana(config.locale, {
    messages: config.messages,
  });

  const translatedLocales = [];
  let activeLocale;

  locales.forEach((l) => {
    const translatedLocale = {
      localeCode: l.localeCode,
      name: banana.i18n(l.i18nString),
    };

    if (translatedLocale.localeCode === locale) {
      activeLocale = translatedLocale;
    }

    translatedLocales.push(translatedLocale);
  });

  const currentCountryCode = res.locals.countryCode;
  let activeCountry;

  const translatedCountries = [];

  Object.keys(countries).forEach((countryCode) => {
    const country = countries[countryCode];
    const translatedCountry = {
      name: banana.i18n(country.i18nString),
      countryCode,
      administrativeRegion: banana.i18n(country.administrativeRegionI18nString),
    };

    if (countryCode === currentCountryCode) {
      activeCountry = translatedCountry;
    }

    translatedCountries.push(translatedCountry);
  });

  const sortedCountries = translatedCountries.sort((a, b) => (
    a.name.localeCompare(b.name)
  ));

  res.locals.locales = translatedLocales;
  res.locals.activeLocale = activeLocale;
  res.locals.countries = sortedCountries;
  res.locals.activeCountry = activeCountry;
  res.locals.locale = locale;
  res.locals.banana = banana;

  next();
};
