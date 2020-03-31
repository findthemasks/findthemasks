export default {
  ca: {
    i18nString: 'ftm-canada',
    countryCode: 'ca',
    administrativeRegionI18nString: 'ftm-administrative-region-province',
    donationSites: {
      i18nString: 'ftm-canada-large-donations',
      administrativeRegionLinks: [
        {
          labelI18nString: 'ftm-canada-province-british-columbia',
          url: 'https://www.safecarebc.ca/operationprotect/'
        },
        {
          labelI18nString: 'ftm-canada-province-ontario',
          url: 'https://www.ontario.ca/page/how-your-organization-can-help-fight-coronavirus'
        }
      ],
      nationalLinks: [
        {
          labelI18nString: 'ftm-canada-manufacturer-call',
          url: 'https://www.canada.ca/en/services/business/maintaingrowimprovebusiness/manufacturers-needed.html'
        },
        {
          labelI18nString: 'ftm-canada-supplier-call',
          url: 'https://buyandsell.gc.ca/calling-all-suppliers-help-canada-combat-covid-19'
        }
      ]
    },
    noDonationSitesNearMeI18nString: 'ftm-canada-no-donation-sites-near-me'
  },
  fr: {
    i18nString: 'ftm-france',
    countryCode: 'fr',
    administrativeRegionI18nString: 'ftm-administrative-region-department',
    donationSites: {
      i18nString: 'ftm-france-large-donations',
      administrativeRegionLinks: null,
      nationalLinks: null
    },
    noDonationSitesNearMeI18nString: 'ftm-france-no-donation-sites-near-me'
  },
  us: {
    i18nString: 'ftm-united-states',
    countryCode: 'us',
    administrativeRegionI18nString: 'ftm-administrative-region-state',
    donationSites: {
      i18nString: 'ftm-united-states-large-donations',
      administrativeRegionLinks: null,
      nationalLinks: null
    },
    noDonationSitesNearMeI18nString: 'ftm-united-states-no-donation-sites-near-me'
  }
}
