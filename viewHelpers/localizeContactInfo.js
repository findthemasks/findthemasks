const fs = require('fs');

module.exports = (currentCountry) => {
  try {
    if (fs.existsSync(`./views/partials/countries/${currentCountry}/contact_info.handlebars`)) {
      return `countries/${currentCountry}/contact_info`;
    }
    return 'countries/default/contact_info';
  } catch (err) {
    return 'countries/default/contact_info';
  }
};
