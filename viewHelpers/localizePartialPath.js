const fs = require('fs');

module.exports = (partialName, country) => {
  try {
    if (fs.existsSync(`./views/partials/countries/${country}/${partialName}.handlebars`)) {
      return `countries/${country}/${partialName}`;
    }
    return `countries/default/${partialName}`;
  } catch (err) {
    return `countries/default/${partialName}`;
  }
};
