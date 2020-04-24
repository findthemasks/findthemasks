const fs = require('fs');

module.exports = (currentCountry) => {
  try {
    if (fs.existsSync(`./views/partials/countries/${currentCountry}/mask_match.handlebars`)) {
      return `countries/${currentCountry}/mask_match`;
    }
    return 'countries/default/mask_match';
  } catch (err) {
    return 'countries/default/mask_match';
  }
};
