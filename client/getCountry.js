import { FtmUrl } from './utils.js';
import countries from './countries.js';

export function getFirstPathPart() {
  const url = new FtmUrl(window.location);
  const directories = url.pathname.split('/');
  if (directories.length > 2) {
    return directories[1];
  }

  return '';
}

export function isCountryPath() {
  if (getFirstPathPart() === 'makers') {
    return false;
  }
  return true;
}

// TODO(ajwong): This is copied into donation-form-bounce.handlebars. Careful.
export function getCountry() {
  const firstPathPart = getFirstPathPart();
  if (countries[firstPathPart.toLowerCase()]) {
    return firstPathPart;
  }

  return 'us';
}
