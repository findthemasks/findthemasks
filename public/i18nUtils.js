import getCountry from './getCountry.js';

export const DEFAULT_LOCALE = 'en';

// default is null so that i18n can fallback to browser locale preferences
// fallback to en if no locale detected is handled there
export const getCurrentLocaleParam = (defaultLocale = null) => {
  const searchParams = new URLSearchParams((new URL(window.location)).search);
  return searchParams.get('locale') || defaultLocale;
};

export const getMapsLanguageRegion = () => {
  const currentLocale = getCurrentLocaleParam(DEFAULT_LOCALE);

  let language;
  let region;

  if (currentLocale) {
    // use region from locale if provided, e.g. fr-FR
    [language, region] = currentLocale.split('-');
  }

  if (!region) {
    // if region not provided in locale, use current country
    region = getCountry().toUpperCase();
  }

  return { language: language, region: region };
};
