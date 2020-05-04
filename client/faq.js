import sendEvent from './sendEvent.js';

$(() => {
  // initializes collapse toggling on FAQ page
  // it's a bit markup dependent, but this approach seemed
  // better than assigning a data-target and id to every question/answer
  // pair
  $('.faq-question dt').on('click', (event) => {
    const $header = $(event.currentTarget);
    if ($header.hasClass('open')) {
      $header.removeClass('open');
    } else {
      $header.addClass('open');
    }
    $header.next('dd').collapse('toggle');
    sendEvent('faq','click', event.currentTarget.id);
  });

  const faqQuestionHash = document.location.hash;
  if (faqQuestionHash) {
    const $faqQuestion = $(`#${faqQuestionHash.substring(1)}`);
    $faqQuestion.click();
  }
});
