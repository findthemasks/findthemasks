import sendEvent from './sendEvent.js';

$(() => {
  // this should happen after the translations load
  $('html').on('i18n:ready', () => {
    const countryLinks = document.getElementsByClassName('countries-dropdown-item');

    countryLinks.forEach((countryLink) => {
      const countryCode = countryLink.getAttribute('data-code');
      countryLink.addEventListener('click', () => sendEvent('i18n', 'set-country', countryCode));
    });

    const localeLinks = document.getElementsByClassName('locales-dropdown-item');

    localeLinks.forEach((localeLink) => {
      const localeCode = localeLink.getAttribute('data-code');
      localeLink.addEventListener('click', () => sendEvent('i18n', 'set-locale', localeCode));
    });
  });
});
