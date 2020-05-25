/*
#findthemasks provides this file for partners to configure "callback" links to their sites.

The example entry below means that all requests to FTM's embed with HTTP referer from example.com
will receive responses with embedded links to example.com/target/path/for/links?id=X where X is a
unique numeric identifier for the PPE requester. Full information on that requester can be accessed
in findthemasks.com/data.json, matching X to the row id.

See /scss/partner-link-icons.data.svg.scss to style the links.
*/

module.exports = {
  'example.com': '/target/path/for/links',
  'dewv.net': '/ftm',
};
