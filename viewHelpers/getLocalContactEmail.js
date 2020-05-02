const countryEmailAddresses = {
  uk: 'UK@FindTheMasks.com',
  in: 'india@findthemasks.com',
  ca: 'canada@findthemasks.com',
  default: 'contact@findthemasks.com',
};

module.exports = (currentCountry) => {
  if (currentCountry in countryEmailAddresses) {
    return countryEmailAddresses[currentCountry];
  }
  return countryEmailAddresses.default;
};
