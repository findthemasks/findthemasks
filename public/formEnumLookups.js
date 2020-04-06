export const FILTER_ITEMS = {
  'n95s': {
    name: $.i18n('ftm-accept-item-n95s'),
    isSet: false
  },
  'surgical masks': {
    name: $.i18n('ftm-accept-item-surgical-masks'),
    isSet: false
  },
  'homemade masks (specify type in other)': {
    name: $.i18n('ftm-accept-item-homemade-masks'),
    isSet: false
  },
  'face shields': {
    name: $.i18n('ftm-accept-item-face-shields'),
    isSet: false
  },
  'faceshields - 3d-printed or makerspace (specify type in other)': {
    name: $.i18n('ftm-accept-item-face-shields-makerspace'),
    isSet: false
  },
  'disposable booties': {
    name: $.i18n('ftm-accept-item-disposable-booties'),
    isSet: false
  },
  'safety goggles': {
    name: $.i18n('ftm-accept-item-goggles'),
    isSet: false
  },
  'gloves': {
    name: $.i18n('ftm-accept-item-gloves'),
    isSet: false
  },
  'gowns': {
    name: $.i18n('ftm-accept-item-gowns'),
    isSet: false
  },
  'coveralls/bunny suits': {
    name: $.i18n('ftm-accept-item-coveralls-bunny-suits'),
    isSet: false
  },
  'hand sanitizer': {
    name: $.i18n('ftm-accept-item-sanitizer'),
    isSet: false
  },
  'disinfecting wipes': {
    name: $.i18n('ftm-accept-item-disinfecting-wipes'),
    isSet: false
  },
  'thermometers': {
    name: $.i18n('ftm-accept-item-thermometers'),
    isSet: false
  },
  'caprs': {
    name: $.i18n('ftm-accept-item-caprs'),
    isSet: false
  },
  'Walkie-talkies/baby monitors': {
    name: $.i18n('ftm-accept-item-walkie-talkies'),
    isSet: false
  },
  'nasopharyngeal swabs': {
    name: $.i18n('ftm-accept-item-nasopharyngeal-swabs'),
    isSet: false
  }
};

export const ENUM_MAPPINGS = Object.assign({}, FILTER_ITEMS, {
  'yes': {
    name: $.i18n('ftm-open-packages-yes')
  },
  'no': {
    name: $.i18n('ftm-open-packages-no')
  }
});
