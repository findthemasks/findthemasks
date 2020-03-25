import toDataByLocation from './toDataByLocation.js';

document.addEventListener("DOMContentLoaded", function() {
  $.getJSON("https://findthemasks.com/data.json", function(result){
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

    statsHtml.push(`<p><strong>Total Donation Sites</strong>: ${totalCount}</p>`);
    statsHtml.push(`<p><strong>Total Cities with Donation Sites</strong>: ${totalCities}</p>`);
    statsHtml.push('<p><strong>Donation Sites by State</strong>:</p>');
    for (const state of Object.keys(stateCounts)) {
      statsHtml.push(`<div>${state}: ${stateCounts[state]}</div>`);
    }

    $('.stats-container').html(statsHtml);
  });
});
