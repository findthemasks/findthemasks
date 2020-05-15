require('./polyfills.js');

export const FILTER_ITEMS = {
  n95s: {
    name: 'ftm-accept-item-n95s',
  },
  'surgical masks': {
    name: 'ftm-accept-item-surgical-masks',
  },
  'handmade masks': {
    name: 'ftm-accept-item-handmade-masks',
  },
  'homemade masks': {
    name: 'ftm-accept-item-homemade-masks',
  },
  'homemade masks (specify type in other)': {
    name: 'ftm-accept-item-homemade-masks',
  },
  'face shields': {
    name: 'ftm-accept-item-face-shields',
  },
  'face shields - 3d-printed/makerspace': {
    name: 'ftm-accept-item-face-shields-makerspace',
  },
  'face shields - 3d-printed or makerspace (specify type in other)': {
    name: 'ftm-accept-item-face-shields-makerspace',
  },
  'disposable booties': {
    name: 'ftm-accept-item-disposable-booties',
  },
  'safety goggles': {
    name: 'ftm-accept-item-goggles',
  },
  gloves: {
    name: 'ftm-accept-item-gloves',
  },
  gowns: {
    name: 'ftm-accept-item-gowns',
  },
  'coveralls/bunny suits': {
    name: 'ftm-accept-item-coveralls-bunny-suits',
  },
  'hand sanitizer': {
    name: 'ftm-accept-item-sanitizer',
  },
  'disinfecting wipes': {
    name: 'ftm-accept-item-disinfecting-wipes',
  },
  thermometers: {
    name: 'ftm-accept-item-thermometers',
  },
  caprs: {
    name: 'ftm-accept-item-caprs',
  },
  'walkie-talkies/baby monitors': {
    name: 'ftm-accept-item-walkie-talkies',
  },
  'nasopharyngeal swabs': {
    name: 'ftm-accept-item-nasopharyngeal-swabs',
  },
  'ffp2 masks (n95) or ffp3': {
    name: 'ftm-accept-item-europe-n95s',
  },
  'surgical masks (type ii, iir)': {
    name: 'ftm-accept-item-europe-surgical-masks',
  },
};

export const ORG_TYPES = {
  'addiction facility': {
    name: 'ftm-org-type-addiction-facility',
  },
  'ambulatory surgical center': {
    name: 'ftm-org-type-ambulatory-surgical-center',
  },
  'assisted living': {
    name: 'ftm-org-type-assisted-living',
  },
  'blood bank': {
    name: 'ftm-org-type-blood-bank',
  },
  'community health organization': {
    name: 'ftm-org-type-community-health-organization',
  },
  'covid-19 testing location': {
    name: 'ftm-org-type-covid-19-testing-location',
  },
  dentist: {
    name: 'ftm-org-type-dentist',
  },
  'dentist - emergency practice': {
    name: 'ftm-org-type-dentist-emergency-practice',
  },
  'dialysis center': {
    name: 'ftm-org-type-dialysis-center',
  },
  'doctor\'s office': {
    name: 'ftm-org-type-doctors-office',
  },
  'emergency medical services': {
    name: 'ftm-org-type-ems',
  },
  'eye doctor (opthamology)': {
    name: 'ftm-org-type-eye-doctor-opthamology',
  },
  'fire department': {
    name: 'ftm-org-type-fire-department',
  },
  'food bank': {
    name: 'ftm-org-type-food-bank',
  },
  'healthcare workers union': {
    name: 'ftm-org-type-healthcare-workers-union',
  },
  'home care': {
    name: 'ftm-org-type-home-care',
  },
  'homeless shelter': {
    name: 'ftm-org-type-homeless-shelter',
  },
  hospice: {
    name: 'ftm-org-type-hospice',
  },
  hospital: {
    name: 'ftm-org-type-hospital',
  },
  'hospital foundation': {
    name: 'ftm-org-type-hospital-foundation',
  },
  'jail/detention facility': {
    name: 'ftm-org-type-jail-detention-facility',
  },
  'jail/detention facility (with medical clinic)': {
    name: 'ftm-org-type-jail-detention-facility-with-medical-clinic',
  },
  'law enforcement': {
    name: 'ftm-org-type-law-enforcement',
  },
  'medical transportation': {
    name: 'ftm-org-type-medical-transportation',
  },
  'mental health': {
    name: 'ftm-org-type-mental-health',
  },
  other: {
    name: 'ftm-org-type-other',
  },
  'outpatient clinic': {
    name: 'ftm-org-type-outpatient-clinic',
  },
  pharmacy: {
    name: 'ftm-org-type-pharmacy',
  },
  'public health facility': {
    name: 'ftm-org-type-public-health-facility',
  },
  'rehab facility': {
    name: 'ftm-org-type-rehab-facility',
  },
  'skilled nursing facility': {
    name: 'ftm-org-type-skilled-nursing-facility',
  },
  'testing/diagnostic laboratory': {
    name: 'ftm-org-type-testing-diagnostic-laboratory',
  },
  transportation: {
    name: 'ftm-org-type-transportation',
  },
  'travel nurse': {
    name: 'ftm-org-type-travel-nurse',
  },
  'urgent care': {
    name: 'ftm-org-type-urgent-care',
  },
  'care/nursing home': {
    name: 'ftm-org-type-care-nursing-home',
  },
};

const MAKER_CAPABILITIES = {
  '3d printing': {
    name: 'ftm-makers-3d-printing',
  },
  'laser cutting': {
    name: 'ftm-makers-laser-cutting',
  },
  'die cutting': {
    name: 'ftm-makers-die-cutting',
  },
  'injection molding': {
    name: 'ftm-makers-injection-molding',
  },
  'die casting': {
    name: 'ftm-makers-die-casting',
  },
  'sewing or textiles': {
    name: 'ftm-makers-sewing-textiles',
  },
  'community coordinator across regional efforts': {
    name: 'ftm-makers-regional-community-coordinator',
  },
  'vacuum molding': {
    name: 'ftm-makers-vacuum-molding',
  },
};

const MAKER_PRODUCTS = {
  'cloth masks': {
    name: 'ftm-makers-cloth-masks',
  },
  'cloth gowns': {
    name: 'ftm-makers-cloth-gowns',
  },
  'fabricated n95 mask': {
    name: 'ftm-makers-fabricated-n95-mask',
  },
  'face shield': {
    name: 'ftm-makers-face-shield',
  },
  'fabricated papr mask': {
    name: 'ftm-makers-fabricated-papr-mask',
  },
  'cloth ear saver': {
    name: 'ftm-makers-cloth-ear-saver',
  },
  'plastic-ear-saver': {
    name: 'ftm-makers-plastic-ear-saver',
  },
  'ventilator part': {
    name: 'ftm-makers-ventilator-part',
  },
  'intubation box/shield': {
    name: 'ftm-makers-intubation-box-shield',
  },
  'sterilization equipment': {
    name: 'ftm-makers-sterilization-equipment',
  },
  'door handles': {
    name: 'ftm-makers-door-handles',
  },
  'spacer or diffuser': {
    name: 'ftm-makers-spacer-diffuser',
  },
};

export const ENUM_MAPPINGS = {
  ...FILTER_ITEMS,
  ...ORG_TYPES,
  ...MAKER_CAPABILITIES,
  ...MAKER_PRODUCTS,
  yes: {
    name: 'ftm-open-packages-yes',
  },
  no: {
    name: 'ftm-open-packages-no',
  },
};
