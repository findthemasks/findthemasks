# findthemasks
Website for findthemasks.com

As of March 21 the most useful contribution is still identifying more drop off locations and plugging them into the form, so if you don't see an issue here that calls to you, please work on that!

## Current setup
 - The website reads from a google sheet, generates a json blob, which is used to generate static HTML.

## Volunteer Slack
 - https://join.slack.com/t/findthemasks/shared_invite/zt-czdjjznp-p8~9oKuXtV_gn7wEBZGGoA

## Diretory structure.
  * `/public` - The client-side code for the website. Currently has some symlinks to legacy file locations.
  * `/functions` - The cloud function used to generate data.json. Not needed for frontend work.

## Thanks
 - The "Face With Medical Mask" favicon is used with thanks to
   [favicon.io](https://favicon.io/emoji-favicons/face-with-medical-mask/) which
   provides pre-generated favicon packages using
   [Twemoji](https://twemoji.twitter.com/). Twemoji graphics are licensed
   [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).