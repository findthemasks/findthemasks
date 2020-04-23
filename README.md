# findthemasks.com 

This repo hosts the code for findthemasks.com which also provides an embeddable map to other projects

- Stats: <https://findthemasks.com/stats.html>

## New volunteer?

Join the slack! <https://join.slack.com/t/findthemasks/shared_invite/zt-dtgs1qck-imUSOaWBZmBMFgnwy5uVqw>

- new dev? please look at issues and comment on something to grab it!
    - Check out the [Getting Started](getting_started.md) doc
- new data moderator? Join the slack and come to #data!
- not either? The most useful contribution is identifying more drop off locations and plugging them into the form linked on the public website, so if you don't see an issue here that calls to you, please work on that! Advice on making calls is in [#131](https://github.com/findthemasks/findthemasks/issues/131#issuecomment-602746963)

## Current setup

- The website reads from a google sheet, generates a json blob, which is rendered by a Node server.

## Reading our data to build your own frontend

- Our data file updates every five minutes and can be read from https://findthemasks.com/data.json [US]
- Alternatively, the same info is at: https://findthemasks.com/data-us.csv
- If reading in data and producing web output sounds like a lot to do, please read on:

## Embeddable widget of donation sites

- We have produced an embeddable version of our map, data and filters
- You can view it here: <https://findthemasks.com/give.html>
- To embed into your site, use this html snippet:

```html
<iframe style="width: 100%; height: 800px; border: none;" src="https://findthemasks.com/give.html"></iframe>
```

- We also support state specific data views, hiding the map, hiding the filters through query params, initializing on specific locations, and specifying locale:

```html
?state={CA/WA/NY/etc}
?hide-map={true/false}
?hide-filters={true/false}
?hide-list={true/false} (also hides filters)
?hide-search={true/false} (beta)
?locale={see available locales in dropdown at https://findthemasks.com}
?q={map search term: '100 Fake Road, Kansas, MO'}
?coords={lat,lng}&zoom=12 // zoom only works in concert with coords
```

All boolean parameters default to false (unless they're in beta).

So, for state-specific pages you can now use something like:
<https://findthemasks.com/give.html?state=CA&hide-map=true&hide-filters=true>
This will return just the filtered list of donations sites in California.

**Beta features:**

Since beta features are disabled by default, you can enable them via:

```
?show-search=true
```

## Current Countries
* United States - us
* France - fr
* Canada - ca

## Current Locales
* English - en
* French - fr

## Adding Countries and Locales

We use a directory structure to view country-specific datasets.

For example, `/us/give.html` will filter the map to the United States and `/fr/give.html` will filter to France.

To view translated version of a country you can pass in a locale parameter. `/us/give.html?locale=fr-FR`
will show the map of the United States in French and `/fr/give.html?locale=en-US` will show the map of France in English.

To add a new country, you need to set a few variables.
1. Get the country code from https://www.iban.com/country-codes.
2. Add the country code and a link to the donation form to `donation-form-bounce.html`. The form should
include translations for all official languages in that country.
3. Add the translated strings for all official languages in that country in `i18n.js`. As a starting point,
it is OK to launch a new language using an international variant. e.g. you can launch Canada
with `en` translations and `fr` translations, they do not need to be localized to `en-CA` and `fr-CA`.
4. Update the list of languages and countries in `countries.js` and `locales.js` and ensure that
they propagate correctly to the language and country dropdowns. In `countries.js` you should also add
the name of the string for that country's administrative region. e.g. US = "State", CA "Province",
FR = "Department", copy for who they should direct large donations to, and copy for who they should
contact if there are no donation sites near them.

## Data inflow, storage & moderation

### Intake

Currently information about PPE needs is contributed by members of the public through a Google Form.  We have at
least one form per country; for CA and CH we have one per language.  See the
[International Forms and Data](https://github.com/findthemasks/findthemasks/wiki/International-Forms-and-Data)
section of the Wiki for details.

### Storage

Currently the data about PPE needs is stored in Google Sheets spreadsheets (one per country). Data from the forms
(described above) automatically feeds into these sheets.  See
[International Forms and Data](https://github.com/findthemasks/findthemasks/wiki/International-Forms-and-Data)
section of the Wiki for details.

### Moderation

Moderation is done by volunteers in accordance with the guidance laid out in the findthemasks
[wiki](https://github.com/findthemasks/findthemasks/wiki/Data-Quality-Procedure).


## Directory structure

- `/public` - The client-side code for the website. Currently has some symlinks to legacy file locations.
- `/functions` - The cloud function used to generate data.json. Not needed for frontend work.

## Firebase

### Basic architecture
Firebase is used to pull data from our moderated datastore and then generate a data.json. There is
a production environment [findthemasks](https://console.firebase.google.com/project/findthemasks/overview)
and a dev environment [findthemasks-dev](https://console.firebase.google.com/project/findthemasks-dev/overview).

The setup uses cloud functions to provide http endpoints, cloud-storage to keep the generated results,
and the firebase realtime database (NOT firestore) to cache oauth tokens.

Adding an oauth token requires hitting the `/authgoogleapi?sheetid=longstring` on the
cloud-function endpoint and granting an OAuth token for a user that has access to the sheet.

### How to deploy
- Install the [firebase cli](https://firebase.google.com/docs/cli?hl=vi) for your platform.
- Do once
  - `firebase login`
  - `firebase use --add findthemasks-dev`
  - `firebase use --add findthemasks`
  - `cd functions; npm install`  # Note you need node v8 or higher. Look a [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Switch deployment envrionments `firebase use [findthemasks or findthemasks-dev]`
- Deploy the cloud function. `cd functions; npm run deploy`

### How to set config variables.
Secrets and configs not checked into github are specified via cloud function configs.

To set a config:
```
firebase functions:config:set findthemasks.geocode_key="some_client_id"
```

In code, this can be retrieved via:
```
functions.config().findthemasks.geocode_key
```

In get all configs:
```
firebase functions:config:get
```

The namespace can be anything. Add new configs to the `findthemasks` namespace.

### How to locally develop
Firebase comes with a local emulation environment that lets you live develop
against localhost. Since we are using firebase configs, first we have to snag
the configs from the environment. Do that with:

```
firebase functions:config:get > .runtimeconfig.json
```

Next generate a new Firebase Admin SDK private key here:
  https://console.firebase.google.com/project/findthemasks-dev/settings/serviceaccounts/adminsdk

And save it to `service_key.json`

Then start up the emulator. Note this will talk to the production firebase
database (likely okay as the firebase database is just storing oauth tokens).

```
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service_key.json
firebase emulators:start --only functions
```

This will create localhost versions of everything. Cloud functions should be on
[http://localhost:5001](http://localhost:5001) and `console.log()` messages will
stream to the terminal.

There is also a "shell"

```firebase functions:shell```

that can be used, but running the emulator and hitting with a web browser
is often easier in our simple case.

## Scripts that edit the spreadsheet (Apps Script)
There are currently 2 scripts that automatically update the spreadsheet, and one
that backs it up:

* fillInGeocodes: fills in the lat/lng column based on the address in the "address" column.
  (Note that the "address" column is defined as the column that has "address" in row 2.)
  Uses Google Maps geocoding API.  Currently runs once/minute.
* createStandardAddress: fills in the "address" column based on the data in the "orig_address",
  "city", and "state" columns.  Uses Google Maps geocoding API. Currently runs once/minute.
* backupSheet: makes a timestamped copy of the sheet.  Currently runs once every 2 hours.

There are a few important things to know about these scripts:

* They are visible by navigating to tools > script editor from the Google Sheet.
* They can be run by anyone who has edit permission to the Google Sheet.
* Triggers (automation) can be set up by navigating to Edit > Edit current project's triggers.
* The dev-owner of each sheet should set up a trigger for each of the 3 scripts.  (US spreadsheet
  dev owner is @susanashlock's gmail).
* The scripts are run using quota of the user the user that runs them.
* Each Gmail user has a fixed amount of geocoding quota per day.  This quota is somewhere
  around 250 calls per day.  @susanashlock's account has 'special' quota.  We're not
  sure exactly what it is, but is sufficient to support ~1000 calls per day.


## Thanks

- The "Face With Medical Mask" favicon is used with thanks to
   [favicon.io](https://favicon.io/emoji-favicons/face-with-medical-mask/) which
   provides pre-generated favicon packages using
   [Twemoji](https://twemoji.twitter.com/). Twemoji graphics are licensed
   [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Feather icon collection](https://github.com/feathericons/feather), licensed under [MIT License](https://github.com/feathericons/feather/blob/master/LICENSE).
- [HatScripts circle flags collection](https://github.com/HatScripts/circle-flags), licensed under [MIT License](https://github.com/HatScripts/circle-flags/blob/master/LICENSE).
