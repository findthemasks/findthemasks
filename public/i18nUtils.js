import getCountry from './getCountry.js';

export const DEFAULT_LOCALE = 'en';

// default is null so that i18n can fallback to browser locale preferences
// fallback to en if no locale detected is handled there
export const getCurrentLocaleParam = (defaultLocale = null) => {
  const searchParams = new URLSearchParams((new URL(window.location)).search);
  return searchParams.get('locale') || searchParams.get('fb_locale') || defaultLocale;
};

export const getMapsLanguageRegion = () => {
  const currentLocale = getCurrentLocaleParam(DEFAULT_LOCALE);

  let language;
  const region = getCountry().toUpperCase();

  if (currentLocale) {
    language = currentLocale.split('-')[0];
  }

  return { language: language, region: region };
};
