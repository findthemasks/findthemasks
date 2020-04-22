import countries from './countries.js';

export function getFirstPathPart() {
  const url = new URL(window.location);
  const directories = url.pathname.split("/");
  if (directories.length >= 2) {
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
  const first_path_part = getFirstPathPart();
  if (countries[first_path_part.toLowerCase()]) {
    return first_path_part;
  }

  return 'us';
}
