/* global google linkifyElement */

import Selectr from 'mobius1-selectr';
import MarkerClusterer from '@google/markerclustererplus';
import toDataByLocation from './toDataByLocation.js';
import countries from '../constants/countries.js';
import { ENUM_MAPPINGS } from './formEnumLookups.js';
import { getMapsLanguageRegion } from './i18nUtils.js';
import { ac, ce, ctn, FtmUrl } from './utils.js';
import sendEvent from './sendEvent.js';
import { getInstance } from './localStorageUtils.js';

const localStorageInstance = getInstance();

require('mobius1-selectr/src/selectr.css');

require('./i18n.js');
require('./polyfills.js');

// Allow for hot-reloading of CSS in development.
require('../sass/style.scss');

// Master data object, indexed by country code
const countryData = {};
const gCountryCode = document.body.dataset.country;
const gDataset = document.body.dataset.dataset;
// Additional dataset data object, indexed by dataset name
const datasetData = {};

const isEmbed = document.body.dataset.embed;

// Map, markers and map associated UI components are initialized in initMap().
let gAutocomplete;
let gMap = null;

// Markers shown with primary prominence: in current country, in selected state(s), matching filters
let gPrimaryMarkers = [];

// Markers shown with secondary prominence: in current country, outside selected state(s), matching filters
let gSecondaryMarkers = [];

// Markers from outside the current country
const gOtherMarkers = [];

// Primary markers shown in primary cluster
let gPrimaryCluster = null;
// Secondary + other markers shown in secondary cluster
let gSecondaryCluster = null;

let gCurrentViewportCenter = {};

const gDatasetMarkers = {
  requester: {
    standard: '/images/markers/requester_marker.svg',
    hover: '/images/markers/requester_marker_hover.svg',
  },
  makers: {
    standard: '/images/markers/makers_marker.svg',
    hover: '/images/markers/makers_marker_hover.svg',
  },
  'getusppe-affiliates': {
    standard: '/images/markers/getusppe-affiliates.png',
    hover: '/images/markers/getusppe-affiliates.png',
  },
};

const ALL_DATASETS = [
  {
    key: 'requester',
    i18n: 'ftm-dataset-requesters',
    checked: gDataset === 'requester',
  },
  {
    key: 'makers',
    i18n: 'ftm-dataset-makers',
    checked: gDataset === 'makers',
  },
].filter((dataset) => dataset.key !== gDataset);

const SECONDARY_MARKER_OPTIONS = {
  opacity: 0.4,
};

const PRIMARY_MARKER_OPTIONS = {
  opacity: 1,
};

// Configuration defined in query string. Initialized in jQuery DOM ready function.
let gShowMapSearch = true; // BETA FEATURE: Default to false.

// Keep track of the previous info windows user has clicked so we can close them.
let gOpenInfoWindows = [];

// The big list of displayed locations, as dom elements, and where we are in rendering them
let gLocationsListEntries = [];
let gLastLocationRendered = -1;

const searchParams = new FtmUrl(window.location.href).searchparams;

// tracks number of entries in dataset
// gets set when we retrieve the dataset
let totalEntries;

// Converts a string from 'a,b,c' to 'a, b, c'
function addSpaceAfterComma(str) {
  if (str) {
    return str.split(',').join(', ');
  }

  return undefined;
}

// i18n must be loaded before filter items can be translated
// config stores the i18n string and this function calls i18n with it
function translatedFilterItems(filterItems) {
  const translated = {};

  for (const [filterItemKey, filterItem] of Object.entries(filterItems)) {
    translated[filterItemKey] = {
      name: $.i18n(filterItem.name),
      isSet: false,
    };
  }

  return translated;
}

// get list of possible values for `Accepted Items`
// iterates through data to extract all unique "accepting" items
// matches against whitelist FILTER_ITEMS (from formEnumLookups.js)
// and returns the i18n keys from FILTER_ITEMS for accepting items that match
//
// NOTE: the incoming data structure is very brittle; if that changes at all, this will break
function parseFiltersFromData(data, datasetFilters) {
  const filters = {};

  Object.keys(datasetFilters).forEach((datasetFilterKey) => {
    filters[datasetFilterKey] = {};
  });

  Object.keys(data).forEach((state) => {
    Object.keys(data[state].cities).forEach((city) => {
      data[state].cities[city].entries.forEach((entry) => {
        Object.keys(datasetFilters).forEach((datasetFilterKey) => {
          const { dataKey } = datasetFilters[datasetFilterKey];

          if (entry[dataKey]) {
            entry[dataKey].split(/,( |)(?![^(]*\))/).map((a) => a.trim()).forEach((i) => {
              const filterKey = i.toLowerCase();
              if (ENUM_MAPPINGS[filterKey] !== undefined && filters[datasetFilterKey][filterKey] === undefined) {
                filters[datasetFilterKey][filterKey] = {
                  ...ENUM_MAPPINGS[filterKey],
                  value: filterKey,
                };
              }
            });
          }
        });
      });
    });
  });

  return filters;
}

// Need a dataKey and filterKey for each item
// dataKey = key to lookup on entry
// searchParamKey = search param used for filter
const filtersByDataset = {
  makers: {
    capabilities: {
      dataKey: 'capabilities',
      searchParamKey: 'capabilities',
      placeholder: 'ftm-makers-capabilities',
    },
    products: {
      dataKey: 'products',
      searchParamKey: 'products',
      placeholder: 'ftm-makers-products',
    },
  },
  requester: {
    orgTypes: {
      dataKey: 'org_type',
      searchParamKey: 'orgType',
      placeholder: 'ftm-facility-type',
    },
    acceptItems: {
      dataKey: 'accepting',
      searchParamKey: 'accepting',
      placeholder: 'ftm-ppe-needed',
    },
  },
  'getusppe-affiliates': {},
};

// Builds the data structure for tracking which filters are set
// If all values in a category are false, it's treated as no filter - all items are included
// If one or more values in a category is true, the filter is set - only items matching the filter
//    are included
// If two or more values in a category are true, the filter is the union of those values
// If multiple categories have set values, the result is the intersection of those categories
// The filters which are selectable on the webpage will also be translated here
function createFilters(data) {
  const datasetFilters = filtersByDataset[gDataset];

  const filters = {
    states: {},
    entryAge: {
      '1-7': {
        name: $.i18n('ftm-entry-age-1-7'),
        isSet: false,
        value: '1-7',
      },
      '8-14': {
        name: $.i18n('ftm-entry-age-8-14'),
        isSet: false,
        value: '8-14',
      },
      '15-21': {
        name: $.i18n('ftm-entry-age-15-21'),
        isSet: false,
        value: '15-21',
      },
      '21+': {
        name: $.i18n('ftm-entry-age-21-plus'),
        isSet: false,
        value: '21',
      },
      placeholder: $.i18n('ftm-entry-age-placeholder'),
    },
  };

  for (const state of Object.keys(data)) {
    filters.states[state] = { name: state, isSet: false };
  }

  try {
    const dataFilters = parseFiltersFromData(data, datasetFilters);
    Object.keys(datasetFilters).forEach((datasetFilterKey) => {
      filters[datasetFilterKey] = translatedFilterItems(dataFilters[datasetFilterKey]);
    });
  } catch (e) {
    console.error(e);
  }

  return filters;
}

// Returns true if there are any filter values found in the data.
function areThereFilters(filters) {
  const datasetFilters = filtersByDataset[gDataset];

  return Object.keys(datasetFilters).some((datasetFilterKey) => (
    datasetFilterKey in filters && Object.keys(filters[datasetFilterKey]).length > 0
  ));
}

// Creates an 'applied' property in filters with the subset of the 'states' and 'acceptItems'
// filters that are actually set. getFilteredContent/showMarkers can scan this 'applied' object
// instead of walking the full set.
function updateFilters(filters) {
  filters.applied = {};
  const { applied } = filters;

  for (const state of Object.keys(filters.states)) {
    if (filters.states[state].isSet) {
      applied.states = applied.states || {};
      applied.states[state] = true;
    }
  }
  for (const date of Object.keys(filters.entryAge)) {
    if (filters.entryAge[date].isSet) {
      applied.entryAge = applied.entryAge || {};
      applied.entryAge[date] = true;
    }
  }

  const datasetFilters = filtersByDataset[gDataset];

  Object.keys(datasetFilters).forEach((datasetFilterKey) => {
    for (const item of Object.keys(filters[datasetFilterKey])) {
      if (filters[datasetFilterKey][item].isSet) {
        applied[datasetFilterKey] = applied[datasetFilterKey] || {};
        applied[datasetFilterKey][item] = true;
      }
      filters[datasetFilterKey].placeholder = datasetFilters[datasetFilterKey].placeholder;
    }
  });
}

function translateEnumValue(value) {
  if (value) {
    const enumValue = ENUM_MAPPINGS[value.toLowerCase()];

    if (enumValue) {
      return $.i18n(enumValue.name);
    }
  }

  return value;
}

function translateEnumList(enumListString) {
  if (enumListString) {
    // split on commas, unless the comma is in a parenthesis
    return enumListString.split(/, (?![^(]*\))/).map((stringValue) => (
      translateEnumValue(stringValue && stringValue.trim())
    )).join(', ');
  }

  return enumListString;
}

function getOneLineAddress(address) {
  return address.trim().replace(/\n/g, ', ');
}

function googleMapsUri(address) {
  return encodeURI(`https://www.google.com/maps/search/?api=1&query=${address}`);
}

function createMapLink(address) {
  // setup google maps link
  const mapLinkEl = ce('a', 'map-link');
  const oneLineAddress = getOneLineAddress(address);
  mapLinkEl.href = googleMapsUri(oneLineAddress);
  mapLinkEl.target = '_blank';
  mapLinkEl.addEventListener('click', () => {
    sendEvent('map', 'clickAddress', oneLineAddress);
  });
  mapLinkEl.appendChild(ctn(oneLineAddress));
  return mapLinkEl;
}

// Turns a string with embedded \n characters into an Array of text nodes separated by <br>
function multilineStringToNodes(input) {
  const textNodes = input.split('\n').map((s) => ctn(s));
  const returnedNodes = [];
  textNodes.forEach((e) => {
    returnedNodes.push(e);
    returnedNodes.push(document.createElement('br'));
  });
  return returnedNodes.slice(0, -1);
}

function createMakerMarkerContent(entry, separator) {
  // Text to go into InfoWindow
  const contentTags = [];
  const title = ce('h5', separator ? 'separator' : null, ctn(entry.name));

  // only show the link copier if the main dataset is makers
  if (entry.row_id && gDataset === 'makers') {
    const headerCopyEntryLink = createLinkToListItemIcon(entry.row_id, true);
    ac(title, headerCopyEntryLink);
  }

  contentTags.push(title);

  // TODO: Dedupe with addParagraph() in createMakerListItemEl().
  const addParagraph = (name, value) => {
    if (value) {
      const row = ce('div', 'row');

      ac(row, [
        ce('label', 'col-12 col-md-3', ctn(name)),
        linkifyElement(ce('p', 'col-12 col-md-9', multilineStringToNodes(value))),
      ]);

      contentTags.push(row);
    }
  };

  const addLine = (name, value) => {
    if (value) {
      const div = ce('div', 'row');
      ac(div, [
        ce('label', 'col-12 col-md-3', ctn(name)),
        linkifyElement(ce('p', 'col-12 col-md-9', ctn(value))),
      ]);
      contentTags.push(div);
    }
  };

  addParagraph($.i18n('ftm-makers-website'), entry.website);
  addParagraph($.i18n('ftm-makers-description'), entry.description);
  addParagraph($.i18n('ftm-makers-contact'), entry.public_contact);
  addLine($.i18n('ftm-makers-group-type'), addSpaceAfterComma(entry.group_type));
  addLine($.i18n('ftm-makers-capabilities'), addSpaceAfterComma(entry.capabilities));
  addLine($.i18n('ftm-makers-products'), addSpaceAfterComma(entry.products));
  addLine($.i18n('ftm-makers-other-product'), addSpaceAfterComma(entry.other_product));
  addLine($.i18n('ftm-makers-face-shield-type'), addSpaceAfterComma(entry.face_shield_type));
  addLine($.i18n('ftm-makers-min-request'), addSpaceAfterComma(entry.min_request));
  addLine($.i18n('ftm-makers-collecting-question'), entry.collecting_site);
  addLine($.i18n('ftm-makers-shipping-question'), entry.shipping);
  addLine($.i18n('ftm-makers-volunteers-question'), entry.accepting_volunteers);
  addLine($.i18n('ftm-makers-other-type-of-space'), entry.other_type_of_space);
  addLine($.i18n('ftm-makers-accepting-ppe-requests'), entry.accepting_ppe_requests);
  addLine($.i18n('ftm-makers-org-collaboration'), addSpaceAfterComma(entry.org_collaboration));
  addLine($.i18n('ftm-makers-other-capability'), addSpaceAfterComma(entry.other_capability));

  return contentTags;
}

const initResidentialPopover = () => {
  $('[data-toggle="popover"]').popover();
};

const initCopyLinkTooltip = () => {
  $('.entry-copy-link').tooltip()
    .on('click', (e) => {
      copyLinkToClipboard(e.target.dataset.rowId, () => {
        $(e.target).attr('title', $.i18n('ftm-default-link-copied-tooltip'))
          .tooltip('_fixTitle')
          .tooltip('show');
      });
    });
};

function createRequesterMarkerContent(entry, separator) {
  const {
    org_type: orgType,
    address,
    name,
    encrypted_email: encryptedEmail,
    instructions,
    accepting,
    open_box: openBox,
    rdi,
    timestamp,
    website,
    row_id: rowId,
  } = entry;

  const header = separator ? ce('h5', 'separator', ctn(name)) : ce('h5', null, ctn(name));
  const headerPartnerLink = createPartnerLinkIcon(entry.row_id);

  if (headerPartnerLink) {
    ac(header, headerPartnerLink);
  }


  // US entries don't have country set
  const country = entry.country ? entry.country.toLowerCase() : 'us';
  // only display the link for primary dataset entries
  if (rowId && country === gCountryCode && gDataset === 'requester') {
    const headerCopyEntryLink = createLinkToListItemIcon(rowId, true);
    ac(header, headerCopyEntryLink);
  }

  const contentTags = [header];

  if (orgType && orgType.length) {
    contentTags.push(
      ce('div', 'label', ctn($.i18n('ftm-maps-marker-org-type-label'))),
      ce('div', 'value', ctn(translateEnumValue(orgType)))
    );
  }

  if (address) {
    let addressChildren = [createMapLink(address)];
    if (rdi === 'Residential') {
      addressChildren = addressChildren.concat([
        ctn(' \u25CF '),
        $(`<a tabindex="0" class="popover-dismiss map-link" role="button" data-toggle="popover" data-trigger="focus" title="${$.i18n('ftm-residential-popover-title')}" data-content="${$.i18n('ftm-residential-popover-content')}">${$.i18n('ftm-residential-location')}</a>`)[0],
      ]);
    }

    contentTags.push(
      ce('div', 'label', ctn($.i18n('ftm-maps-marker-address-label'))),
      ce('div', 'value', addressChildren)
    );
  }

  if (encryptedEmail) {
    contentTags.push(
      ce('div', 'label', ctn($.i18n('ftm-info-window-email-contact'))),
      ce('div', 'value', $(`<a href="#" data-toggle="modal" data-target="#contactModal" data-name="${name}" data-email="${encryptedEmail}">${$.i18n('ftm-email-contact-org')}</a>`)[0])
    );
  }

  if (timestamp) {
    const date = new Date(timestamp);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const userLocale = getMapsLanguageRegion();
    const localeString = `${userLocale.language}-${userLocale.region}`;
    contentTags.push(
      ce('div', 'label', ctn($.i18n('ftm-date-updated'))),
      ce('div', 'value', ctn(date.toLocaleDateString(localeString, options)))
    );
  }

  if (website) {
    contentTags.push(
      ce('div', 'label', ctn('Website')),
      linkifyElement(ce('div', 'value', website))
    );
  }

  if (instructions) {
    contentTags.push(
      ce('div', 'label', ctn($.i18n('ftm-maps-marker-instructions-label'))),
      linkifyElement(ce('div', 'value', multilineStringToNodes(instructions)))
    );
  }

  if (accepting) {
    contentTags.push(
      ce('div', 'label', ctn($.i18n('ftm-maps-marker-accepting-label'))),
      ce('div', 'value', ctn(translateEnumList(accepting)))
    );
  }

  if (openBox) {
    contentTags.push(
      ce('div', 'label', ctn($.i18n('ftm-maps-marker-open-packages-label'))),
      ce('div', 'value', ctn(translateEnumValue(openBox)))
    );
  }

  return contentTags;
}

function createMarkerContent(entry, separator) {
  // If entry's dataset = makers
  if (entry.marker.datasetKey === 'makers') {
    return createMakerMarkerContent(entry, separator);
  }

  return createRequesterMarkerContent(
    entry,
    separator
  );
}

function getIcon(url) {
  return {
    url,
    size: new google.maps.Size(41, 41),
    scaledSize: new google.maps.Size(41, 41),
  };
}

// accepts a marker and sets its icon to either the
// highlighted icon, secondary icon, or the default icon depending on `isHighlighted` arg
function setMarkerIcon(marker, isHighlighted) {
  if (marker) {
    marker.setIcon(getIcon(
      isHighlighted ? gDatasetMarkers[marker.datasetKey].hover : gDatasetMarkers[marker.datasetKey].standard
    ));
  }
}

function createMarker(latitude, longitude, entry, markerOptions, otherEntries) {
  const location = { lat: latitude, lng: longitude };
  const options = {
    position: location,
    title: entry.name,
    optimized: false,
    ...markerOptions || {},
  };
  const marker = new google.maps.Marker(options);

  if (entry.row_id) {
    marker.set('row_id', entry.row_id);
  }

  marker.addListener('click', () => {
    sendEvent('map', 'click', 'marker');

    gOpenInfoWindows.forEach((infowindow) => infowindow.close());
    gOpenInfoWindows = [];

    if (!marker.infowindow) {
      const contentTags = [];
      contentTags.push(...createMarkerContent(entry, false));

      if (otherEntries && otherEntries.length > 0) {
        otherEntries.forEach((e) => {
          contentTags.push(...createMarkerContent(e, true));
        });
      }

      const content = ce('div', null, contentTags);

      const info = new google.maps.InfoWindow({
        content,
      });

      google.maps.event.addListener(info, 'domready', () => {
        initResidentialPopover();
        initCopyLinkTooltip();
      });

      marker.infowindow = info;
    }
    marker.infowindow.open(null, marker);
    gOpenInfoWindows.push(marker.infowindow);
  });

  marker.addListener('mouseover', () => {
    setMarkerIcon(marker, true);
    sendEvent('map', 'markerMouseover', entry.name);
    $(entry.domElem).addClass('highlighted');
  });

  marker.addListener('mouseout', () => {
    setMarkerIcon(marker, false);
    $(entry.domElem).removeClass('highlighted');
  });

  // assign marker so that entry click events can reference
  entry.marker = marker;
  return marker;
}

function getMarkers(data, appliedFilters, bounds, markerOptions) {
  const { states, entryAge, ...otherFilters } = appliedFilters;

  const otherFilterKeys = otherFilters && Object.keys(otherFilters).reduce((acc, otherFilterKey) => {
    acc[otherFilterKey] = Object.keys(otherFilters[otherFilterKey]);
    return acc;
  }, {});
  const datasetFilters = filtersByDataset[gDataset];

  const hasStateFilter = Boolean(states);
  const hasEntryFilter = Boolean(entryAge);
  const inFiltersMarkers = [];
  const outOfFiltersMarkers = [];

  for (const stateName of Object.keys(data)) {
    const inStateFilter = states && states[stateName];

    const hasFilters = Object.keys(otherFilterKeys).length > 0 || hasEntryFilter || hasStateFilter;

    const state = data[stateName];
    const { cities } = state;

    for (const cityName of Object.keys(cities)) {
      const city = cities[cityName];

      // Handle multiple entries at the same address. Example: 800 Commissioners Rd E London, ON N6A 5W9
      const entriesByAddress = city.entries.reduce((acc, curr) => {
        const latlong = `${curr.lat} ${curr.lng}`;
        acc[latlong] = acc[latlong] || [];
        acc[latlong].push(curr);
        return acc;
      }, {});

      for (const entry of city.entries) {
        // filter out if not in state and state filter is applied
        // filter out if not in accept and accept filter is not applied
        // filter out if not in org type and org type filter is not applied

        // add marker to primary if filters exist && marker matches
        // else add markers to secondary

        let secondaryFiltersApplied = false;

        const inFilters = {};

        Object.keys(otherFilterKeys).forEach((otherFilterKey) => {
          const otherFilterKeyValues = otherFilterKeys[otherFilterKey];
          const { dataKey } = datasetFilters[otherFilterKey];
          const acc = (entry[dataKey] || '').toLowerCase();

          if (!otherFilterKeyValues.some((s) => acc.includes(s))) {
            inFilters[otherFilterKey] = false;
            secondaryFiltersApplied = true;
          }
        });
        if (hasEntryFilter) {
          if (!Object.keys(entryAge).some((entryFilter) => {
            const rangeArray = entryFilter.split('-');
            const min = parseInt(rangeArray[0], 10);
            if (rangeArray.length === 2 && entry.entry_age >= min && entry.entry_age <= parseInt(rangeArray[1], 10)) {
              return true;
            }
            if (rangeArray.length === 1 && entry.entry_age >= min) {
              return true;
            }
            return false;
          })) {
            inFilters.entryAge = false;
            secondaryFiltersApplied = true;
          }
        }
        const inSecondaryFilter = Object.keys(inFilters).every((inFilterKey) => inFilters[inFilterKey]);
        // state or secondary filter applied
        const filteredEntry = (hasStateFilter && !inStateFilter) || secondaryFiltersApplied;

        let { marker } = entry;

        if (marker) {
          if (!inSecondaryFilter) {
            marker.setMap(null);
            marker = null;
          }
        } else if (inSecondaryFilter) {
          const lat = Number(entry.lat);
          const lng = Number(entry.lng);

          // Guard against non-geocoded entries. Assuming no location exactly on the equator or
          // prime meridian
          if (lat && lng) {
            const otherEntries = entriesByAddress[`${lat} ${lng}`].filter((e) => e.name !== entry.name);
            marker = createMarker(
              lat,
              lng,
              entry,
              markerOptions,
              otherEntries
            );
            entry.marker = marker;
          }
        }

        if (marker) {
          if (hasFilters && !filteredEntry) {
            inFiltersMarkers.push(marker);

            if (hasStateFilter && bounds) {
              bounds.extend(marker.position);
            }
          } else {
            outOfFiltersMarkers.push(marker);
          }
        }
      }
    }
  }

  return {
    inFilters: inFiltersMarkers,
    outOfFilters: outOfFiltersMarkers,
  };
}

// Updates one or both clusters with the latest batch of markers
function updateClusters(primaryCluster, secondaryCluster) {
  if (primaryCluster) {
    primaryCluster.clearMarkers();
    primaryCluster.addMarkers(gPrimaryMarkers);
  }

  if (secondaryCluster) {
    secondaryCluster.clearMarkers();
    secondaryCluster.addMarkers(gOtherMarkers);
    secondaryCluster.addMarkers(gSecondaryMarkers);
  }
}

/**
 * Made by Mathias Bynens <http://mathiasbynens.be/>
 * Modified by Patrick Nelson to set useful param names and sane defaults for US_en locale.
 *
 * Example usage:
 *
 *    numberFormat(1000.15, 1, ',', '.');
 *
 * Result:  "1.000,2"
 */
function numberFormat(number, decimalPlaces, decSeparator, thouSeparator) {
  // Init defaults.
  if (typeof decimalPlaces === 'undefined') {
    decimalPlaces = 0;
  }
  if (typeof decSeparator === 'undefined') {
    decSeparator = '.';
  }
  if (typeof thouSeparator === 'undefined') {
    thouSeparator = ',';
  }

  number = Math.round(number * (10 ** decimalPlaces)) / (10 ** decimalPlaces);
  const e = String(number);
  const f = e.split('.');
  if (!f[0]) {
    f[0] = '0';
  }
  if (!f[1]) {
    f[1] = '';
  }
  if (f[1].length < decimalPlaces) {
    let g = f[1];
    for (let i = f[1].length + 1; i <= decimalPlaces; i++) {
      g += '0';
    }
    f[1] = g;
  }
  if (thouSeparator !== '' && f[0].length > 3) {
    const h = f[0];
    f[0] = '';
    for (let j = 3; j < h.length; j += 3) {
      const i = h.slice(h.length - j, h.length - j + 3);
      f[0] = String(thouSeparator + i + f[0]);
    }
    const j = h.substr(0, (h.length % 3 === 0) ? 3 : (h.length % 3));
    f[0] = j + f[0];
  }
  decSeparator = (decimalPlaces <= 0) ? '' : decSeparator;
  return f[0] + decSeparator + f[1];
}

/**
 * Adjusts stats in header above map to call out number of markers currently being rendered.
 */
function updateStats() {
  // Start with count of location list rows ...
  let countShown = gLocationsListEntries.length;

  if (!gMap) {
    return;
  }

  const mapBounds = gMap.getBounds();
  if (!mapBounds) {
    return;
  }

  // ... but defer to count of markers in map bounds, when applicable.
  const countInBounds = (count, marker) => count + mapBounds.contains(marker.getPosition());
  countShown = gPrimaryMarkers.filter((marker) => marker.datasetKey === gDataset).reduce(countInBounds, 0);
  countShown += gSecondaryMarkers.filter((marker) => marker.datasetKey === gDataset).reduce(countInBounds, 0);

  const prettyMarkerCount = numberFormat(countShown, 0);
  const prettyTotalCount = numberFormat(totalEntries, 0);
  const $stats = $('#list-stats');

  if (gDataset === 'makers') {
    $stats.html($.i18n('ftm-makers-count', prettyMarkerCount, prettyTotalCount));
  } else {
    $stats.html($.i18n('ftm-requesters-count', prettyMarkerCount, prettyTotalCount));
  }
}

// Source for country center points: https://developers.google.com/public-data/docs/canonical/countries_csv - tweak
const MAP_INITIAL_VIEW = {
  at: { zoom: 6, center: { lat: 47.716231, lng: 13.90072 } },
  ca: { zoom: 4, center: { lat: 57.130366, lng: -99.346771 } },
  ch: { zoom: 7, center: { lat: 46.818188, lng: 8.227512 } },
  de: { zoom: 5, center: { lat: 51.165691, lng: 10.451526 } },
  es: { zoom: 5, center: { lat: 40.163667, lng: -3.74922 } },
  fr: { zoom: 5, center: { lat: 46.227638, lng: 2.213749 } },
  in: { zoom: 5, center: { lat: 20.593684, lng: 78.96288 } },
  it: { zoom: 5, center: { lat: 41.87194, lng: 12.56738 } },
  pl: { zoom: 5, center: { lat: 51.919438, lng: 19.145136 } },
  pt: { zoom: 6, center: { lat: 39.399872, lng: -8.224454 } },
  us: { zoom: 3, center: { lat: 46.616431, lng: -107.552917 } }, // Sumatra, MT. Canonical: 37.09024,-95.712891
  uk: { zoom: 5, center: { lat: 55.378051, lng: -3.435973 } },
};

function getMapInitialView() {
  const { coords } = searchParams;
  // default zoom is pretty tight because if you're passing latlng
  // you are probably trying to center on a pretty specific location
  const zoom = parseFloat(searchParams.zoom) || 11;
  if (coords) {
    const latlng = coords.split(',').map((coord) => parseFloat(coord));
    if ( // validate lat lng
      latlng.length === 2
      && latlng[0] >= -85
      && latlng[0] <= 85
      && latlng[1] >= -180
      && latlng[1] <= 180
    ) {
      return {
        zoom,
        center: {
          lat: latlng[0],
          lng: latlng[1],
        },
      };
    }
  }

  if (searchParams.id) {
    const rowIdMatch = (marker) => `${marker.get('row_id')}` === searchParams.id;
    const idMarker = gPrimaryMarkers.find(rowIdMatch)
      || gSecondaryMarkers.find(rowIdMatch)
      || gOtherMarkers.find(rowIdMatch);

    if (idMarker) {
      return {
        zoom: 15,
        center: {
          lat: idMarker.position.lat(),
          lng: idMarker.position.lng(),
        },
      };
    }
    console.warn(`Found no marker for row_id ${searchParams.id}`);
  }

  return MAP_INITIAL_VIEW[gCountryCode];
}

function centerMapToBounds(map, bounds, maxZoom) {
  if (bounds.isEmpty()) {
    const params = getMapInitialView();
    // Default view if no specific bounds
    gMap.setCenter(params.center);
    gMap.setZoom(params.zoom);
  } else {
    google.maps.event.addListenerOnce(map, 'zoom_changed', () => {
      // Prevent zooming in too far if only one or two locations determine the bounds
      if (maxZoom && gMap.getZoom() > maxZoom) {
        // Apparently calling setZoom inside a zoom_changed handler freaks out maps?
        setTimeout(() => gMap.setZoom(maxZoom), 0);
      }
    });
    gMap.fitBounds(bounds);
  }
}

/**
 * Changes the markers currently rendered on the map based strictly on filters or lack thereof. This will reset the
 * 'markers' module variable as well.
 */
function showMarkers(data, filters, recenterMap = true) {
  if (!gMap || !gPrimaryCluster) {
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  const applied = filters.applied || {};
  const hasFilters = Object.keys(applied).length > 0;

  const markers = getMarkers(data, applied, hasFilters && bounds, {
    icon: getIcon(gDatasetMarkers[gDataset].standard),
    datasetKey: gDataset,
  });

  if (hasFilters) {
    gPrimaryMarkers = markers.inFilters;
    gSecondaryMarkers = markers.outOfFilters;
  } else {
    gPrimaryMarkers = markers.outOfFilters;
    gSecondaryMarkers = [];
  }

  if (gPrimaryCluster) {
    gPrimaryCluster.clearMarkers();
  }

  if (gSecondaryCluster) {
    gSecondaryCluster.clearMarkers();
  }

  for (const marker of gPrimaryMarkers) {
    marker.setOptions({
      icon: getIcon(gDatasetMarkers[gDataset].standard),
      ...PRIMARY_MARKER_OPTIONS,
    });
  }

  for (const marker of gSecondaryMarkers) {
    marker.setOptions({
      icon: getIcon(gDatasetMarkers[gDataset].standard),
      ...SECONDARY_MARKER_OPTIONS,
    });
  }

  updateClusters(gPrimaryCluster, gSecondaryCluster);

  updateStats(); // filters have possibly changed

  // HACK. On some browsers, the markercluster freaks out if it gets a bunch of new markers
  // immediately followed by a map view change. Making the view change async works around
  // this bug.
  if (recenterMap) {
    setTimeout(() => {
      centerMapToBounds(gMap, bounds, 9);
    }, 0);
  }
}

// Return filtered data, sorted by location, in a flat list
// (flattened so it's easy to present only a piece of the list at a time)
function getFlatFilteredEntries(data, filters) {
  const entries = [];
  const applied = filters.applied || {};

  const datasetFilters = filtersByDataset[gDataset];
  const { states, entryAge, ...otherFilters } = applied;

  const otherFilterKeys = otherFilters && Object.keys(otherFilters).reduce((acc, otherFilterKey) => {
    acc[otherFilterKey] = Object.keys(otherFilters[otherFilterKey]);
    return acc;
  }, {});

  const onEntry = (entry, cityName, stateName) => {
    let notInFilters = false;
    if (entryAge) {
      if (!Object.keys(entryAge).some((entryFilter) => {
        const rangeArray = entryFilter.split('-');
        const min = parseInt(rangeArray[0], 10);
        if (rangeArray.length === 2 && entry.entry_age >= min && entry.entry_age <= parseInt(rangeArray[1], 10)) {
          return true;
        }
        if (rangeArray.length === 1 && entry.entry_age >= min) {
          return true;
        }
        return false;
      })) {
        notInFilters = true;
      }
    }
    Object.keys(otherFilterKeys).forEach((otherFilterKey) => {
      const otherFilterKeyValues = otherFilterKeys[otherFilterKey];
      const { dataKey } = datasetFilters[otherFilterKey];
      const acc = (entry[dataKey] || '').toLowerCase();

      if (!otherFilterKeyValues.some((s) => acc.includes(s))) {
        notInFilters = true;
      }
    });

    if (notInFilters) {
      return;
    }

    if (entry.marker) {
      const mapBounds = gMap.getBounds();

      if (mapBounds && !mapBounds.contains(entry.marker.getPosition())) {
        return;
      }
    }

    entry.cityName = cityName;
    entry.stateName = stateName;
    entries.push(entry);
  };

  for (const stateName of Object.keys(data).sort()) {
    if (states && !states[stateName]) {
      continue;
    }

    const state = data[stateName];
    const { cities } = state;
    for (const cityName of Object.keys(cities).sort()) {
      const city = cities[cityName];

      const sortedEntries = city.entries.sort((a, b) => a.name.localeCompare(b.name));
      sortedEntries.forEach((entry) => onEntry(entry, cityName, stateName));
    }
  }

  return entries;
}

function createZoomToMarkerIcon() {
  const headerZoomLink = ce('div', 'icon icon-search entry-zoom-link');
  let tooltipText;
  if (gDataset === 'makers') {
    tooltipText = $.i18n('ftm-makers-zoom-tooltip');
  } else if (gDataset === 'requester') {
    tooltipText = $.i18n('ftm-requesters-zoom-tooltip');
  } else {
    tooltipText = $.i18n('ftm-default-zoom-tooltip');
  }
  headerZoomLink.setAttribute('aria-label', tooltipText);
  headerZoomLink.setAttribute('title', tooltipText);
  return headerZoomLink;
}

function createLinkToListItemIcon(rowId, isMapPopup = false) {
  const iconClass = isMapPopup ? 'icon-paperclip-link' : 'icon-file-link';
  const linkToItem = ce('div', `icon ${iconClass} entry-copy-link`);
  const tooltipText = $.i18n('ftm-default-copy-link-tooltip');
  linkToItem.setAttribute('aria-label', tooltipText);
  linkToItem.setAttribute('title', tooltipText);
  linkToItem.dataset.rowId = rowId;
  return linkToItem;
}

function createPartnerLinkIcon(rowId) {
  const { partnerName, partnerLinkUrl, partnerTooltip } = document.body.dataset;
  if (partnerLinkUrl) {
    const partnerLink = ce('div', `icon entry-partner-link icon-${partnerName}`);
    const tooltipText = $.i18n(`ftm-link-partners-tooltip-${partnerName}`) || partnerTooltip;
    partnerLink.setAttribute('aria-label', tooltipText);
    partnerLink.setAttribute('title', tooltipText);
    partnerLink.addEventListener('click', () => {
      window.open(`${partnerLinkUrl}?id=${rowId}`, '_blank');
    });
    return partnerLink;
  }

  return null;
}

function createMakerListItemEl(entry) {
  entry.domElem = ce('div', 'location');
  const header = ce('div', 'd-flex');
  const headerZoomLink = createZoomToMarkerIcon();
  const headerMakerspaceInfo = ce('div', 'flex-grow-1 grey-background');
  const children = [ctn(entry.name), headerZoomLink];

  if (entry.row_id) {
    const headerCopyEntryLink = createLinkToListItemIcon(entry.row_id, false);
    children.push(headerCopyEntryLink);
  }
  ac(headerMakerspaceInfo, ce('h5', null, children));

  ac(header, headerMakerspaceInfo);
  ac(entry.domElem, header);

  // TODO: Dedupe addLine and addParagraph with createMakerMarkerContent()
  const addParagraph = (name, value) => {
    if (value) {
      const row = ce('div', 'row');

      ac(row, [
        ce('label', 'col-12 col-md-3', ctn(name)),
        linkifyElement(ce('p', 'col-12 col-md-9', multilineStringToNodes(value))),
      ]);

      ac(entry.domElem, row);
    }
  };

  const addLine = (name, value) => {
    if (value) {
      const row = ce('div', 'row');

      ac(row, [
        ce('label', 'col-12 col-md-3', ctn(name)),
        linkifyElement(ce('p', 'col-12 col-md-9', ctn(value))),
      ]);

      ac(entry.domElem, row);
    }
  };

  addParagraph($.i18n('ftm-makers-website'), entry.website);
  addParagraph($.i18n('ftm-makers-description'), entry.description);
  addParagraph($.i18n('ftm-makers-contact'), entry.public_contact);
  addLine($.i18n('ftm-makers-group-type'), addSpaceAfterComma(entry.group_type));
  addLine($.i18n('ftm-makers-location'), entry.address);
  addLine($.i18n('ftm-makers-capabilities'), addSpaceAfterComma(entry.capabilities));
  addLine($.i18n('ftm-makers-products'), addSpaceAfterComma(entry.products));
  addLine($.i18n('ftm-makers-other-product'), addSpaceAfterComma(entry.other_product));
  addLine($.i18n('ftm-makers-face-shield-type'), addSpaceAfterComma(entry.face_shield_type));
  addLine($.i18n('ftm-makers-min-request'), addSpaceAfterComma(entry.min_request));
  addLine($.i18n('ftm-makers-collecting-question'), entry.collecting_site);
  addLine($.i18n('ftm-makers-shipping-question'), entry.shipping);
  addLine($.i18n('ftm-makers-volunteers-question'), entry.accepting_volunteers);
  addLine($.i18n('ftm-makers-other-type-of-space'), entry.other_type_of_space);
  addLine($.i18n('ftm-makers-accepting-ppe-requests'), entry.accepting_ppe_requests);
  addLine($.i18n('ftm-makers-org-collaboration'), addSpaceAfterComma(entry.org_collaboration));
  addLine($.i18n('ftm-makers-other-capability'), addSpaceAfterComma(entry.other_capability));
}

function createRequesterListItemEl(entry) {
  entry.domElem = ce('div', 'location');
  const header = ce('div', 'd-flex');
  const headerHospitalInfo = ce('div', 'flex-grow-1');
  const headerOrgType = ce('div', 'flex-grow-1 d-flex justify-content-end text-pink');
  const headerZoomLink = createZoomToMarkerIcon();
  const children = [ctn(entry.name), headerZoomLink];

  if (entry.row_id) {
    const headerCopyEntryLink = createLinkToListItemIcon(entry.row_id, false);
    children.push(headerCopyEntryLink);
  }

  const headerPartnerLink = createPartnerLinkIcon(entry.row_id);
  if (headerPartnerLink) {
    children.push(headerPartnerLink);
  }

  ac(headerHospitalInfo, ce('h5', null, children));

  const { website } = entry;

  if (entry.org_type && entry.org_type.length) {
    ac(headerOrgType, [
      ce('span', 'org-type', ctn(translateEnumValue(entry.org_type))),
    ]);
  }

  const addr = entry.address.trim().split('\n');

  if (addr.length) {
    const para = ce('p', 'marginTopZero medEmph');
    const link = ce('a', 'map-link');
    const $link = $(link);
    const address = getOneLineAddress(entry.address);
    link.href = googleMapsUri(address);
    link.target = '_blank';
    $link.click(() => {
      sendEvent('listView', 'clickAddress', address);
    });
    ac(link, ctn(address));

    let addressChildren = [link];

    if (entry.rdi === 'Residential') {
      addressChildren = addressChildren.concat([
        ctn(' \u25CF '),
        $(`<a tabindex="0" class="popover-dismiss map-link" role="button" data-toggle="popover" data-trigger="focus" title="${$.i18n('ftm-residential-popover-title')}" data-content="${$.i18n('ftm-residential-popover-content')}">${$.i18n('ftm-residential-location')}</a>`)[0],
      ]);
    }

    ac(para, addressChildren);

    ac(headerHospitalInfo, para);
  }
  ac(header, headerHospitalInfo);
  ac(header, headerOrgType);
  ac(entry.domElem, header);

  if (entry.encrypted_email) {
    const emailContainer = ce('div', 'row');

    ac(emailContainer, [
      ce('label', 'col-12 col-md-3', ctn($.i18n('ftm-email-contact'))),
      $(`<p class="col-12 col-md-9"><a href="#" data-toggle="modal" data-target="#contactModal" data-name="${entry.name}" data-email="${entry.encrypted_email}">${$.i18n('ftm-email-contact-org')}</a></p>`)[0],
    ]);

    ac(entry.domElem, emailContainer);
  }

  if (entry.accepting) {
    const ppeNeededContainer = ce('div', 'row');

    ac(ppeNeededContainer, [
      ce('label', 'col-12 col-md-3', ctn($.i18n('ftm-ppe-needed'))),
      ce('p', 'col-12 col-md-9', ctn(translateEnumList(entry.accepting))),
    ]);

    ac(entry.domElem, ppeNeededContainer);
  }

  if (entry.open_box) {
    const openPackagesContainer = ce('div', 'row');

    ac(openPackagesContainer, [
      ce('label', 'col-12 col-md-3', ctn($.i18n('ftm-open-packages'))),
      ce('p', 'col-12 col-md-9', ctn(translateEnumValue(entry.open_box))),
    ]);

    ac(entry.domElem, openPackagesContainer);
  }

  if (entry.timestamp) {
    const timestampContainer = ce('div', 'row');
    const date = new Date(entry.timestamp);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const userLocale = getMapsLanguageRegion();
    const localeString = `${userLocale.language}-${userLocale.region}`;
    ac(timestampContainer, [
      ce('label', 'col-12 col-md-3', ctn($.i18n('ftm-date-updated'))),
      ce('p', 'col-12 col-md-9', ctn(date.toLocaleDateString(localeString, options))),
    ]);
    ac(entry.domElem, timestampContainer);
  }

  if (website) {
    const websiteContainer = ce('div', 'row');
    ac(websiteContainer, [
      ce('label', 'col-12 col-md-3', ctn('Website')),
      linkifyElement(ce('p', 'col-12 col-md-9', ctn(website))),
    ]);
    ac(entry.domElem, websiteContainer);
  }

  if (entry.instructions) {
    const instructionsContainer = ce('div', 'row');

    ac(instructionsContainer, [
      ce('label', 'col-12 col-md-3', ctn($.i18n('ftm-instructions'))),
      linkifyElement(ce('p', 'col-12 col-md-9', multilineStringToNodes(entry.instructions))),
    ]);

    ac(entry.domElem, instructionsContainer);
  }
}

// accepts a marker and zooms the map to that marker using our fitMapToMarkersNearBounds logic
function zoomToMarker(marker) {
  if (marker) {
    // we're getting a rough zoom calculation by using our existing fitMapToMarkersNearBounds
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(marker.position);
    fitMapToMarkersNearBounds(bounds);
    // but ultimately centering on the marker that was clicked
    gMap.setCenter(marker.position);
  } else {
    console.log('no marker to zoom to');
  }
}

// copies the direct URL for a given entry to clipboard
function copyLinkToClipboard(rowId, callback) {
  const url = new FtmUrl(window.location.href);
  url.searchparams.id = rowId;
  const linkToCopy = url.toString();

  if (!navigator.clipboard) {
    const textArea = document.createElement('textarea');
    Object.assign(textArea.style, {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '2em',
      height: '2em',
      padding: 0,
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
      background: 'transparent',
    });

    textArea.value = linkToCopy;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.log('error: could not copy');
    }
    document.body.removeChild(textArea);
    callback();
    return;
  }

  navigator.clipboard.writeText(linkToCopy).then(callback, (err) => { console.log(`could not copy: ${err}`); });
}

function getEntryEl(entry) {
  if (!entry.domElem) {
    // Adds the domElem field if it has not been created.
    if (gDataset === 'makers') {
      createMakerListItemEl(entry);
    } else {
      createRequesterListItemEl(entry);
    }
  }

  $(entry.domElem).find('.entry-zoom-link').tooltip()
    .on('click', (e) => {
      sendEvent('listView', 'clickZoom', entry.name);
      zoomToMarker(entry.marker);
      // a bit weird, but bootstrap tooltips seem to have problems when also associated with click events
      // this was the only solution I could find that didn't leave a tooltip sitting around after click
      $(e.target).tooltip('hide');
    });

  $(entry.domElem).on('mouseenter', () => {
    sendEvent('listView', 'mouseover', entry.name);
    setMarkerIcon(entry.marker, true);
  });
  $(entry.domElem).on('mouseleave', () => {
    setMarkerIcon(entry.marker, false);
  });
  return entry.domElem;
}

function renderNextListPage() {
  if (gLastLocationRendered >= gLocationsListEntries.length - 1) {
    return; // all rendered
  }

  const el = document.getElementsByClassName('locations-list')[0];
  let renderLocation = gLastLocationRendered + 1;
  const children = [];

  gLocationsListEntries.slice(renderLocation, renderLocation + 40).forEach((entry) => {
    children.push(getEntryEl(entry));
    renderLocation += 1;
  });

  ac(el, children);
  gLastLocationRendered = renderLocation - 1;
  initResidentialPopover();
  initCopyLinkTooltip();
}

function initializeEmbedLocationCollapse() {
  const $locationRows = $('.location .row');
  $locationRows.addClass('collapse');
  $locationRows.collapse({ toggle: false });
  if ($('.location').length <= 3) {
    $locationRows.collapse('show');
  } else {
    // ensure they are all hidden, including ones that may have been opened during
    // prior navigation
    $locationRows.collapse('hide');
  }
  $(document).on('click', '.location .d-flex', (e) => {
    // ensure it doesn't happen if they click the google map link
    if (!$(e.target).hasClass('map-link')) {
      $(e.currentTarget).siblings('.row').collapse('toggle');
    }
  });
}

function refreshList(data, filters) {
  gLocationsListEntries = getFlatFilteredEntries(data, filters);
  gLastLocationRendered = -1;
  $('.locations-list').empty();
  updateStats(); // number of locations in list has (probably) changed
  renderNextListPage();
  $('.locations-loading').hide();
  // initializes collapse logic on locations table if this is the embed
  if (isEmbed) {
    initializeEmbedLocationCollapse();
  }
}

// When a filter gets selected/deselected, check if such filter exists
// Then set the isSet property of all filters with the same display name correspondingly and call updating methods
function onFilterChange(data, prefix, idx, selected, filters) {
  const primaryFilter = filters[prefix] && filters[prefix][Object.keys(filters[prefix])[idx]];
  if (!primaryFilter) {
    return;
  }
  // Also apply filters that have the same display name
  const matchingFilterKeys = Object.keys(filters[prefix]).filter((filterKey) => {
    const matchingFilter = filters[prefix][filterKey];

    return matchingFilter && matchingFilter.name === primaryFilter.name;
  });

  matchingFilterKeys.forEach((matchingFilterKey) => {
    const filter = filters[prefix][matchingFilterKey];
    if (selected) {
      filter.isSet = true;
    } else {
      filter.isSet = false;
    }
  });

  // Calls on updateFilters to update the applied property of the filters
  // Calls on refreshList to re-render the displayed list
  // Call on showMarkers to re-render the marker and clusters
  updateFilters(filters);
  refreshList(data, filters);
  showMarkers(data, filters, false);
}

// Creates the <select> elements for filters.
function createFilterElements(data, filters) {
  for (const f of Object.keys(filters)) {
    if (f === 'applied' || f === 'states') {
      continue;
    }

    // All items available in the filter.
    const selectItems = [];

    // Enums selected in the filter.
    const selected = {};


    for (const item of Object.keys(filters[f]).slice(0, -1)) {
      const itemFilter = filters[f][item];
      selected[itemFilter.name] = itemFilter;

      selectItems.push({
        value: itemFilter.value,
        text: itemFilter.name,
        selected: itemFilter.isSet,
      });
    }

    if (selectItems.length > 0) {
      const placeholderLabel = $.i18n(filters[f].placeholder || '');
      const html = `<div class="mb-2"><label class="filter-label" for="filter-${f}">${placeholderLabel}</label><select id="filter-${f}"></select></div>`;
      $('#filter-container').append(html);
      const selectr = new Selectr(document.getElementById('filter-container').lastElementChild.lastElementChild, {
        customClass: 'ftm-select',
        data: selectItems,
        multiple: true,
        searchable: false,
        placeholder: placeholderLabel,
      });

      // Attach reference to each selectr object to the each filter DOM node for the ability to clear filters on map
      // reset
      document.getElementById('filter-container').lastElementChild.selectrReference = selectr;

      // Attach event listeners to the selectr items on selecting and deselecting a filter
      selectr.on('selectr.select', (option) => {
        onFilterChange(data, f, option.idx, true, filters);
        sendEvent('filters', f, option.value);
      });
      selectr.on('selectr.deselect', (option) => {
        onFilterChange(data, f, option.idx, false, filters);
      });
    }
  }
}

// Loads data file from url and assigns into object given by dataToStore
function loadDataFile(url, dataToStore) {
  $.getJSON(
    url,
    (result) => {
      Object.assign(dataToStore, toDataByLocation(result));

      // opacity value matches what's in css for the .secondarycluster class -
      // can set a css class for the clusters, but not for individual pins.
      gOtherMarkers.push(
        ...getMarkers(dataToStore, {}, null, {
          icon: getIcon(gDatasetMarkers[gDataset].standard),
          ...SECONDARY_MARKER_OPTIONS,
          datasetKey: gDataset,
        }).outOfFilters
      );
      updateClusters(null, gSecondaryCluster);
    }
  );
}

function getDatasetFilename(dataset, countryCode) {
  // Always use country-specific data.json file
  if (dataset === 'requester') {
    return `/data-${countryCode}.json`;
  }

  return `/${dataset}-${countryCode}.json`;
}

// Grabs the country codes of other countries and load their json data too
function loadOtherCountries() {
  if (gDataset !== 'requester') {
    return;
  }

  const countryCodes = Object.keys(countries);

  for (const code of countryCodes) {
    if (code !== gCountryCode) {
      countryData[code] = {};
      loadDataFile(getDatasetFilename(gDataset, code), countryData[code]);
    }
  }
}

/**
 * Returns a list of markers sorted by distance from an arbitrary set of lat/lng coords.
 */
function getMarkersByDistanceFrom(latitude, longitude, n = 3) {
  const latlng = new google.maps.LatLng(latitude, longitude);

  const markerDistances = new Map();

  for (const marker of gPrimaryMarkers) {
    let distance = google.maps.geometry.spherical.computeDistanceBetween(marker.position, latlng);

    // HACK: In the unlikely event that the exact same distance is computed, add one meter to the
    // distance to give it a unique distance. This could occur if a marker was added twice to the
    // same location.
    if (markerDistances.has(distance)) {
      distance += 1;
    }

    markerDistances.set(distance, marker);
  }

  // order markerDistances by key (distance)
  const distances = [...markerDistances.keys()].sort((a, b) => a - b);
  // return array of markers in order of distance ascending
  return distances.slice(0, n).map((distance) => markerDistances.get(distance));
}

/**
 * Fits map to bounds, expanding the bounds to include at least three markers as necessary.
 */
function fitMapToMarkersNearBounds(bounds) {
  // get center of bounding box and use it to sort markers by distance
  const center = bounds.getCenter();

  const markersByDistance = getMarkersByDistanceFrom(center.lat(), center.lng(), 3);

  // extend bounds to fit closest three markers
  markersByDistance.forEach((marker) => {
    bounds.extend(marker.position);
  });

  if (!bounds.getNorthEast().equals(bounds.getSouthWest())) {
    // zoom to fit user loc + nearest markers
    gMap.fitBounds(bounds);
  } else {
    // just has user loc - shift view without zooming
    gMap.setCenter(center);
  }
}

function attemptGeocode(searchText) {
  // Attempt a geocode of the direct user input instead.
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: searchText }, (results, status) => {
    // Ensure we got a valid response with an array of at least one result.
    if (status === 'OK' && Array.isArray(results) && results.length > 0) {
      const { viewport } = results[0].geometry;
      fitMapToMarkersNearBounds(viewport);
    } else {
      sendEvent('map', 'geocode-fail', searchText);
    }
  });
}

/**
 * Strictly responsible for resetting the map to it's initial state on page load WITHOUT user's
 * location (since we have a link to link to go back to that appearance).
 */
function resetMap(data, filters) {
  showMarkers(data, filters);
}

/**
 * Centers map at automatically detected coordinates using built in navigator.geolocation API.
 */
function centerMapToMarkersNearUser() {
  // First check to see if the user will accept getting their location, if not, silently return
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      const bounds = new google.maps.LatLngBounds();
      const latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      bounds.extend(latlng);

      fitMapToMarkersNearBounds(bounds);
    }, (err) => {
      console.error(err);
      // Hide the "User my location" link since we know that will not work.
      $('#use-location').hide();
    }, {
      maximumAge: Infinity,
      timeout: 10000,
    });
  }
}

/**
 * Responsible for initializing the search field and links below the search field (e.g. use
 * location, reset map, etc).
 */
function initMapSearch(data, filters) {
  // If disabled, hide the search fields and don't bother attaching any functionality to them.
  if (!gShowMapSearch) {
    $('.map-search-wrap').hide();
    return;
  }

  // Search element (jquery + html element for autocompleter)
  const $search = $('#map-search');
  const searchEl = $search[0];

  // Initialize the map search autocompleter.
  gAutocomplete = new google.maps.places.Autocomplete(
    searchEl,
    { types: ['geocode'] }
  );

  // initialize map search with query param `q` if it's set
  const { q } = searchParams;
  if (q) {
    $search.val(q);
    attemptGeocode(q);
  }

  // Avoid paying for data that you don't need by restricting the set of place fields that are
  // returned to just the address components.
  gAutocomplete.setFields(['geometry']);

  // When the user selects an address from the drop-down, populate the address fields in the form.
  gAutocomplete.addListener('place_changed', () => {
    const place = gAutocomplete.getPlace();
    if (place.geometry) {
      // Get the location object that we can map.setCenter() on
      sendEvent('map', 'autocomplete', $search.val());
      const { viewport } = place.geometry;
      if (viewport) {
        fitMapToMarkersNearBounds(viewport);
      } else {
        sendEvent('map', 'autocomplete-fail', $search.val());
      }
    } else {
      sendEvent('map', 'search', $search.val());
      attemptGeocode($search.val());
    }
  });

  // Setup event listeners for map action links.
  $('#use-location').on('click', (e) => {
    e.preventDefault();
    sendEvent('map', 'center', 'user-location');
    centerMapToMarkersNearUser();
  });

  $('#reset-map').on('click', (e) => {
    e.preventDefault();
    resetMap(data, filters);
    $search.val('');
    for (const element of document.getElementById('filter-container').children) {
      element.selectrReference.clear();
    }
    sendEvent('map', 'reset', 'default-location');
    $('.dataset-toggle').prop('checked', false);
  });
}

// Create the html element for the legend in google Maps and populate it with all datasets other than the one we are
// currently on. Then, attach event listener for when an additional dataset is checked.
const generateGMapDatasetLegend = (onChange) => {
  const legend = ce('div', 'legend-container');
  legend.index = 1;
  const legendHeader = ce('h5', null, ctn($.i18n('ftm-legend-add-datasets')));
  ac(legend, legendHeader);

  ALL_DATASETS.forEach((dataset) => {
    // TODO: also include selected datasets
    const datasetCheckboxContainer = ce('div', null);
    const label = ce('label', null);
    const id = `layer-${dataset.key}`;
    label.for = id;

    const input = ce('input', 'dataset-toggle');
    input.id = id;
    input.type = 'checkbox';
    input.checked = dataset.checked;

    input.addEventListener('change', onChange.bind(this, dataset));

    ac(label, input);
    ac(label, ctn($.i18n(dataset.i18n)));
    ac(datasetCheckboxContainer, label);
    ac(legend, datasetCheckboxContainer);
  });

  return legend;
};

function initContactModal() {
  let lastOrg = null;
  $('#contactModal').on('show.bs.modal', (event) => {
    const el = $(event.relatedTarget);
    const email = el.data('email');
    const name = el.data('name');
    const modal = $('#contactModal');

    if (lastOrg !== name) {
      lastOrg = name;
      $('#sender-name').val(null);
      $('#sender-email').val(null);
      $('#message-subject').val(null);
      $('#message-text').val(null);
    }

    modal.find('.modal-title').text(`${$.i18n('ftm-email-form-title-label')} ${name}`);
    modal.find('#message-recipient').val(email);
  });

  $('#send-message').on('click', () => {
    $('.contact-error').html('&nbsp;');
    $('#send-message').prop('disabled', true);
    sendEvent('contactOrganization', 'emailSendButtonClicked', $('#contactModal').find('.modal-title').val());

    $.post(
      'https://maskmailer.herokuapp.com/send',
      {
        name: $('#sender-name').val(),
        from: $('#sender-email').val(),
        subject: $('#message-subject').val(),
        text: $('#message-text').val(),
        introduction: $.i18n('ftm-email-introduction'),
        to: $('#message-recipient').val(),
        'g-recaptcha-response': window.grecaptcha.getResponse(),
      }
    ).done(() => {
      $('.contact-form').css('display', 'none');
      $('.contact-success').css('display', 'block');
      $('#send-message').prop('disabled', false);
      window.grecaptcha.reset();
      sendEvent('contactOrganization', 'emailSent', $('#contactModal').find('.modal-title').val());

      setTimeout(() => {
        $('#contactModal').modal('hide');
      }, 5000);
    }).fail((result) => {
      $('.contact-error').html($.i18n(`ftm-${result.responseJSON.message}`));
      $('#send-message').prop('disabled', false);
      window.grecaptcha.reset();
    });
  });

  $('#contactModal').on('hidden.bs.modal', () => {
    $('.contact-form').css('display', 'block');
    $('.contact-success').css('display', 'none');
    $('.contact-error').html('&nbsp;');
  });
}

/**
 * Sets up map on initial page load.
 *
 * TODO (patricknelson): Should the initMap() function only be responsible for initializing the
 * map and then have the caller handle position/zoom/bounds etc?
 */
function initMap(data, filters) {
  const element = document.getElementById('map');

  if (!element) {
    return;
  }

  gMap = new google.maps.Map(element, { fullscreenControl: false, mapTypeControl: false });
  gSecondaryCluster = new MarkerClusterer(gMap, [], {
    clusterClass: 'secondarycluster',
    imagePath: '/images/markercluster/m',
    minimumClusterSize: 5,
    zIndex: 1,
  });
  gPrimaryCluster = new MarkerClusterer(
    gMap,
    [],
    {
      imagePath: '/images/markercluster/m',
      minimumClusterSize: 5,
      zIndex: 2,
    }
  );

  gPrimaryCluster.addListener('click', () => {
    sendEvent('map', 'click', 'primaryCluster');
  });

  gSecondaryCluster.addListener('click', () => {
    sendEvent('map', 'click', 'secondaryCluster');
  });

  // Event listener for when we zoom/move the maps which causes the bounds to change.
  google.maps.event.addListener(gMap, 'bounds_changed', () => {
    const mapBounds = gMap.getBounds();

    if (mapBounds && gCurrentViewportCenter) {
      const currentLat = mapBounds.getCenter().lat();
      const currentLng = mapBounds.getCenter().lng();

      // Re-sync locations list with new map bounds.
      refreshList(data, filters);

      gCurrentViewportCenter = {
        lat: currentLat,
        lng: currentLng,
      };

      updateStats(); // number of markers in map bounds has (probably) changed
    }
  });

  const mapBounds = gMap.getBounds();
  
  //On initialization, set global variable to current center of map
  if (mapBounds) {
    const mapCenter = mapBounds.getCenter();
    gCurrentViewportCenter = {
      lat: mapCenter.lat(),
      lng: mapCenter.lng(),
    };
  }

  showMarkers(data, filters);

  // Initialize autosuggest/search field above the map.
  initMapSearch(data, filters);

  loadOtherCountries();

  // Add map control for adding additional datasets
  // Checking additional layers in the google maps legend will fetch and process the related data (if it does not exist 
  // in datasetData) and push it to the secondary marker set for it to be visible.
  const onChange = (dataset, event) => {
    const { checked } = event.target;
    dataset.checked = checked;

    if (checked) {
      if (datasetData[dataset.key]) {
        gSecondaryMarkers.push(
          ...datasetData[dataset.key].markers
        );
        updateClusters(null, gSecondaryCluster);
      } else {
        $.getJSON(
          getDatasetFilename(dataset.key, gCountryCode),
          (result) => {
            const markerOptions = {
              icon: getIcon(gDatasetMarkers[dataset.key].standard),
              opacity: 1,
              datasetKey: dataset.key,
            };

            const formattedDataset = toDataByLocation(result, dataset.key);

            Object.assign(
              datasetData,
              {
                [dataset.key]: {
                  data,
                  markers: getMarkers(formattedDataset, {}, null, markerOptions).outOfFilters,
                },
              }
            );

            gSecondaryMarkers.push(
              ...datasetData[dataset.key].markers
            );
            gSecondaryCluster.setClusterClass('');
            updateClusters(null, gSecondaryCluster);
          }
        );
      }
    } else {
      gSecondaryMarkers = gSecondaryMarkers.filter((marker) => (
        !datasetData[dataset.key].markers.includes(marker)
      ));
      gSecondaryCluster.setClusterClass('secondarycluster');
      updateClusters(null, gSecondaryCluster);
    }
  };

  const legend = generateGMapDatasetLegend(onChange);

  // Append the newly created legend with its event listener to top left of google Maps
  gMap.controls[google.maps.ControlPosition.TOP_LEFT].push(legend);

  if (!isEmbed) {
    // Add map control for custom fullscreen behavior.
    // (Regular fullsceen behavior of Google maps messes up Bootstrap modals, popovers, etc.)
    gMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(document.getElementById('customFullscreenButton'));

    $('#customFullscreenButton').on('click', () => {
      // From https://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_fullscreen2
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
          document.msExitFullscreen();
        }
      } else {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { /* Firefox */
          elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { /* IE/Edge */
          elem.msRequestFullscreen();
        }
      }
    });

    document.documentElement.onfullscreenchange = () => {
      if (document.fullscreenElement) {
        // When browser goes full screen, show only nav bar and map.
        $('#filter-div').hide();
        $('#locations-div').hide();
        $('#map-div').width('100vw');
        $('#map').width('100vw');
        $('#customFullscreenImage').attr('src', '/images/icons/shrinkMap.svg');
      } else {
        // When browser leaves full screen, show everything.
        $('#filter-div').show();
        $('#locations-div').show();
        $('#map').width('100%');
        $('#customFullscreenImage').attr('src', '/images/icons/growMap.svg');
      }
    };
  }
}

// Lazy-loads the Google maps script once we know we need it. Sets up
// a global initMap callback on the window object so the gmap script
// can find it.
function loadMapScript(data, filters) {
  // Property created on window must match name passed in &callback= param
  window.initMap = () => initMap(data, filters);

  // load map based on current lang
  const scriptTag = ce('script');

  // API Key below is only enabled for *.findthemasks.com/* Message @susanashlock for more info.
  const apiKey = window.GOOGLE_MAPS_API_KEY || 'AIzaSyDSz0lnzPJIFeWM7SpSARHmV-snwrAXd2s';
  const languageRegion = getMapsLanguageRegion();
  const scriptSrc = `//maps.googleapis.com/maps/api/js?libraries=geometry,places&callback=initMap&key=${apiKey}&language=${languageRegion.language}&region=${languageRegion.region}`;

  scriptTag.setAttribute('src', scriptSrc);
  scriptTag.setAttribute('defer', '');
  document.head.appendChild(scriptTag);
}

// Takes in params from query string in URL and decodes it.
// Then, set any filter with the same key as param to be true.
const applyFilterParams = ((params, filterSet) => {
  params.filter((param) => param && param.trim().length > 0).forEach((param) => {
    const filter = filterSet[decodeURIComponent(param)];

    if (filter) {
      filter.isSet = true;
    }
  });
});

// Checks if there is a date record in localStorage of the last time the dismissable banners were closed.
// If there are none or if it has been over 12 hours since the banners have been closed, display the banners and
// record the time when they are closed.
const initGlobalAlert = () => {
  const alerts = $('.alert-dismissable');

  alerts.each((index, alert) => {
    const dataName = alert.getAttribute('data-alert-name');
    const alertData = localStorageInstance.getItem(dataName);
    const alertShownDate = alertData ? new Date(alertData) : null;
    const twelveHoursMs = 60 * 60 * 12 * 1000;
    if (!alertShownDate || ((new Date()) - alertShownDate) > twelveHoursMs) {
      alert.classList.remove('d-none');
      $(alert).on('close.bs.alert', () => {
        localStorageInstance.setItem(dataName, new Date());
      });
    }
  });
};

const initEmbedEventListeners = () => {
  // Web toggle button
  document.getElementById('js-ToggleListButton').addEventListener('click', toggleEmbedList);

  // Mobile view toggle buttons
  const mobileViewButtons = document.getElementsByClassName('emb-toggleButton');

  for (let i = 0; i < mobileViewButtons.length; i++) {
    mobileViewButtons[i].addEventListener('click', () => toggleMobileView(i));
  }
};

const toggleEmbedList = () => {
  const button = document.getElementById('js-ToggleListButton');
  const container = document.getElementById('js-EmbedContainer');

  if (container.classList.contains('list-open')) {
    button.innerText = $.i18n('ftm-embed-toggle-open');
  } else {
    button.innerText = $.i18n('ftm-embed-toggle-close');
  }

  container.classList.toggle('list-open');
};

const toggleMobileView = (index) => {
  const container = document.getElementById('js-EmbedContainer');
  const webButton = document.getElementById('js-ToggleListButton');

  const mobileViewButtons = document.getElementsByClassName('emb-toggleButton');

  // If the data type is list we toggle open the list
  if (mobileViewButtons[index].dataset.type === 'list') {
    container.classList.add('list-open');
  } else {
    container.classList.remove('list-open');
  }

  // Set the web button text as well in case they have shrunk the screen
  if (container.classList.contains('list-open')) {
    webButton.innerText = $.i18n('ftm-embed-toggle-open');
  } else {
    webButton.innerText = $.i18n('ftm-embed-toggle-close');
  }

  for (let i = 0; i < mobileViewButtons.length; i++) {
    if (index !== i) {
      mobileViewButtons[i].dataset.active = 'false';
    } else {
      mobileViewButtons[index].dataset.active = 'true';
    }
  }
};

$(() => {
  const renderListings = (result) => {
    // Checks each entry of raw data for approval. Then, parses the approved data by states then cities
    // This parsed data will be used by methods later on
    const data = toDataByLocation(result, gDataset);

    // calculates total entries from parsed data
    // we can't just use `result.values.length - 2` because the makers dataset
    // has some entries that do not have valid lat/lng, so we want to count the entries
    // after we've cleaned the data
    totalEntries = Object.keys(data)
      .reduce((accumulator, currVal) => (accumulator + Object.keys(data[currVal].cities)
        .reduce((accum, curr) => (accum + data[currVal].cities[curr].entries.length), 0)), 0);

    const showFilters = searchParams['hide-filters'] !== 'true';

    // Second, allow an override from ?hide-search=[bool].
    if (searchParams['hide-search'] !== null) {
      gShowMapSearch = searchParams['hide-search'] !== 'true';
    }

    const filters = createFilters(data);

    // Update filters to match any ?state= params
    const states = (searchParams.state || '').toUpperCase().split(',');
    applyFilterParams(states, filters.states);

    // Gets all the possible filter types associated with a particular dataset
    const datasetFilters = filtersByDataset[gDataset];

    // Checks searchParams for any filters to be applied on webapage load and apply them.
    Object.keys(datasetFilters).forEach((datasetFilterKey) => {
      const { searchParamKey } = datasetFilters[datasetFilterKey];

      const values = (searchParams[searchParamKey] || '').toLowerCase().split(',');

      applyFilterParams(values, filters[datasetFilterKey]);
    });

    updateFilters(filters);

    loadMapScript(data, filters);

    if (showFilters && areThereFilters(filters)) {
      createFilterElements(data, filters);
    }

    $('.locations-loading').hide();
  };

  initContactModal();
  initGlobalAlert();

  if (isEmbed) {
    initEmbedEventListeners();
  }
  // Get the relevant json data file based on country and dataset from findthemasks.com and
  // calls renderListings on the data
  $.getJSON(getDatasetFilename(gDataset, gCountryCode), (result) => {
    if (window.i18nReady) {
      renderListings(result);
    } else {
      $('html').on('i18n:ready', () => {
        renderListings(result);
      });
    }
  });

  const footerHeight = 40; // small buffer near bottom of window

  if (isEmbed) {
    $('#locations-list').scroll(() => {
      if ($('#locations-list').scrollTop() + $('#locations-list').innerHeight() > $('#locations-list')[0].scrollHeight - footerHeight) {
        renderNextListPage();
      }
    });
  } else {
    $(window).scroll(() => {
      if ($(window).scrollTop() + $(window).height() > $(document).height() - footerHeight) {
        renderNextListPage();
      }
    });
  }
});
