import countries from './countries.js';

// TODO(ajwong): This is copied into donation-form-bounce.handlebars. Careful.
export function getCountry() {
  const url = new URL(window.location);
  const directories = url.pathname.split("/");
  if (directories.length > 2) {
    const potentialCountry = directories[1].toLowerCase();

    if (countries[potentialCountry]) {
      return potentialCountry;
    }
  }

  return 'us';
}
