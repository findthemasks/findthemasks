import toDataByLocation from './toDataByLocation.js';
import countries from './countries.js';
import locales from './locales.js';
import getCountry from './getCountry.js';

/******************************************
 * MODULE VARS AVAILABLE TO ALL FUNCTIONS *
 ******************************************/

// Master data object, indexed by country code
const countryData = {};
const currentCountry = getCountry();

// Map, markers and map associated UI components are initialized in initMap().
let autocomplete;
let map = null;
// Markers shown with primary prominence: in current country, in selected state(s), matching filters
let primaryMarkers = [];
// Markers shown with secondary prominence: in current country, outside selected state(s), matching filters
let secondaryMarkers = [];
// Markers from outside the current country
const otherMarkers = [];

// Primary markers shown in primary cluster
let primaryCluster = null;
// Secondary + other markers shown in secondary cluster
let secondaryCluster = null;

const secondaryMarkerOptions = {
  icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Ccircle cx='4' cy='4' r='4' style='fill:red'/%3E%3C/svg%3E",
  opacity: 0.4
};

const primaryMarkerOptions = {
  icon: null, // Use default
  opacity: 1
};

// Configuration defined in query string. Initialized in jQuery DOM ready function.
let showMapSearch = false; // BETA FEATURE: Default to false.

// Keep track of the previous info windows user has clicked so we can close them.
let openInfoWindows = [];

/*************************
 * END MODULE LEVEL VARS *
 *************************/

const getCurrentLocale = () => {
  const url = new URL(window.location);

  return url.searchParams.get('locale') || 'en';
};

const generateBottomNav = () => {
  const currentLocale = getCurrentLocale();

  const localeDropdownLink = document.getElementById('locales-dropdown');
  const countryDropdownLink = document.getElementById('countries-dropdown');
  const localeDropdownItems = document.getElementById('locales-dropdown-selector');
  const countryDropdownItems = document.getElementById('countries-dropdown-selector');

  if (localeDropdownLink && countryDropdownLink && localeDropdownItems && countryDropdownItems) {
    locales.forEach((locale) => {
      if (locale.localeCode === currentLocale.toLowerCase()) {
        localeDropdownLink.textContent = $.i18n(locale.i18nString);
      }

      const element = document.createElement('a');
      element.className = 'dropdown-item';
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('locale', locale.localeCode);
      element.setAttribute('href', currentUrl.href);
      element.textContent = $.i18n(locale.i18nString);
      element.addEventListener("click", () =>  sendEvent("i18n", 'set-locale', locale.localeCode));
      localeDropdownItems.appendChild(element);
    });

    Object.keys(countries).forEach((countryCode) => {
      const country = countries[countryCode];

      if (country.countryCode === currentCountry.toLowerCase()) {
        countryDropdownLink.textContent = $.i18n(country.i18nString);
      }

      const element = document.createElement('a');
      element.className = 'dropdown-item i18n';
      const currentUrl = new URL(window.location.href);
      const pathname = currentUrl.pathname;
      const updatedPath = pathname.replace(/(\/[a-z]{2}\/|\/)/, `/${country.countryCode}/`);
      currentUrl.pathname = updatedPath;

      element.setAttribute(
        'href',
        currentUrl.href
      );
      element.textContent = $.i18n(country.i18nString);
      element.addEventListener("click", () =>  sendEvent("i18n", 'set-country', country.countryCode));
      countryDropdownItems.appendChild(element);
    });
  }
};

const addDonationSites = () => {
  const countryConfig = countries[currentCountry.toLowerCase()];

  const largeDonationElement = document.getElementById('large-donation-selector');
  const noDonationsElement = document.getElementById('no-donations-selector');

  if (largeDonationElement && noDonationsElement) {
    const countryDonationSites = countryConfig.donationSites;

    const administrativeRegionStringHtml = countryDonationSites.administrativeRegionLinks && countryDonationSites.administrativeRegionLinks.map((link) => (
      `<a href="${link.url}" target='_blank' rel='noreferrer noopener'>${$.i18n(link.labelI18nString)}</a>`
    )).join(', ');

    const nationalLinksHtml = countryDonationSites.nationalLinks && countryDonationSites.nationalLinks.map((link) => (
      `<a href="${link.url}" target='_blank' rel='noreferrer noopener'>${$.i18n(link.labelI18nString)}</a>`
    )).join(', ');

    largeDonationElement.innerHTML = $.i18n(countryDonationSites.i18nString, administrativeRegionStringHtml, nationalLinksHtml);
    noDonationsElement.innerHTML = $.i18n(countryConfig.noDonationSitesNearMeI18nString);
  }
};

// Builds the data structure for tracking which filters are set
// If all values in a category are false, it's treated as no filter - all items are included
// If one or more values in a category is true, the filter is set - only items matching the filter are included
// If two or more values in a category are true, the filter is the union of those values
// If multiple categories have set values, the result is the intersection of those categories
function createFilters(data) {
  const filters = {
    states: {}
  };

  for (const state of Object.keys(data)) {
    filters.states[state] = { name: state, isSet: false };
  }

  filters.acceptItems = {
    'n95s': { name: $.i18n('ftm-item-n95s'), isSet: false },
    'masks': { name: $.i18n('ftm-item-masks'), isSet: false },
    'shields': { name: $.i18n('ftm-item-face-shields'), isSet: false },
    'booties': { name: $.i18n('ftm-item-booties'), isSet: false },
    'goggles': { name: $.i18n('ftm-item-goggles'), isSet: false },
    'gloves': { name: $.i18n('ftm-item-gloves'), isSet: false },
    'sanitizer': { name: $.i18n('ftm-item-sanitizer'), isSet: false },
    'overalls': { name: $.i18n('ftm-item-overalls'), isSet: false },
    'gowns': { name: $.i18n('ftm-item-gowns'), isSet: false },
    'respirators': { name: $.i18n('ftm-item-respirators'), isSet: false },
  };

  return filters;
}

// Creates an 'applied' property in filters with the subset of the 'states' and 'acceptItems' filters
// that are actually set. getFilteredContent/showMarkers can scan this 'applied' object instead of
// walking the full set.
function updateFilters(filters) {
  const applied = filters.applied = {};

  for (const state of Object.keys(filters.states)) {
    if (filters.states[state].isSet) {
      applied.states = applied.states || {};
      applied.states[state] = true;
    }
  }

  for (const item of Object.keys(filters.acceptItems)) {
    if (filters.acceptItems[item].isSet) {
      applied.acceptItems = applied.acceptItems || {};
      applied.acceptItems[item] = true;
    }
  }
}

// Sends event to gtag for analytics
function sendEvent(category, action, label) {
  gtag('event', action, {
    'event_category': category,
    'event_label': label
  });
};

function createFilterElements(data, filters) {
  const container = ce('div');

  function createFilter(filter, key, value, prefix) {
    const filterContainer = ce('div');
    const input = ce('input');
    input.type = 'checkbox';
    input.id = `${ prefix }-${ key }`;
    input.value = key;
    input.addEventListener('change', () => onFilterChange(data, prefix, key, filters));
    filterContainer.appendChild(input);
    const label = ce('label', null, ctn(value));
    label.id = `${ prefix }-${ key }-label`;
    label.htmlFor = input.id;
    label.addEventListener("click", () =>  sendEvent("filters", `${ prefix }`, key));
    filterContainer.appendChild(label);

    if (filter.isSet) {
      input.checked = true;
      label.classList.add('selected');
    }

    filter.input = input;
    filter.label = label;

    return filterContainer;
  }

  container.appendChild(ce('h4', null, ctn($.i18n('ftm-administrative-region-filter', $.i18n(countries[currentCountry].administrativeRegionI18nString)))));
  for (const state of Object.keys(filters.states).sort()) {
    const stateFilter = filters.states[state];
    container.appendChild(createFilter(stateFilter, state, stateFilter.name, 'states'));
  }

  container.appendChild(ce('h4', null, ctn($.i18n('ftm-accepted-items'))));
  for (const item of Object.keys(filters.acceptItems)) {
    const itemFilter = filters.acceptItems[item];
    container.appendChild(createFilter(itemFilter, item, itemFilter.name, 'acceptItems'));
  }

  return container;
}

// Wrapper for document.createElement - creates an element of type elementName
// if className is passed, assigns class attribute
// if child is passed, appends to created element
function ce(elementName, className, child) {
  const el = document.createElement(elementName);
  className && (el.className = className);
  child && el.appendChild(child);
  return el;
}

// Wrapper for document.createTextNode
function ctn(text) {
  return document.createTextNode(text);
}

function createContent(data) {
  for (const stateName of Object.keys(data)) {
    const state = data[stateName];

    state.domElem = $(ce('div', 'state', ce('h2', null, ctn(stateName))));
    state.containerElem = $(ce('div', 'all-cities-wrap'));
    state.domElem.append(state.containerElem);

    const cities = state.cities;
    for (const cityName of Object.keys(cities)) {
      const city = cities[cityName];

      city.domElem = $(ce('div', 'city', ce('h3', null, ctn(cityName))));
      city.containerElem = $(ce('div'));
      city.domElem.append(city.containerElem);

      // Array.prototype.sort sorts in-place, so only need to do it once per city
      city.entries.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
}

function getFilteredContent(data, filters) {
  const content = [];
  const applied = filters.applied || {};
  const filterAcceptKeys = applied.acceptItems && Object.keys(applied.acceptItems);
  let listCount = 0; // TODO: hacky, see note below.

  for (const stateName of Object.keys(data).sort()) {
    if (applied && applied.states && !applied.states[stateName]) {
      continue;
    }

    const state = data[stateName];
    let hasCity = false;
    state.containerElem.empty();

    const cities = state.cities;
    for (const cityName of Object.keys(cities).sort()) {
      const city = cities[cityName];
      let hasEntry = false;
      city.containerElem.empty();

      for (const entry of city.entries) {
        if (filterAcceptKeys) {
          const acc = (entry.accepting || "").toLowerCase();
          if (!filterAcceptKeys.some(s => acc.includes(s))) {
            continue;
          }
        }

        listCount++;

        if (!entry.domElem) {
          entry.domElem = $(ce('div', 'location'));
          entry.domElem.append([
            ce('h4', 'marginBotomZero', ctn(entry.name)),
            ce('label', null, ctn($.i18n('ftm-address'))),
          ]);
          const addr = entry.address.trim().split('\n');

          if (addr.length) {
            const para = $(ce('p', 'marginTopZero medEmph'));
            for (const line of addr) {
              para.append([
                ctn(line),
                ce('br')
              ]);
            }
            entry.domElem.append(para);
          }

          if (entry.instructions) {
            entry.domElem.append([
              ce('label', null, ctn($.i18n('ftm-instructions'))),
              linkifyElement(ce('p', null, ctn(entry.instructions)))
            ]);
          }

          if (entry.accepting) {
            entry.domElem.append([
              ce('label', null, ctn($.i18n('ftm-accepting'))),
              ce('p', null, ctn(entry.accepting))
            ]);
          }

          if (entry.open_box) {
            entry.domElem.append([
              ce('label', null, ctn($.i18n('ftm-open-packages'))),
              ce('p', null, ctn(entry.open_box))
            ]);
          }
        }

        city.containerElem.append(entry.domElem);
        hasEntry = true;
      }

      if (hasEntry) {
        state.containerElem.append(city.domElem);
        hasCity = true;
      }
    }

    if (hasCity) {
      content.push(state.domElem);
    }
  }

  // TODO: This is hacky since technically this function should ONLY be responsible for generating HTML snippets,
  //  not updating stats; however this is the quickest method for updating filter stats as well.
  updateStats($('#list-stats'), listCount);

  return content;
}

function getCountryDataFilename(country) {
  let countryDataFilename = 'data.json';
  if (country !== 'us') {
    countryDataFilename = `data-${ country }.json`;
  }

  return countryDataFilename;
}

function loadOtherCountries() {
  const countryCodes = Object.keys(countries);

  for (const code of countryCodes) {
    if (code !== currentCountry) {
      $.getJSON(
        `https://findthemasks.com/${ getCountryDataFilename(code) }`,
        (result) => {
          const otherData = countryData[code] = toDataByLocation(result);

          // opacity value matches what's in css for the .othercluster class -
          // can set a css class for the clusters, but not for individual pins.
          otherMarkers.push(...getMarkers(otherData, {}, null, secondaryMarkerOptions).outofstate);
          updateClusters(null, secondaryCluster);
        }
      );
    }
  }
}

$(function () {
  const url = new URL(window.location);

  // this should happen after the translations load
  $('html').on('i18n:ready', function () {
    generateBottomNav();
    addDonationSites();

    $('.add-donation-site-form').attr({href: `/${ currentCountry }/donation-form?locale=${$.i18n().locale}`});
  });

  const renderListings = function (result) {
    const data = countryData[currentCountry] = toDataByLocation(result);
    const searchParams = new URLSearchParams(url.search);
    const showList = searchParams.get('hide-list') !== 'true';
    const showFilters = showList && searchParams.get('hide-filters') !== 'true';
    const showMap = searchParams.get('hide-map') !== 'true';
    const showOthers = searchParams.get('show-others') === 'true';

    // BETA: Default initialized at module level scope (see above). Initialize search field, first check #map for default
    // config. Override with query string. Currently disabled by default because it's still in beta.
    // First pull map config (if "data-enable-search" attrib defined).
    const $map = $('#map');
    if ($map.data('enable-search') !== undefined) {
      showMapSearch = $map.data('enable-search');
    }
    // Second, allow an override from ?hide-search=[bool].
    if (searchParams.get('hide-search') !== null) {
      showMapSearch = searchParams.get('hide-search') !== 'true';
    }
    // BETA ONLY: Temporarily allow a "show-search" parameter. Delete this once we're enabling by default to confirm with convention established above.
    if (searchParams.get('show-search') !== null) {
      showMapSearch = searchParams.get('show-search') === 'true';
    }
    // END BETA ONLY

    showList && createContent(data);

    const filters = createFilters(data);

    // Update filters to match any ?state= params
    const stateParams = searchParams.getAll('state').map(state => state.toUpperCase());
    const states = stateParams.map(param => param.split(',')).reduce((acc, val) => acc.concat(val), []);
    states.forEach(stateName => {
      const stateFilter = filters.states[stateName];
      if (stateFilter) {
        stateFilter.isSet = true;
      }
    });

    updateFilters(filters);

    if (showMap) {
      loadMapScript(searchParams, data, filters);
    }

    $('.locations-loading').hide();

    if (showList) {
      $('.locations-container').show();

      if (showFilters) {
        $(".filters-list").append(createFilterElements(data, filters));
        $(".filters-container").show();
      }

      $(".locations-list").empty().append(getFilteredContent(data, filters));
    }

    if (showOthers && currentCountry !== 'us') {
      loadOtherCountries();
    }
  };

  $.getJSON(`https://findthemasks.com/${ getCountryDataFilename(currentCountry) }`, function (result) {
    if(window.i18nReady) {
      renderListings(result);
    } else {
      $('html').on('i18n:ready', function() {
        renderListings(result);
      });
    }
  });
});

function onFilterChange(data, prefix, key, filters) {
  const filter = filters[prefix] && filters[prefix][key];

  if (!filter) {
    return;
  }

  if (filter.input.checked) {
    filter.label.classList.add('selected');
    filter.isSet = true;
  } else {
    filter.label.classList.remove('selected');
    filter.isSet = false;
  }

  updateFilters(filters);

  const locationsList = $(".locations-list");
  locationsList.empty().append(getFilteredContent(data, filters));
  showMarkers(data, filters);

  locationsList[0].scrollIntoView({ 'behavior': 'smooth' });
};

// Lazy-loads the Google maps script once we know we need it. Sets up
// a global initMap callback on the window object so the gmap script
// can find it.
function loadMapScript(searchParams, data, filters) {
  // Property created on window must match name passed in &callback= param
  window.initMap = () => initMap(data, filters);

  // load map based on current lang
  const scriptTag = ce('script');

  // API Key below is only enabled for *.findthemasks.com/* Message @susanashlock for more info.
  const apiKey = 'AIzaSyDSz0lnzPJIFeWM7SpSARHmV-snwrAXd2s';
  let scriptSrc = `//maps.googleapis.com/maps/api/js?libraries=geometry,places&callback=initMap&key=${ apiKey }`;

  const currentLocale = searchParams.get('locale') || 'en-US';
  const [language, region] = currentLocale.split('-');

  if (language) {
    scriptSrc += `&language=${ language }&region=${ region }`;
  }

  scriptTag.setAttribute('src', scriptSrc);
  scriptTag.setAttribute('defer', '');
  document.head.appendChild(scriptTag);
}

/**
 * Sets up map on initial page load.
 *
 * TODO (patricknelson): Should the initMap() function only be responsible for initializing the map and then have the caller handle position/zoom/bounds etc?
 */
function initMap(data, filters) {
  const element = document.getElementById('map');

  if (!element) {
    return;
  }

  $(".map-container").show();

  map = new google.maps.Map(element);
  secondaryCluster = new MarkerClusterer(map, [], {
    clusterClass: 'secondarycluster',
    imagePath: 'images/markercluster/m',
    minimumClusterSize: 5,
    zIndex: 1,
  });
  primaryCluster = new MarkerClusterer(map, [],
    {
      imagePath: 'images/markercluster/m',
      minimumClusterSize: 5,
      zIndex: 2
    });

  showMarkers(data, filters);

  // Initialize autosuggest/search field above the map.
  initMapSearch(data, filters);
}

/**********************************
 * BEGIN MAP SEARCH FUNCTIONALITY *
 **********************************/

/**
 * Responsible for initializing the search field and links below the search field (e.g. use location, reset map, etc).
 */
function initMapSearch(data, filters) {
  // If disabled, hide the search fields and don't bother attaching any functionality to them.
  if (!showMapSearch) {
    $('.map-search-wrap').hide();
    return;
  }

  // Search element (jquery + html element for autocompleter)
  const $search = $('#map-search'),
    searchEl = $search[0];

  // Initialize the map search autocompleter.
  autocomplete = new google.maps.places.Autocomplete(
    searchEl, { types: ['geocode'] }
  );

  // Avoid paying for data that you don't need by restricting the set of place fields that are returned to just the
  // address components.
  autocomplete.setFields(['geometry']);

  // When the user selects an address from the drop-down, populate the address fields in the form.
  autocomplete.addListener('place_changed', () => {
    let place = autocomplete.getPlace();
    if (place.geometry) {
      // Get the location object that we can map.setCenter() on
      sendEvent("map","autocomplete", $search.val());
      let location = place.geometry.location;
      if (location) {
        centerMapToMarkersNearCoords(location.lat(), location.lng())
      } else {
        sendEvent("map","autocomplete-fail", $search.val());
        console.warn('Location data not found in place geometry (place.geometry.location).')
      }
    } else {
      console.warn('No geometry found, attempting geocode...');
      sendEvent("map","search", $search.val());

      // Attempt a geocode of the direct user input instead.
      const geocoder = new google.maps.Geocoder();
      const searchText = $search.val();
      geocoder.geocode({ address: searchText }, (results, status) => {
        // Ensure we got a valid response with an array of at least one result.
        if (status === 'OK' && Array.isArray(results) && results.length > 0) {
          let location = results[0].geometry.location;
          centerMapToMarkersNearCoords(location.lat(), location.lng());
        } else {
          console.warn('Geocode failed: ' + status);
          sendEvent("map","geocode-fail", $search.val());
        }
      });
    }
  });

  // Setup event listeners for map action links.
  $('#use-location').on('click', (e) => {
    e.preventDefault();
    sendEvent("map","center","user-location");
    centerMapToMarkersNearUser();
  });

  $('#reset-map').on('click', (e) => {
    e.preventDefault();
    resetMap(data, filters);
    sendEvent("map","reset","default-location");
  });
}

/**
 * Strictly responsible for resetting the map to it's initial state on page load WITHOUT user's location (since we have
 * a link to link to go back to that appearance).
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
      // Use navigator provided lat/long coords to center map now.
      centerMapToMarkersNearCoords(position.coords.latitude, position.coords.longitude);

    }, (err) => {
      // Hide the "User my location" link since we know that will not work.
      $('#use-location').hide();

    }, {
      maximumAge: Infinity,
      timeout: 10000
    });
  }
}

/**
 * Centers map around markers nearest to an arbitrary set of latitude/longitude coordinates.
 */
function centerMapToMarkersNearCoords(latitude, longitude) {
  var latlng = new google.maps.LatLng(latitude, longitude);

  //Compute the distances of all markers from the user
  var markerDistances = new Map(); // an associative array containing the marker referenced by the computed distance
  var distances = []; // all the distances, so we can sort and then call markerDistances
  for (const marker of primaryMarkers) {
    let distance = google.maps.geometry.spherical.computeDistanceBetween(marker.position, latlng);

    // HACK: In the unlikely event that the exact same distance is computed, add one meter to the distance to give it a unique distance
    // This could occur if a marker was added twice to the same location.
    if (markerDistances.has(distance)) { distance = distance + 1; }

    markerDistances[distance] = marker;

    distances.push(distance);
  }

  // sort the distances and set bounds to closest three
  distances.sort((a, b) => a - b);

  // center the map on the user
  const bounds = new google.maps.LatLngBounds();
  bounds.extend(latlng);

  // Extend the bounds to contain the three closest markers
  for (let i = 0; i < 3; i++) {
    // Get one of the closest markers
    let distance = distances[i];
    let marker = markerDistances[distance];

    const marker_lat = marker.position.lat();
    const marker_lng = marker.position.lng();

    const loc = new google.maps.LatLng(marker_lat, marker_lng);
    bounds.extend(loc);
  }
  map.fitBounds(bounds);       // auto-zoom
  map.panToBounds(bounds);     // auto-center
}

/********************************
 * END MAP SEARCH FUNCTIONALITY *
 ********************************/

function getMarkers(data, appliedFilters, bounds, markerOptions) {
  const filterAcceptKeys = appliedFilters.acceptItems && Object.keys(appliedFilters.acceptItems);
  const inStateMarkers = [];
  const outOfStateMarkers = [];

  for (const stateName of Object.keys(data)) {
    const inStateFilter = appliedFilters.states && appliedFilters.states[stateName];
    const state = data[stateName];
    const cities = state.cities;

    for (const cityName of Object.keys(cities)) {
      const city = cities[cityName];

      for (const entry of city.entries) {
        let inAcceptFilter = true;
        if (filterAcceptKeys) {
          const acc = (entry.accepting || "").toLowerCase();
          if (!filterAcceptKeys.some(s => acc.includes(s))) {
            inAcceptFilter = false;
          }
        }

        let marker = entry.marker;

        if (marker) {
          if (!inAcceptFilter) {
            marker.setMap(null);
            marker = null;
          }
        } else if (inAcceptFilter) {
          const lat = Number(entry.lat);
          const lng = Number(entry.lng);

          // Guard against non-geocoded entries. Assuming no location exactly on the equator or prime meridian
          if (lat && lng) {
            marker = entry.marker = createMarker(lat, lng, entry.address, entry.name, entry.instructions, entry.accepting, entry.open_box, markerOptions);
          }
        }

        if (marker) {
          if (inStateFilter) {
            inStateMarkers.push(marker);
            bounds && bounds.extend(marker.position);
          } else {
            outOfStateMarkers.push(marker);
          }
        }
      }
    }
  }

  return {
    instate: inStateMarkers,
    outofstate: outOfStateMarkers
  };
}

/**
 * Changes the markers currently rendered on the map based strictly on . This will reset the 'markers' module variable as well.
 */
function showMarkers(data, filters) {
  if (!map || !primaryCluster) {
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  const applied = filters.applied || {};
  const hasFilters = applied.states || applied.acceptItems;

  const markers = getMarkers(data, applied, hasFilters && bounds);

  if (applied.states) {
    primaryMarkers = markers.instate;
    secondaryMarkers = markers.outofstate;
  } else {
    primaryMarkers = markers.outofstate;
    secondaryMarkers = [];
  }

  primaryCluster && primaryCluster.clearMarkers();
  secondaryCluster && secondaryCluster.clearMarkers();

  for (const marker of primaryMarkers) {
    marker.setOptions(primaryMarkerOptions);
  }

  for (const marker of secondaryMarkers) {
    marker.setOptions(secondaryMarkerOptions);
  }

  updateClusters(primaryCluster, secondaryCluster);

  let $mapStats = $('#map-stats');
  updateStats($mapStats, markers.length);

  // HACK. On some browsers, the markercluster freaks out if it gets a bunch of new markers
  // immediately followed by a map view change. Making the view change async works around
  // this bug.
  setTimeout(() => {
    centerMapToBounds(map, bounds, 9);
  }, 0);
}

// Updates one or both clusters with the latest batch of markers
function updateClusters(primaryCluster, secondaryCluster) {
  if (primaryCluster) {
    primaryCluster.clearMarkers();
    primaryCluster.addMarkers(primaryMarkers);
  }

  if (secondaryCluster) {
    secondaryCluster.clearMarkers();
    secondaryCluster.addMarkers(otherMarkers);
    secondaryCluster.addMarkers(secondaryMarkers);
  }
}

// Source for country center points: https://developers.google.com/public-data/docs/canonical/countries_csv
const MAP_INITIAL_VIEW = {
  ca: { zoom: 3, center:{ lat: 56.130366, lng: -106.346771 }},
  ch: { zoom: 7, center:{ lat: 46.818188, lng: 8.227512 }},
  de: { zoom: 5, center:{ lat: 51.165691, lng: 10.451526 }},
  fr: { zoom: 5, center:{ lat: 46.227638, lng: 2.213749 }},
  gb: { zoom: 5, center:{ lat: 55.378051, lng: -3.435973 }},
  us: { zoom: 4, center:{ lat: 37.09024, lng: -95.712891 }},
};

function centerMapToBounds(map, bounds, maxZoom) {
  if (bounds.isEmpty()) {
    const params = MAP_INITIAL_VIEW[getCountry()];
    // Default view if no specific bounds
    map.setCenter(params.center);
    map.setZoom(params.zoom);
  } else {
    google.maps.event.addListenerOnce(map, 'zoom_changed', () => {
      // Prevent zooming in too far if only one or two locations determine the bounds
      if (maxZoom && map.getZoom() > maxZoom) {
        // Apparently calling setZoom inside a zoom_changed handler freaks out maps?
        setTimeout(() => map.setZoom(maxZoom), 0);
      }
    });
    map.fitBounds(bounds);
  }
}

function createMarker(latitude, longitude, address, name, instructions, accepting, open_accepted, markerOptions) {
  const location = { lat: latitude, lng: longitude };
  const options = Object.assign({
      position: location,
      title: name
    },
    markerOptions || {}
  );
  const marker = new google.maps.Marker(options);

  marker.addListener('click', () => {
    openInfoWindows.forEach(infowindow => infowindow.close());
    openInfoWindows = [];

    if (!marker.infowindow) {
      // Text to go into InfoWindow
      const content = $(ce('div')).append([
        ce('h5', null, ctn(name)),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-address-label'))),
        ce('div', 'value', ctn(address)),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-instructions-label'))),
        linkifyElement(ce('div', 'value', ctn(instructions))),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-accepting-label'))),
        ce('div', 'value', ctn(accepting)),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-open-packages-label'))),
        ce('div', 'value', ctn(open_accepted)),
      ])[0];

      marker.infowindow = new google.maps.InfoWindow({
        content: content
      });
    }
    marker.infowindow.open(null, marker);
    openInfoWindows.push(marker.infowindow);
  });

  return marker;
}

/**
 * Adjusts stats in header above map to call out number of markers currently being rendered.
 *
 * @param   $elem   jQuery selector for the stats element
 * @param   count   The number for render
 * @param   states  The states that this applies to (array of abbreviated state strings).
 */
function updateStats($elem, count, states) {
  let statsHtml = '',
    prettyMarkerCount = number_format(count, 0);

  // Default to no states.
  statsHtml = `(${prettyMarkerCount})`;

  if (typeof states === 'undefined') states = [];
  if (states.length > 0) {
    let statesFormatted = states.join(', ');
    statsHtml = `in ${statesFormatted} ` + statsHtml;
  }

  // If we're at zero, just clear it out for now.
  if (count === 0) statsHtml = '';

  $elem.html(statsHtml);
}

/**
 * Made by Mathias Bynens <http://mathiasbynens.be/>
 * Modified by Patrick Nelson to set useful param names and sane defaults for US_en locale.
 *
 * Example usage:
 *
 *    number_format(1000.15, 1, ',', '.');
 *
 * Result:  "1.000,2"
 */
function number_format(number, decimal_places, dec_seperator, thou_seperator) {
  // Init defaults.
  if (typeof decimal_places === 'undefined') decimal_places = 0;
  if (typeof dec_seperator === 'undefined') dec_seperator = '.';
  if (typeof thou_seperator === 'undefined') thou_seperator = ',';

  number = Math.round(number * Math.pow(10, decimal_places)) / Math.pow(10, decimal_places);
  let e = number + '';
  let f = e.split('.');
  if (!f[0]) {
    f[0] = '0';
  }
  if (!f[1]) {
    f[1] = '';
  }
  if (f[1].length < decimal_places) {
    let g = f[1];
    for (let i = f[1].length + 1; i <= decimal_places; i++) {
      g += '0';
    }
    f[1] = g;
  }
  if (thou_seperator != '' && f[0].length > 3) {
    let h = f[0];
    f[0] = '';
    for (let j = 3; j < h.length; j += 3) {
      let i = h.slice(h.length - j, h.length - j + 3);
      f[0] = thou_seperator + i + f[0] + '';
    }
    let j = h.substr(0, (h.length % 3 == 0) ? 3 : (h.length % 3));
    f[0] = j + f[0];
  }
  dec_seperator = (decimal_places <= 0) ? '' : dec_seperator;
  return f[0] + dec_seperator + f[1];
}
