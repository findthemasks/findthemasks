const locales = {
  "en": "i18n/en.json",
  "en-US": "i18n/en.json",
  "fr": "i18n/fr-fr.json",
  "fr-FR": "i18n/fr-fr.json",
  "de": "i18n/de-de.json",
  "de-DE": "i18n/de-de.json",
  "it": "i18n/it-it.json",
  "it-IT": "i18n/it-it.json",
  "es": "i18n/es-es.json",
  "es-ES": "i18n/es-es.json"
};

const getLocale = (detectedLocale) => {
  const searchParams = new URLSearchParams((new URL(window.location)).search);
  return searchParams.get('locale') || detectedLocale;
};

const activeLocaleMap = (locale) => {
  // if user explicitly tells us what they want only return that json file
  if (locale && locales[locale]) {
    return {
      [locale]: locales[locale]
    };
  }

  const language = locale.split('-')[0];

  // if we do not have the locale, check if we have an international language version
  if (locale && locales[language]) {
    return {
      [language]: locales[language]
    };
  }

  // we don't know what the user wants, load english
  return { en: locales.en };
};

$(function () {
  const init = function () {
    // translate static elements and initialize translations
    // then, remove spinner and show page content
    $('.i18n').i18n();
    window.i18nReady = true;
    $('html').trigger('i18n:ready');
    $('.translated-content').css({ display: 'block' });
    $('.languages-loading').css({ display: 'none' });
  };

  const detectedLocale = $.i18n().locale;
  const locale = getLocale(detectedLocale);
  const localeMap = activeLocaleMap(locale);

  if (locale) {
    $.i18n({ locale: locale }).load(localeMap).done(init);
  } else {
    $.i18n().load(localeMap).done(init);
  }
});
