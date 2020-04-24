const DONATION_FORMS_BY_COUNTRY = {
  at: {
    defaultForm: 'de',
    de: 'https://docs.google.com/forms/d/e/1FAIpQLSeUzUPg9KZAQbMRCYV4ZrOI2hJ3RJ0oqp73XIIBlZjC1shGSA/viewform'
  },
  ca: {
    defaultForm: 'en',
    en: 'https://docs.google.com/forms/d/e/1FAIpQLSf5JAiAikzMEEw86eyjoRMH5AFlwaMrOmjjlr3vGcL5RrJt9A/viewform',
    fr: 'https://docs.google.com/forms/d/e/1FAIpQLSeM2Jt5zudVG9_IxCT0pXluTs4eHq7_p3X95klGCHSSSaDEFg/viewform'
  },
  ch: {
    defaultForm: 'de',
    de: 'https://docs.google.com/forms/d/1adXa1aB0-W0sFCS3m246QdAuoseisTB7zYUrHU3MljQ/viewform',
    en: 'https://docs.google.com/forms/d/1iIS_6kp2gOV7oBhVRVUXbGMNY1vbmPeCw8E3fq3eskQ/viewform',
    fr: 'https://docs.google.com/forms/u/1/d/e/1FAIpQLSccTTMijFuFX_qimh9YMyHjInlsv7NITLfQ-LDj61aKVIV5hw/viewform',
    it: 'https://docs.google.com/forms/d/1E_X9JJcMCJAg69imKsrTTItbnKPcALq3o8vV99st3hs/viewform'
  },
  de: {
    defaultForm: 'de',
    de: 'https://docs.google.com/forms/d/16YAclvnp5C5dUx64UClIkgjvpANSqubcl3gkhdRQ1A0/viewform'
  },
  es: {
    defaultForm: 'es',
    es: 'https://docs.google.com/forms/d/e/1FAIpQLSeSfhRSGcSuxW02Ag8WtcWyrN8sNKmh14qd7UgkYXJrSEAGYg/viewform'
  },
  fr: {
    defaultForm: 'fr',
    en: 'https://docs.google.com/forms/d/1nyejh2JL0YtOkMw87UtMDKXY8oVcJQnfEyusGjNVpmA/viewform',
    fr: 'https://docs.google.com/forms/d/e/1FAIpQLScys-wlfSEwCLNa5dnJIIR7LTdh7e3fpha7SL7A2jvJok8Tog/viewform'
  },
  gb: {
    defaultForm: 'en',
    en: 'https://docs.google.com/forms/d/11u77lVmIAt-B0245uD09UXEFV7XNSJo4op_DhoS5kfY/viewform'
  },
  in: {
    defaultForm: 'en',
    en: 'https://docs.google.com/forms/u/1/d/1ctE1739x2S3STlL-1eNpnhlBWzLvgDNXrdeutzYCKvo/viewform'
  },
  it: {
    defaultForm: 'it',
    it: 'https://docs.google.com/forms/d/19HDfBSo4tOdV_gBWamCyR2MAogc5x24iG43WftiODGQ/viewform'
  },
  pl: {
    defaultForm: 'pl',
    pl: 'https://docs.google.com/forms/d/e/1FAIpQLScrTaeroICRp7XKJZsQcY2zchLBd-vBrG2mnH7BRg6gORyTFg/viewform'
  },
  pt: {
    defaultForm: 'pt',
    pt: 'https://docs.google.com/forms/d/e/1FAIpQLScbBpYJj6WTlHhdMsFjHnBGzD_Ge_quqNv42iJiUhGst1GPrg/viewform'
  },
  us: {
    defaultForm: 'en',
    en: 'https://docs.google.com/forms/d/e/1FAIpQLSfgCpK5coPVFC6rJrE7ZhimiZuDoEaL6fo6gYqxsN_FIpJZhg/viewform'
  }
};

module.exports = (country, locale) => {
  const forms = DONATION_FORMS_BY_COUNTRY[country] || DONATION_FORMS_BY_COUNTRY.us;
  let form;

  if (locale) {
    form = forms[locale];

    if (!form) {
      const language = locale.split('-')[0];
      if (language) {
        form = forms[language];
      }
    }
  }

  return form || forms[forms.defaultForm];
};
