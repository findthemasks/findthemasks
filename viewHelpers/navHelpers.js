module.exports = {
  createCountryDropdownHref: (countryCode, settings) => {
    const url = new URL(settings.data.root.currentUrl);
    const path = url.pathname.replace(/(\/[a-z]{2}\/|\/)/, `/${countryCode}/`);
    return `${path}${url.search}`;
  },
  createLocaleDropdownHref: (localeCode, settings) => {
    const url = new URL(settings.data.root.currentUrl);
    url.searchParams.set('locale', localeCode);

    return url.href;
  },
  createNavbarItemHref: (page, settings) => {
    const currentCountry = settings.data.root.countryCode;
    const currentDataset = settings.data.root.dataset;

    const url = new URL(settings.data.root.currentUrl);

    // construct URL from country and dataset, leaving it out if either is "default"
    // in the case of currentCountry, that means US
    // in the case of dataset, we only include it if dataset === 'makers'
    // TODO: if we add a third dataset, that will need to change.
    let newUrl = '';
    if (currentCountry !== 'us') {
      newUrl += `/${currentCountry}`;
    }
    if (currentDataset === 'makers') {
      newUrl += `/${currentDataset}`;
    }
    newUrl += `/${page}${url.search}`;

    return newUrl;
  },
  createCrossLink: (baseUrl, countryCode, localeCode) => (`${baseUrl}/${countryCode}?locale=${localeCode}`),
};
