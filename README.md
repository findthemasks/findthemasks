# getusppe.org backend v1 / findthemasks.com

This repo hosts the code used to power the v1 backend of "give ppe" features on getusppe.org, as well as the current website of findthemasks.com

- Stats: <https://findthemasks.com/stats.html>

## New volunteer?

Join the slack! <https://join.slack.com/t/findthemasks/shared_invite/zt-czdjjznp-p8~9oKuXtV_gn7wEBZGGoA>

- new dev? please look at issues and comment on something to grab it!
- new data moderator? Join the slack and come to #data!
- not either? The most useful contribution is identifying more drop off locations and plugging them into the form linked on the public website, so if you don't see an issue here that calls to you, please work on that! Advice on making calls is in [#131](https://github.com/r-pop/findthemasks/issues/131#issuecomment-602746963)

## Current setup

- The website reads from a google sheet, generates a json blob, which is used to generate static HTML.

## Reading our data to build your own frontend

- Our data file updates every five minutes and can be read from findthemasks.com/data.json.
- If you read the json directly, you need to ignore entries without an 'x' in the first field. Otherwise, you may publish info hospitals asked to have taken down. Don't do it!
- If this sounds like too much work, then please use our:

## Embeddable widget of donation sites

- We have produced an embeddable version of our map, data and filters, without the call to action that's at the top of findthemasks.com. This was designed for getusppe.org on March 22, but can be reused by anyone.
- You can view it here: <https://findthemasks.com/give.html>
- To embed into your site, use this html snippet:

```html
<iframe style="width: 100%; height: 800px; border: none;" src="https://findthemasks.com/give.html"></iframe>
```

- We also support state specific data views, hiding the map, and hiding the filters through query params:

```html
?state={CA/WA/NY/etc}
?hide-map={true/false}
?hide-filters={true/false}
?hide-list={true/false} (also hides filters)
```

All boolean parameters default to false.

So, for state-specific pages you can now use something like:
<https://findthemasks.com/give.html?state=CA&hide-map=true&hide-filters=true>
This will return just the filtered list of donations sites in California.

## Development

**Directory structure**

- `/public` - The client-side code for the website. Currently has some symlinks to legacy file locations.
- `/functions` - The cloud function used to generate data.json. Not needed for frontend work.

**Local development (with Google Maps)**

- To facilitate local development, the domain [`local.findthemasks.com`](http://local.findthemasks.com/) referencing `localhost` (`127.0.0.1`) has been setup and is compatible with the production Google Maps API key.
- You can override the production Google Maps API key by passing the `mapsKey` query string parameter, e.g. `http://local.findthemasks.com/?mapsKey=YOUR_KEY_HERE `
- You can easily enable the ability to use `navigator.geolocation` locally without SSL. Ensure you start chrome with the following flag: `--unsafely-treat-insecure-origin-as-secure="http://local.findthemasks.com/"`

## Thanks

- The "Face With Medical Mask" favicon is used with thanks to
   [favicon.io](https://favicon.io/emoji-favicons/face-with-medical-mask/) which
   provides pre-generated favicon packages using
   [Twemoji](https://twemoji.twitter.com/). Twemoji graphics are licensed
   [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Feather icon collection](https://github.com/feathericons/feather), licensed under [MIT License](https://github.com/feathericons/feather/blob/master/LICENSE).
