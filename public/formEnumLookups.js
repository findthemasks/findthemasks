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

export const ENUM_MAPPINGS = Object.assign({}, FILTER_ITEMS, {
  'yes': {
    name: 'ftm-open-packages-yes'
  },
  'no': {
    name: 'ftm-open-packages-no'
  }
});
