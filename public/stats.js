import toDataByLocation from './toDataByLocation.js';

document.addEventListener("DOMContentLoaded", function() {
  $.getJSON("https://findthemasks.com/data.json", function(result){
    const locations = toDataByLocation(result);

    let totalCount = 0;
    let totalCities = 0;
    const stateCounts = {};

    for (const state of Object.keys(locations).sort()) {
      const cities = locations[state];
      const citiesKeys = Object.keys(cities);
      const stateCitiesCount = citiesKeys.length;

      totalCities += stateCitiesCount;
      stateCounts[state] = stateCitiesCount;

      for (const city of citiesKeys.sort()) {
        for (const entry of cities[city]) {
          totalCount += 1
        }
      }
    }

    const statsHtml = [];

    statsHtml.push(`<p><strong>${$.i18n('ftm-total-donation-sites-count')}</strong> ${totalCount}</p>`);
    statsHtml.push(`<p><strong>${$.i18n('ftm-total-donation-sites-cities-count')}</strong> ${totalCities}</p>`);
    statsHtml.push(`<p><strong>${$.i18n('ftm-state-donation-sites')}</strong></p>`);
    for (const state of Object.keys(stateCounts)) {
      statsHtml.push(`<div>${state}: ${stateCounts[state]}</div>`);
    }

    $('.stats-container').html(statsHtml);
  });
});
