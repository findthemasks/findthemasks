# findthemasks
Website for findthemasks.com

As of March 22 the most useful contribution is still identifying more drop off locations and plugging them into the form, so if you don't see an issue here that calls to you, please work on that!

## Current setup
 - The website reads from a google sheet, generates a json blob, which is used to generate static HTML.

## Embeddable widget of donation sites
- We have produced an embeddable version of our data and filters, without the call to action that's at the top of findthemasks.com. This was designed for getusppe.org on March 22, but can be reused by anyone.
- You can view it here: https://findthemasks.com/give.html
- To embed into your site, use this html snippet:
<iframe style="width: 100%; height: 800px; border: none;" src="https://findthemasks.com/give.html"></iframe>

## Volunteer Slack
 - https://join.slack.com/t/findthemasks/shared_invite/zt-czdjjznp-p8~9oKuXtV_gn7wEBZGGoA

## Diretory structure.
  * `/public` - The client-side code for the website. Currently has some symlinks to legacy file locations.
  * `/functions` - The cloud function used to generate data.json. Not needed for frontend work.
