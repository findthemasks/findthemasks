/*
#findthemasks provides this file for partners to configure "callback" links to their sites.

The dewv.net entry below means that all requests to FTM's embed with HTTP referer from dewv.net
will receive responses with embedded links to dewv.net/ftm?id=X where X is a unique numeric
identifier for the PPE requester. Full information on that requester can be accessed in
findthemasks.com/data.json, matching X to the row id.

Partners should also edit /scss/partner-link-icons.data.svg.scss to style their links.
*/

module.exports = {
  'dewv.net': {
    linkUrl: 'https://dewv.net/ftm',
    tooltip: 'Donate to this requester',
  },
};
