const fs = require('fs');

module.exports = (partialName, country) => {
  const isEuropean = ['at', 'ch', 'de', 'es', 'fr', 'uk', 'it', 'pl', 'pt'].includes(country);

  try {
    if (fs.existsSync(`./views/partials/countries/${country}/${partialName}.handlebars`)) {
      return `countries/${country}/${partialName}`;
    }
    if (isEuropean && fs.existsSync(`./views/partials/countries/europe/${partialName}.handlebars`)) {
      return `countries/europe/${partialName}`;
    }
    return `countries/default/${partialName}`;
  } catch (err) {
    return `countries/default/${partialName}`;
  }
};
