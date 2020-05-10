import { ac, ce, ctn, FtmUrl } from './utils.js';

function htmlToElements(html) {
  return document.createRange().createContextualFragment(html).children;
}

export function getOneLineAddress(address) {
  return address.trim().replace(/\n/g, ', ');
}

export function googleMapsUri(address) {
  return encodeURI(`https://www.google.com/maps/search/?api=1&query=${address}`);
}

export function createMapLink(address) {
  // setup google maps link
  const oneLineAddress = getOneLineAddress(address);
  const html =
`<a class="map-link" href="${googleMapsUri(oneLineAddress)}" target="_blank"
  click="sendEvent('map', 'clickAddress', ${oneLineAddress});">
  ${oneLineAddress}
</a>`;
  return htmlToElements(html)[0];
}
