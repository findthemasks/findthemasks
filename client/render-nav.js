import sendEvent from './sendEvent.js';

$(() => {
  // this should happen after the translations load
  $('html').on('i18n:ready', () => {
    const countryLinks = document.getElementsByClassName('countries-dropdown-item');

    for (let i = 0; i < countryLinks.length; i++) {
      const countryLink = countryLinks[i];
      const countryCode = countryLink.getAttribute('data-code');
      countryLink.addEventListener('click', () => sendEvent('i18n', 'set-country', countryCode));
    }

    const localeLinks = document.getElementsByClassName('locales-dropdown-item');

    for (let i = 0; i < localeLinks.length; i++) {
      const localeLink = localeLinks[i];
      const localeCode = localeLink.getAttribute('data-code');
      localeLink.addEventListener('click', () => sendEvent('i18n', 'set-locale', localeCode));
    }
  });
});
