/* global google linkifyElement */

import Selectr from 'mobius1-selectr';
import MarkerClusterer from '@google/markerclustererplus';
import toDataByLocation from './toDataByLocation.js';
import countries from '../constants/countries.js';
import { ENUM_MAPPINGS } from './formEnumLookups.js';
import { getMapsLanguageRegion } from './i18nUtils.js';
import { ac, ce, ctn, FtmUrl, htmlToElements } from './utils.js';
import sendEvent from './sendEvent.js';

require('mobius1-selectr/src/selectr.css');

require('./i18n.js');
require('./polyfills.js');

// Allow for hot-reloading of CSS in development.
require('../sass/style.scss');

// Master data object, indexed by country code
const countryData = {};
const gCountryCode = document.body.dataset.country;
const gDataset = document.body.dataset.dataset;

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

const SECONDARY_MARKER_OPTIONS = {
  icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Ccircle cx='4' cy='4' r='4' style='fill:red'/%3E%3C/svg%3E",
  opacity: 0.4,
};

const PRIMARY_MARKER_OPTIONS = {
  icon: 'https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red.png',
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
function createFilters(data) {
  const datasetFilters = filtersByDataset[gDataset];

  const filters = {
    states: {},
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
  const contentTags = [ce('h5', separator ? 'separator' : null, ctn(entry.name))];

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

function createRequesterMarkerContent(entry, separator) {
  const {
    org_type: orgType,
    address,
    name,
    instructions,
    accepting,
    open_box: openBox,
    rdi,
    timestamp,
    website,
  } = entry;

  // Text to go into InfoWindow
  const contentTags = separator ? [ce('h5', 'separator', ctn(name))] : [ce('h5', null, ctn(name))];

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
  if (gDataset === 'makers') {
    return createMakerMarkerContent(entry, separator);
  }

  return createRequesterMarkerContent(
    entry,
    separator
  );
}

// accepts a marker and sets its icon to either the
// highlighted icon or the default icon depending on `isHighlighted` arg
function setMarkerIcon(marker, isHighlighted) {
  if (marker) {
    if (isHighlighted) {
      marker.setIcon('https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_blue.png');
    } else {
      marker.setIcon('https://raw.githubusercontent.com/Concept211/Google-Maps-Markers/master/images/marker_red.png');
    }
  }
}

function createMarker(latitude, longitude, entry, markerOptions, otherEntries) {
  const location = { lat: latitude, lng: longitude };
  const options = {
    position: location,
    title: entry.name,
    ...markerOptions || {},
  };
  const marker = new google.maps.Marker(options);

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
  const { states, ...otherFilters } = appliedFilters;

  const otherFilterKeys = otherFilters && Object.keys(otherFilters).reduce((acc, otherFilterKey) => {
    acc[otherFilterKey] = Object.keys(otherFilters[otherFilterKey]);
    return acc;
  }, {});

  const datasetFilters = filtersByDataset[gDataset];

  const hasStateFilter = Boolean(states);

  const inFiltersMarkers = [];
  const outOfFiltersMarkers = [];

  for (const stateName of Object.keys(data)) {
    const inStateFilter = states && states[stateName];

    const hasFilters = Object.keys(otherFilterKeys).length > 0 || hasStateFilter;

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
 *
 * @param   $elem   jQuery selector for the stats element
 * @param   count   The number for render
 */
function updateStats($elem, count) {
  const prettyMarkerCount = numberFormat(count, 0);
  $elem.show();

  if (gDataset === 'makers') {
    $elem.html($.i18n('ftm-makers-count', prettyMarkerCount));
  } else {
    $elem.html($.i18n('ftm-requesters-count', prettyMarkerCount));
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
 * Changes the markers currently rendered on the map based strictly on . This will reset the
 * 'markers' module variable as well.
 */
function showMarkers(data, filters, recenterMap = true) {
  if (!gMap || !gPrimaryCluster) {
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  const applied = filters.applied || {};
  const hasFilters = Object.keys(applied).length > 0;

  const markers = getMarkers(data, applied, hasFilters && bounds);

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
    marker.setOptions(PRIMARY_MARKER_OPTIONS);
  }

  for (const marker of gSecondaryMarkers) {
    marker.setOptions(SECONDARY_MARKER_OPTIONS);
  }

  updateClusters(gPrimaryCluster, gSecondaryCluster);

  const $mapStats = $('#map-stats');
  updateStats($mapStats, markers.inFilters.length + markers.outOfFilters.length);

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
  let listCount = 0; // TODO: hacky, see note below.

  const { states, ...otherFilters } = applied;

  const otherFilterKeys = otherFilters && Object.keys(otherFilters).reduce((acc, otherFilterKey) => {
    acc[otherFilterKey] = Object.keys(otherFilters[otherFilterKey]);
    return acc;
  }, {});

  const onEntry = (entry, cityName, stateName) => {
    let notInFilters = false;

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

    listCount++;
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

  // TODO: This is hacky since technically this function should ONLY be responsible for generating
  // HTML snippets, not updating stats; however this is the quickest method for updating filter
  // stats as well.
  if (gMap) {
    // if the map hasn't loaded yet, don't update requester count - otherwise it'll flash once
    // the map uploads (depending on zoom level)
    updateStats($('#list-stats'), listCount);
  }

  return entries;
}

function createMakerListItemEl(entry) {
  entry.domElem = ce('div', 'location');
  const header = ce('div', 'd-flex');
  const headerZoomLink = ce('div', 'icon icon-search entry-zoom-link');
  headerZoomLink.setAttribute('aria-label', 'Zoom to marker');
  const headerMakerspaceInfo = ce('div', 'flex-grow-1 grey-background');
  ac(headerMakerspaceInfo, ce('h5', null, [ctn(entry.name), headerZoomLink]));

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
  addParagraph($.i18n('ftm-makers-contact'), entry.public_contact);
  addLine($.i18n('ftm-makers-location'), `${entry.city}, ${entry.state} ${entry.zip}`);
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
}

function createRequesterListItemEl(entry) {
  entry.domElem = ce('div', 'location');
  const header = ce('div', 'd-flex');
  const headerHospitalInfo = ce('div', 'flex-grow-1');
  const headerZoomLink = ce('div', 'icon icon-search entry-zoom-link');
  headerZoomLink.setAttribute('aria-label', 'Zoom to marker');
  const headerOrgType = ce('div', 'flex-grow-1 d-flex justify-content-end text-pink');
  ac(headerHospitalInfo, ce('h5', null, [ctn(entry.name), headerZoomLink]));

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

function getEntryEl(entry) {
  if (!entry.domElem) {
    // Adds the domElem field if it has not been created.
    if (gDataset === 'makers') {
      createMakerListItemEl(entry);
    } else {
      createRequesterListItemEl(entry);
    }
  }
  $(entry.domElem).find('.entry-zoom-link').on('click', () => {
    sendEvent('listView', 'clickZoom', entry.name);
    zoomToMarker(entry.marker);
  });
  $(entry.domElem).on('mouseenter', () => {
    sendEvent('listView', 'mouseover', entry.name);
    setMarkerIcon(entry.marker, true);
  });
  $(entry.domElem).on('mouseleave', () => { setMarkerIcon(entry.marker, false); });
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
  renderNextListPage();
  // initializes collapse logic on locations table if this is the embed
  if (isEmbed) {
    initializeEmbedLocationCollapse();
  }
}

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


    for (const item of Object.keys(filters[f])) {
      const itemFilter = filters[f][item];
      selected[itemFilter.name] = itemFilter;

      selectItems.push({
        value: itemFilter.value,
        text: itemFilter.name,
        selected: itemFilter.isSet,
      });
    }

    if (selectItems.length > 0) {
      const div = htmlToElements(`<div class="col"><select id="filter-${f}"></select></div>`)[0];
      document.getElementById('filter-container').appendChild(div);

      const selectr = new Selectr(div.firstElementChild, {
        customClass: 'ftm-select',
        data: selectItems,
        multiple: true,
        searchable: false,
        placeholder: $.i18n(filters[f].placeholder || ''),
      });

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
        ...getMarkers(dataToStore, {}, null, SECONDARY_MARKER_OPTIONS).outOfFilters
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
    sendEvent('map', 'reset', 'default-location');
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

  $('.map-container').show();

  gMap = new google.maps.Map(element);
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

  google.maps.event.addListener(gMap, 'bounds_changed', () => {
    const mapBounds = gMap.getBounds();

    if (mapBounds && gCurrentViewportCenter) {
      const currentLat = mapBounds.getCenter().lat();
      const currentLng = mapBounds.getCenter().lng();

      if (currentLat !== gCurrentViewportCenter.lat || currentLng !== gCurrentViewportCenter.lng) {
        refreshList(data, filters);
      }

      gCurrentViewportCenter = {
        lat: currentLat,
        lng: currentLng,
      };
    }
  });

  const mapBounds = gMap.getBounds();

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

  $('#contactModal #send-message').on('click', () => {
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

const applyFilterParams = ((params, filterSet) => {
  params.filter((param) => param && param.trim().length > 0).forEach((param) => {
    const filter = filterSet[decodeURIComponent(param)];

    if (filter) {
      filter.isSet = true;
    }
  });
});

$(() => {
  const renderListings = (result) => {
    const data = toDataByLocation(result);
    const showList = searchParams['hide-list'] !== 'true';
    const showFilters = searchParams['hide-filters'] !== 'true';
    const showMap = searchParams['hide-map'] !== 'true';

    const $map = $('#map');
    // Second, allow an override from ?hide-search=[bool].
    if (searchParams['hide-search'] !== null) {
      gShowMapSearch = searchParams['hide-search'] !== 'true';
    }

    const filters = createFilters(data);

    // Update filters to match any ?state= params
    const states = (searchParams.state || '').toUpperCase().split(',');
    applyFilterParams(states, filters.states);

    const datasetFilters = filtersByDataset[gDataset];

    Object.keys(datasetFilters).forEach((datasetFilterKey) => {
      const { searchParamKey } = datasetFilters[datasetFilterKey];

      const values = (searchParams[searchParamKey] || '').toLowerCase().split(',');

      applyFilterParams(values, filters[datasetFilterKey]);
    });

    updateFilters(filters);

    if (showMap) {
      $map.show();
      loadMapScript(data, filters);
    }

    $('.locations-loading').hide();

    if (showFilters && areThereFilters(filters)) {
      createFilterElements(data, filters);
      $('.filters-container').show();
    }

    if (showList) {
      $('.locations-container').show();
      refreshList(data, filters);
    }
  };

  initContactModal();

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
  $(window).scroll(() => {
    if ($(window).scrollTop() + $(window).height() > $(document).height() - footerHeight) {
      renderNextListPage();
    }
  });
});
