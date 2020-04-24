const fs = require('fs');

module.exports = (currentCountry) => {
  try {
    if (fs.existsSync(`./views/partials/countries/${currentCountry}/large_donation_sites.handlebars`)) {
      return `countries/${currentCountry}/large_donation_sites`;
    }
    return 'countries/default/large_donation_sites';
  } catch (err) {
    return 'countries/default/large_donation_sites';
  }
};
