import toDataByLocation from './toDataByLocation.js';
import countries from './countries.js';
import getCountry from './getCountry.js';

document.addEventListener("DOMContentLoaded", function() {
  const currentCountry = getCountry();

  const url = new URL(window.location);
  const directories = url.pathname.split("/");

  let countryDataFilename;

  // TODO: super brittle
  if (directories.length > 2 && directories[1] !== 'us') {
    countryDataFilename = `data-${directories[1]}.json`;
  } else {
    countryDataFilename = 'data.json';
  }

  $.getJSON(`https://findthemasks.com/${countryDataFilename}`, function(result){
    const locations = toDataByLocation(result);

    let totalCount = 0;
    let totalCities = 0;
    const stateCounts = {};

    for (const state of Object.keys(locations).sort()) {
      const cities = locations[state].cities;
      const citiesKeys = Object.keys(cities);
      const stateCitiesCount = citiesKeys.length;

      totalCities += stateCitiesCount;
      stateCounts[state] = stateCitiesCount;

      for (const city of citiesKeys) {
        totalCount += cities[city].entries.length;
      }
    }

    const statsHtml = [];

    statsHtml.push(`<p><strong>${$.i18n('ftm-total-donation-sites-count')}</strong> ${totalCount}</p>`);
    statsHtml.push(`<p><strong>${$.i18n('ftm-total-donation-sites-cities-count')}</strong> ${totalCities}</p>`);
    statsHtml.push(`<p><strong>${$.i18n('ftm-administrative-region-donation-sites', $.i18n(countries[currentCountry].administrativeRegionI18nString))}</strong></p>`);
    for (const state of Object.keys(stateCounts)) {
      statsHtml.push(`<div>${state}: ${stateCounts[state]}</div>`);
    }

    $('.stats-container').html(statsHtml);
  });
});
