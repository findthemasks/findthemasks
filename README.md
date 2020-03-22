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
