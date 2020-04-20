// this should happen after the translations load
import sendEvent from './sendEvent.js';
import { getCountry } from './getCountry.js';

// This should only be called from i18n.js
export default () => {
  const currentCountry = getCountry();

  $('.add-donation-site-form')
    .attr({ href: `/${currentCountry}/donation-form?locale=${$.i18n().locale}` })
    .click(function (e) {
      sendEvent('addDonationSite', 'click', $(this).attr('href'));
    });

  $('.social-media-icon').click(function (e) {
    const socialType = $(this).data('socialType');
    sendEvent('socialLink', 'click', socialType);
  });

  const prefillText = $.i18n("ftm-tweet-share-button");
  $('.twitter-share-button').attr('href', 'https://twitter.com/intent/tweet?text=' + prefillText);
};
