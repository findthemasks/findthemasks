/* global airbrakeJs */

// TODO we should have the environment change so we don't alert on local dev machines
let environment;
const hostname = window.location.hostname; // eslint-disable-line prefer-destructuring
if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'local.findthemasks.com') {
  environment = 'local';
} else {
  environment = 'production';
}

// automatic alerting only on production
if (environment === 'production') {
  const airbrake = new airbrakeJs.Client({
    projectId: 266956,
    projectKey: '2c966fe44a092a4dfe2abeb19c9e112d',
    environment: environment, // eslint-disable-line object-shorthand
  });
  try {
    // This will throw if the document has no head tag
    document.head.insertBefore(document.createElement('style'), null);
  } catch (err) {
    airbrake.notify(err);
    throw err;
  }
}
