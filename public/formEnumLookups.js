export const FILTER_ITEMS = {
  'n95s': {
    name: 'ftm-accept-item-n95s',
    isSet: false
  },
  'surgical masks': {
    name: 'ftm-accept-item-surgical-masks',
    isSet: false
  },
  'homemade masks (specify type in other)': {
    name: 'ftm-accept-item-homemade-masks',
    isSet: false
  },
  'face shields': {
    name: 'ftm-accept-item-face-shields',
    isSet: false
  },
  'faceshields - 3d-printed or makerspace (specify type in other)': {
    name: 'ftm-accept-item-face-shields-makerspace',
    isSet: false
  },
  'disposable booties': {
    name: 'ftm-accept-item-disposable-booties',
    isSet: false
  },
  'safety goggles': {
    name: 'ftm-accept-item-goggles',
    isSet: false
  },
  'gloves': {
    name: 'ftm-accept-item-gloves',
    isSet: false
  },
  'gowns': {
    name: 'ftm-accept-item-gowns',
    isSet: false
  },
  'coveralls/bunny suits': {
    name: 'ftm-accept-item-coveralls-bunny-suits',
    isSet: false
  },
  'hand sanitizer': {
    name: 'ftm-accept-item-sanitizer',
    isSet: false
  },
  'disinfecting wipes': {
    name: 'ftm-accept-item-disinfecting-wipes',
    isSet: false
  },
  'thermometers': {
    name: 'ftm-accept-item-thermometers',
    isSet: false
  },
  'caprs': {
    name: 'ftm-accept-item-caprs',
    isSet: false
  },
  'Walkie-talkies/baby monitors': {
    name: 'ftm-accept-item-walkie-talkies',
    isSet: false
  },
  'nasopharyngeal swabs': {
    name: 'ftm-accept-item-nasopharyngeal-swabs',
    isSet: false
  },
  // TODO(nburt): Europe uses certain country specific naming for accepted items, blacklist CA / US
  //  until US uses merge config
  'ffp2 masks (n95) or ffp3': {
    name: 'ftm-accept-item-europe-n95s',
    isSet: false,
    countryBlacklist: ['ca', 'us']
  },
  'surgical masks (type ii, iir)': {
    name: 'ftm-accept-item-europe-surgical-masks',
    isSet: false,
    countryBlacklist: ['ca', 'us']
  }
};

const ORG_TYPES = {
  'addiction facility': {
    name: 'ftm-org-type-addiction-facility'
  },
  'ambulatory surgical center': {
    name: 'ftm-org-type-ambulatory-surgical-center'
  },
  'assisted living': {
    name: 'ftm-org-type-assisted-living'
  },
  'blood bank': {
    name: 'ftm-org-type-blood-bank'
  },
  'community health organization': {
    name: 'ftm-org-type-community-health-organization'
  },
  'covid-19 testing location': {
    name: 'ftm-org-type-covid-19-testing-location'
  },
  'dentist': {
    name: 'ftm-org-type-dentist'
  },
  'dentist - emergency practice': {
    name: 'ftm-org-type-dentist-emergency-practice'
  },
  'dialysis center': {
    name: 'ftm-org-type-dialysis-center'
  },
  'doctor\'s office': {
    name: 'ftm-org-type-doctors-office'
  },
  'emergency medical services': {
    name: 'ftm-org-type-ems'
  },
  'eye doctor (opthamology)': {
    name: 'ftm-org-type-eye-doctor-opthamology'
  },
  'fire department': {
    name: 'ftm-org-type-fire-department'
  },
  'food bank': {
    name: 'ftm-org-type-food-bank'
  },
  'healthcare workers union': {
    name: 'ftm-org-type-healthcare-workers-union'
  },
  'home care': {
    name: 'ftm-org-type-home-care'
  },
  'homeless shelter': {
    name: 'ftm-org-type-homeless-shelter'
  },
  'hospice': {
    name: 'ftm-org-type-hospice'
  },
  'hospital': {
    name: 'ftm-org-type-hospital'
  },
  'hospital foundation': {
    name: 'ftm-org-type-hospital-foundation'
  },
  'jail/detention facility': {
    name: 'ftm-org-type-jail-detention-facility'
  },
  'jail/detention facility (with medical clinic)': {
    name: 'ftm-org-type-jail-detention-facility-with-medical-clinic'
  },
  'law enforcement': {
    name: 'ftm-org-type-law-enforcement'
  },
  'medical transportation': {
    name: 'ftm-org-type-medical-transportation'
  },
  'mental health': {
    name: 'ftm-org-type-mental-health'
  },
  'other': {
    name: 'ftm-org-type-other',
  },
  'outpatient clinic': {
    name: 'ftm-org-type-outpatient-clinic'
  },
  'pharmacy': {
    name: 'ftm-org-type-pharmacy'
  },
  'public health facility': {
    name: 'ftm-org-type-public-health-facility'
  },
  'rehab facility': {
    name: 'ftm-org-type-rehab-facility'
  },
  'skilled nursing facility': {
    name: 'ftm-org-type-skilled-nursing-facility'
  },
  'testing/diagnostic laboratory': {
    name: 'ftm-org-type-testing-diagnostic-laboratory'
  },
  'transportation': {
    name: 'ftm-org-type-transportation'
  },
  'travel nurse': {
    name: 'ftm-org-type-travel-nurse'
  },
  'urgent care': {
    name: 'ftm-org-type-urgent-care'
  }
}

export const ENUM_MAPPINGS = Object.assign({}, FILTER_ITEMS, ORG_TYPES, {
  'yes': {
    name: 'ftm-open-packages-yes'
  },
  'no': {
    name: 'ftm-open-packages-no'
  }
});
