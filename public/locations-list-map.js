import toDataByLocation from './toDataByLocation.js';
import countries from './countries.js';
import locales from './locales.js';
import getCountry from './getCountry.js';
import { getMapsLanguageRegion, getCurrentLocaleParam, DEFAULT_LOCALE } from  './i18nUtils.js';

/******************************************
 * MODULE VARS AVAILABLE TO ALL FUNCTIONS *
 ******************************************/

// Master data object, indexed by country code
const countryData = {};
const currentCountry = getCountry();

document.body.setAttribute("data-country", currentCountry);

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

// The big list of displayed locations, as dom elements, and where we are in rendering them
let locationsListEntries = [];
let lastLocationRendered = -1;

/*************************
 * END MODULE LEVEL VARS *
 *************************/

const generateBottomNav = () => {
  const currentLocale = getCurrentLocaleParam(DEFAULT_LOCALE);

  const localeDropdownLink = document.getElementById('locales-dropdown');
  const countryDropdownLink = document.getElementById('countries-dropdown');
  const localeDropdownItems = document.getElementById('locales-dropdown-selector');
  const countryDropdownItems = document.getElementById('countries-dropdown-selector');

  if (localeDropdownLink && countryDropdownLink && localeDropdownItems && countryDropdownItems) {
    const sortedLocales = locales.sort((localeA, localeB) => {
      const aLocalized = $.i18n(localeA.i18nString);
      const bLocalized = $.i18n(localeB.i18nString);
      return aLocalized.localeCompare(bLocalized);
    });

    sortedLocales.forEach((locale) => {
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

    const sortedCountryKeys = Object.keys(countries).sort((a, b) => {
      const countryA = countries[a];
      const countryB = countries[b];

      const aLocalized = $.i18n(countryA.i18nString);
      const bLocalized = $.i18n(countryB.i18nString);

      return aLocalized.localeCompare(bLocalized);
    });

    sortedCountryKeys.forEach((countryCode) => {
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

    $(largeDonationElement).find('a').click(function(e) {
      sendEvent('largeDonation', 'click', $(this).attr('href'));
    });

    $(noDonationsElement).find('a').click(function(e) {
      sendEvent('noDonation', 'click', $(this).attr('href'));
    });
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
  const filterElements = [];

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

  filterElements.push(ce('h4', null, ctn($.i18n('ftm-administrative-region-filter', $.i18n(countries[currentCountry].administrativeRegionI18nString)))));
  for (const state of Object.keys(filters.states).sort()) {
    const stateFilter = filters.states[state];
    filterElements.push(createFilter(stateFilter, state, stateFilter.name, 'states'));
  }

  filterElements.push(ce('h4', null, ctn($.i18n('ftm-accepted-items'))));
  for (const item of Object.keys(filters.acceptItems)) {
    const itemFilter = filters.acceptItems[item];
    filterElements.push(createFilter(itemFilter, item, itemFilter.name, 'acceptItems'));
  }

  return filterElements;
}

// Wrapper for Node.appendChild.
// child (either a node or an array of nodes) is appended to the parent element
function ac(el, child) {
  if (el && child) {
    if (Array.isArray(child)) {
      child.forEach((c) => el.appendChild(c));
    } else {
      el.appendChild(child);
    }
  }
}

// Wrapper for document.createElement - creates an element of type elementName
// if className is passed, assigns class attribute
// if child (either a node or an array of nodes) is passed, appends to created element.
function ce(elementName, className, child) {
  const el = document.createElement(elementName);
  className && (el.className = className);
  child && ac(el, child);
  return el;
}

// Wrapper for document.createTextNode
function ctn(text) {
  return document.createTextNode(text);
}

// Turns a string with embedded \n characters into an Array of text nodes separated by <br>
function multilineStringToNodes(input) {
  const textNodes = input.split('\n').map((s) => ctn(s));
  let returnedNodes = [];
  textNodes.forEach((e) => {
    returnedNodes.push(e);
    returnedNodes.push(document.createElement('br'));
  })
  return returnedNodes.slice(0,-1);
}

// Return filtered data, sorted by location, in a flat list
// (flattened so it's easy to present only a piece of the list at a time)
function getFlatFilteredEntries(data, filters) {
  const entries = [];
  const applied = filters.applied || {};
  const filterAcceptKeys = applied.acceptItems && Object.keys(applied.acceptItems);
  let listCount = 0; // TODO: hacky, see note below.

  for (const stateName of Object.keys(data).sort()) {
    if (applied && applied.states && !applied.states[stateName]) {
      continue;
    }

    const state = data[stateName];
    const cities = state.cities;
    for (const cityName of Object.keys(cities).sort()) {
      const city = cities[cityName];

      city.entries.sort(function (a, b) {
          return a.name.localeCompare( b.name );
      }).forEach(function(entry) {
        if (filterAcceptKeys) {
          const acc = (entry.accepting || "").toLowerCase();
          if (!filterAcceptKeys.some(s => acc.includes(s))) {
            return;
          }
        }

        listCount++;
        entry.cityName = cityName;
        entry.stateName = stateName;
        entries.push(entry);
      });
    }
  }

  // TODO: This is hacky since technically this function should ONLY be responsible for generating HTML snippets,
  //  not updating stats; however this is the quickest method for updating filter stats as well.
  updateStats($('#list-stats'), listCount);

  return entries;
}

function getCountryDataFilename(country) {
  // Always use country-specific data.json file
  let countryDataFilename;

  countryDataFilename = `data-${ country }.json`;
  return countryDataFilename;
}

function loadOtherCountries() {
  const countryCodes = Object.keys(countries);

  for (const code of countryCodes) {
    if (code !== currentCountry) {
      $.getJSON(
        `https://storage.googleapis.com/findthemasks.appspot.com/${ getCountryDataFilename(code) }`,
        (result) => {
          const otherData = countryData[code] = toDataByLocation(result);

          // opacity value matches what's in css for the .secondarycluster class -
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

    $('.add-donation-site-form')
      .attr({href: `/${ currentCountry }/donation-form?locale=${$.i18n().locale}`})
      .click(function(e) {
        sendEvent('addDonationSite', 'click', $(this).attr('href'));
      });

    // currently only have a Facebook link under .social-link
    // if that changes, will need to accurately detect the event
    // label from either href or text
    $('.social-link').click(function(e) {
      sendEvent('socialLink', 'click', 'facebook');
    });
  });

  const renderListings = function (result) {
    const data = countryData[currentCountry] = toDataByLocation(result);
    const searchParams = new URLSearchParams(url.search);
    const showList = searchParams.get('hide-list') !== 'true';
    const showFilters = showList && searchParams.get('hide-filters') !== 'true';
    const showMap = searchParams.get('hide-map') !== 'true';

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
        ac(document.getElementsByClassName('filters-list')[0], createFilterElements(data, filters));
        $(".filters-container").show();
      }

      refreshList(data, filters);
    }
  };

  $.getJSON(`https://storage.googleapis.com/findthemasks.appspot.com/${ getCountryDataFilename(currentCountry) }`, function (result) {
    if(window.i18nReady) {
      renderListings(result);
    } else {
      $('html').on('i18n:ready', function() {
        renderListings(result);
      });
    }
  });

  const footerHeight = 440;  // footer + navbar + small buffer
  $(window).scroll(function() {
     if($(window).scrollTop() + $(window).height() > $(document).height() - footerHeight) {
        renderNextListPage();
     }
  });
});

function refreshList(data, filters) {
  locationsListEntries = getFlatFilteredEntries(data, filters);
  lastLocationRendered = -1;
  $(".locations-list").empty();
  renderNextListPage();
}

function renderNextListPage() {
  if (lastLocationRendered >= locationsListEntries.length - 1) {
    return; // all rendered
  }

  const el = document.getElementsByClassName("locations-list")[0];
  let renderLocation = lastLocationRendered + 1;
  const children = [];

  locationsListEntries.slice(renderLocation, renderLocation + 40).forEach(function (entry) {
    // Add city/state headers
    if (renderLocation == 0) {
      children.push(getStateEl(entry), getCityEl(entry));
    } else {
      const lastEntry = locationsListEntries[renderLocation - 1];
      if (entry.stateName != lastEntry.stateName) {
        children.push(getStateEl(entry));
      }
      if (entry.cityName != lastEntry.cityName) {
        children.push(getCityEl(entry));
      }
    }

    children.push(getEntryEl(entry));
    renderLocation += 1;
  });

  ac(el, children);
  lastLocationRendered = renderLocation - 1;
}

function getOneLineAddress(address) {
  return address.trim().replace(/\n/g, " ");
}

function googleMapsUri(address) {
  return encodeURI(`https://www.google.com/maps/search/?api=1&query=${address}`);
}

function getEntryEl(entry) {
  if (!entry.domElem) {
    entry.domElem = ce('div', 'location');
    ac(entry.domElem, [
      ce('h4', null, ctn(entry.name)),
      ce('label', null, ctn($.i18n('ftm-address'))),
    ]);
    const addr = entry.address.trim().split('\n');

    if (addr.length) {
      const para = ce('p', 'marginTopZero medEmph');
      const link = ce('a', 'map-link');
      const $link = $(link);
      const address = getOneLineAddress(entry.address);
      link.href =  googleMapsUri(address);
      link.target = '_blank';
      $link.click(function() {
        sendEvent('listView', 'clickAddress', address);
      });
      ac(para, link);
      for (const line of addr) {
        ac(link, [
          ctn(line),
          ce('br')
        ]);
      }

      ac(entry.domElem, para);
    }

    if (entry.instructions) {
      ac(entry.domElem, [
        ce('label', null, ctn($.i18n('ftm-instructions'))),
        linkifyElement(ce('p', null, multilineStringToNodes(entry.instructions)))
      ]);
    }

    if (entry.accepting) {
      ac(entry.domElem, [
        ce('label', null, ctn($.i18n('ftm-accepting'))),
        ce('p', null, ctn(entry.accepting))
      ]);
    }

    if (entry.open_box) {
      ac(entry.domElem, [
        ce('label', null, ctn($.i18n('ftm-open-packages'))),
        ce('p', null, ctn(entry.open_box))
      ]);
    }
  }

  return entry.domElem; // TODO: generate this here.
}

function getStateEl(entry) {
  return ce('h2', 'state', ctn(entry.state));
}

function getCityEl(entry) {
  return ce('h3', 'city', ctn(entry.city));
}

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
  refreshList(data, filters);
  showMarkers(data, filters);
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
  const apiKey = window.GOOGLE_MAPS_API_KEY || 'AIzaSyDSz0lnzPJIFeWM7SpSARHmV-snwrAXd2s';
  const languageRegion = getMapsLanguageRegion();
  const scriptSrc = `//maps.googleapis.com/maps/api/js?libraries=geometry,places&callback=initMap&key=${apiKey}&language=${languageRegion.language}&region=${languageRegion.region}`;

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

  primaryCluster.addListener('click', function(e) {
    sendEvent('map', 'click', 'primaryCluster');
  });

  secondaryCluster.addListener('click', function(e) {
    sendEvent('map', 'click', 'secondaryCluster');
  });

  showMarkers(data, filters);

  // Initialize autosuggest/search field above the map.
  initMapSearch(data, filters);

  loadOtherCountries();
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
      let viewport = place.geometry.viewport;
      if (viewport) {
        fitMapToMarkersNearBounds(viewport);
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
          let viewport = results[0].geometry.viewport;
          fitMapToMarkersNearBounds(viewport);
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
    $search.val('');
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
 * Fits map to bounds, expanding the bounds to include at least three markers as necessary.
*/
function fitMapToMarkersNearBounds(bounds) {
  // get center of bounding box and use it to sort markers by distance
  let center = bounds.getCenter();
  const markersByDistance = getMarkersByDistanceFrom(center.lat(), center.lng());

  // extend bounds to fit closest three markers
  [0,1,2].forEach((i) => {
    const marker = markersByDistance[i];
    if (marker) {
      bounds.extend(marker.position);
    }
  });

  map.fitBounds(bounds);
}

/**
 * Returns a list of markers sorted by distance from an arbitrary set of lat/lng coords.
 */
function getMarkersByDistanceFrom(latitude, longitude) {
  const latlng = new google.maps.LatLng(latitude, longitude);

  const markerDistances = new Map();

  for (const marker of primaryMarkers) {
    let distance = google.maps.geometry.spherical.computeDistanceBetween(marker.position, latlng);

    // HACK: In the unlikely event that the exact same distance is computed, add one meter to the distance to give it a unique distance
    // This could occur if a marker was added twice to the same location.
    if (markerDistances.has(distance)) {
      distance = distance + 1;
    }

    markerDistances.set(distance, marker);
  }

  // order markerDistances by key (distance)
  let distances = [...markerDistances.keys()].sort((a,b) => a -b);
  // return array of markers in order of distance ascending
  return distances.map((distance) => markerDistances.get(distance));
}

/**
 * Centers map around markers nearest to an arbitrary set of latitude/longitude coordinates.
 */
function centerMapToMarkersNearCoords(latitude, longitude) {
  const markersByDistance = getMarkersByDistanceFrom(latitude, longitude);

  // center the map on the user
  const latlng = new google.maps.LatLng(latitude, longitude);
  const bounds = new google.maps.LatLngBounds();
  let hasMarker = false;
  bounds.extend(latlng);

  // Extend the bounds to contain the three closest markers
  [0,1,2].forEach((i) => {
    const marker = markersByDistance[i];

    if (marker) {
      hasMarker = true;
      bounds.extend(marker.position);
    }
  });

  if (hasMarker) {
    // zoom to fit user loc + nearest markers
    map.fitBounds(bounds);
  } else {
    // just has user loc - shift view without zooming
    map.setCenter(latlng);
  }
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
  updateStats($mapStats, markers.instate.length + markers.outofstate.length);

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
  at: { zoom: 6, center: { lat:47.716231, lng:	13.90072 }},
  ca: { zoom: 3, center: { lat: 56.130366, lng: -106.346771 }},
  ch: { zoom: 7, center: { lat: 46.818188, lng: 8.227512 }},
  de: { zoom: 5, center: { lat: 51.165691, lng: 10.451526 }},
  es: { zoom: 5, center: { lat: 40.163667, lng:	-3.74922 }},
  fr: { zoom: 5, center: { lat: 46.227638, lng: 2.213749 }},
  gb: { zoom: 5, center: { lat: 55.378051, lng: -3.435973 }},
  it: { zoom: 5, center: { lat: 41.87194, lng: 12.56738 }},
  pt: { zoom: 6, center: { lat: 39.399872, lng: -8.224454 }},
  us: { zoom: 4, center: { lat: 37.09024, lng: -95.712891 }},
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
    sendEvent('map', 'click', 'marker');

    openInfoWindows.forEach(infowindow => infowindow.close());
    openInfoWindows = [];

    if (!marker.infowindow) {
      // Text to go into InfoWindow

      // setup google maps link
      const mapLinkEl = ce('a','map-link');
      const oneLineAddress = getOneLineAddress(address);
      mapLinkEl.href = googleMapsUri(oneLineAddress);
      mapLinkEl.target = '_blank';
      mapLinkEl.addEventListener('click', () => {
        sendEvent('map', 'clickAddress', oneLineAddress);
      });
      mapLinkEl.appendChild(ctn(address));

      const content = ce('div', null, [
        ce('h5', null, ctn(name)),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-address-label'))),
        ce('div', 'value', mapLinkEl),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-instructions-label'))),
        linkifyElement(ce('div', 'value', multilineStringToNodes(instructions))),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-accepting-label'))),
        ce('div', 'value', ctn(accepting)),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-open-packages-label'))),
        ce('div', 'value', ctn(open_accepted)),
      ]);

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
