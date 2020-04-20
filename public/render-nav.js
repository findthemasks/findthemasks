import countries from './countries.js';
import locales from './locales.js';
import { getCountry } from './getCountry.js';
import { getCurrentLocaleParam, DEFAULT_LOCALE } from './i18nUtils.js';
import { ac, ce, ctn } from './utils.js';
import sendEvent from './sendEvent.js';

const currentCountry = getCountry();
document.body.setAttribute("data-country", currentCountry);

const generateTopNav = () => {
  const currentLocale = getCurrentLocaleParam(DEFAULT_LOCALE);

  const localeDropdownLink = document.getElementById('locales-dropdown');
  const countryDropdownLink = document.getElementById('countries-dropdown');
  const localeDropdownItems = document.getElementById('locales-dropdown-selector');
  const countryDropdownItems = document.getElementById('countries-dropdown-selector');

  if (localeDropdownLink && countryDropdownLink && localeDropdownItems && countryDropdownItems) {
    const sortedLocales = locales.sort((localeA, localeB) => {
      const aLocalized = $.i18n(localeA.i18nString);
      const bLocalized = $.i18n(localeB.i18nString);
      return aLocalized.localeCompare(bLocalized);
    });

    sortedLocales.forEach((locale) => {
      if (locale.localeCode.toLowerCase() === currentLocale.toLowerCase()) {
        localeDropdownLink.textContent = $.i18n(locale.i18nString);
      }

      const element = document.createElement('a');
      element.className = 'dropdown-item';
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('locale', locale.localeCode);
      element.setAttribute('href', currentUrl.href);
      element.textContent = $.i18n(locale.i18nString);
      element.addEventListener("click", () => sendEvent("i18n", 'set-locale', locale.localeCode));
      localeDropdownItems.appendChild(element);
    });

    const sortedCountryKeys = Object.keys(countries).sort((a, b) => {
      const countryA = countries[a];
      const countryB = countries[b];

      const aLocalized = $.i18n(countryA.i18nString);
      const bLocalized = $.i18n(countryB.i18nString);

      return aLocalized.localeCompare(bLocalized);
    });

    sortedCountryKeys.forEach((countryCode) => {
      const country = countries[countryCode];

      if (country.countryCode === currentCountry.toLowerCase()) {
        const img = ce('div', `icon icon-cf_${country.countryCode}`);
        ac(countryDropdownLink, [img, ctn($.i18n(country.i18nString))]);
      }

      const element = document.createElement('a');
      element.className = 'dropdown-item i18n';
      const currentUrl = new URL(window.location.href);
      const pathname = currentUrl.pathname;
      const updatedPath = pathname.replace(/(\/[a-z]{2}\/|\/)/, `/${country.countryCode}/`);
      currentUrl.pathname = updatedPath;

      element.setAttribute(
        'href',
        currentUrl.href
      );

      const img = ce('div', `icon icon-cf_${country.countryCode}`);
      ac(element, [img, ctn($.i18n(country.i18nString))]);
      element.addEventListener("click", () => sendEvent("i18n", 'set-country', country.countryCode));
      countryDropdownItems.appendChild(element);
    });
  }
};

$(function () {
  const url = new URL(window.location);

  // this should happen after the translations load
  $('html').on('i18n:ready', function () {
    generateTopNav();
  });
});
