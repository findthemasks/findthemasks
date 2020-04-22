import toDataByLocation from './toDataByLocation.js';
import countries from './countries.js';
import { FILTER_ITEMS, ORG_TYPES, ENUM_MAPPINGS } from './formEnumLookups.js';
import { getCountry } from './getCountry.js';
import { getMapsLanguageRegion } from './i18nUtils.js';
import { ac, ce, ctn } from './utils.js';
import sendEvent from './sendEvent.js';


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
let showMapSearch = true; // BETA FEATURE: Default to false.

// Keep track of the previous info windows user has clicked so we can close them.
let openInfoWindows = [];

// The big list of displayed locations, as dom elements, and where we are in rendering them
let locationsListEntries = [];
let lastLocationRendered = -1;

/*************************
 * END MODULE LEVEL VARS *
 *************************/

// i18n must be loaded before filter items can be translated
// config stores the i18n string and this function calls i18n with it
const translatedFilterItems = (filterItems) => {
  const translated = {};

  for (const [filterItemKey, filterItem] of Object.entries(filterItems)) {
    translated[filterItemKey] = {
      name: $.i18n(filterItem.name),
      isSet: false
    };
  }

  return translated;
};

// get list of possible values for `Accepted Items`
// iterates through data to extract all unique "accepting" items
// matches against whitelist FILTER_ITEMS (from formEnumLookups.js)
// and returns the i18n keys from FILTER_ITEMS for accepting items that match
//
// NOTE: the incoming data structure is very brittle; if that changes at all, this will break
const parseFiltersFromData = (data) => {
  const acceptedItems = {};
  const orgTypes = {};

  Object.keys(data).forEach((state) => {
    Object.keys(data[state].cities).forEach((city) => {
      data[state].cities[city].entries.forEach((entry) => {
        // split on commas except if comma is in parentheses
        entry.accepting.split(/, (?![^(]*\))/).map(a => a.trim()).forEach((i) => {
          const filterKey = i.toLowerCase();
          if (FILTER_ITEMS.hasOwnProperty(filterKey) && !acceptedItems.hasOwnProperty(filterKey)) {
            acceptedItems[filterKey] = Object.assign(
              {},
              FILTER_ITEMS[filterKey],
              { value: filterKey }
            );
          }
        });

        if (entry.org_type) {
          const orgTypeKey = entry.org_type.toLowerCase();

          if (ORG_TYPES.hasOwnProperty(orgTypeKey) && !orgTypes.hasOwnProperty(orgTypeKey)) {
            orgTypes[orgTypeKey] = Object.assign(
              {},
              ORG_TYPES[orgTypeKey],
              { value: orgTypeKey }
            );
          }
        }
      });
    });
  });

  return {
    acceptedItems: acceptedItems,
    orgTypes: orgTypes
  };
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

  const dataFilters = parseFiltersFromData(data);
  filters.acceptItems = translatedFilterItems(dataFilters.acceptedItems);
  filters.orgTypes = translatedFilterItems(dataFilters.orgTypes);

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

  for (const orgType of Object.keys(filters.orgTypes)) {
    if (filters.orgTypes[orgType].isSet) {
      applied.orgTypes = applied.orgTypes || {};
      applied.orgTypes[orgType] = true;
    }
  }
}

function createFilterElements(data, filters) {
  const acceptedItems = [];

  for (const item of Object.keys(filters.acceptItems)) {
    const itemFilter = filters.acceptItems[item];
    acceptedItems.push({
      value: itemFilter.value,
      text: itemFilter.name,
      selected: itemFilter.isSet
    });
  }

  const ppeNeededSelect = new Selectr('#ppe-needed-select', {
    customClass: 'ftm-select',
    data: acceptedItems,
    multiple: true,
    searchable: false,
    placeholder: $.i18n('ftm-ppe-needed')
  });

  ppeNeededSelect.on('selectr.select', (option) => {
    onFilterChange(data, 'acceptItems', option.idx, true, filters);
    sendEvent('filters', 'acceptItems', option.value);
  });

  ppeNeededSelect.on('selectr.deselect', (option) => {
    onFilterChange(data, 'acceptItems', option.idx, false, filters);
  });

  const facilityTypes = [];

  for (const item of Object.keys(filters.orgTypes)) {
    const orgType = filters.orgTypes[item];
    facilityTypes.push({
      value: orgType.value,
      text: orgType.name,
      selected: orgType.isSet
    });
  }

  if (facilityTypes.length > 0) {
    const facilityTypeSelect = new Selectr('#facility-type-select', {
      customClass: 'ftm-select',
      data: facilityTypes,
      multiple: true,
      searchable: false,
      placeholder: $.i18n('ftm-facility-type')
    });

    facilityTypeSelect.on('selectr.select', (option) => {
      onFilterChange(data, 'orgTypes', option.idx, true, filters);
      sendEvent('filters', 'orgTypes', option.value);
    });

    facilityTypeSelect.on('selectr.deselect', (option) => {
      onFilterChange(data, 'orgTypes', option.idx, false, filters);
    });
  } else {
    $('#facility-type-select').parent().remove();
  }
}

// Turns a string with embedded \n characters into an Array of text nodes separated by <br>
function multilineStringToNodes(input) {
  const textNodes = input.split('\n').map((s) => ctn(s));
  let returnedNodes = [];
  textNodes.forEach((e) => {
    returnedNodes.push(e);
    returnedNodes.push(document.createElement('br'));
  });
  return returnedNodes.slice(0,-1);
}

// Return filtered data, sorted by location, in a flat list
// (flattened so it's easy to present only a piece of the list at a time)
function getFlatFilteredEntries(data, filters) {
  const entries = [];
  const applied = filters.applied || {};
  const filterAcceptKeys = applied.acceptItems && Object.keys(applied.acceptItems);
  const filterOrgTypeKeys = applied.orgTypes && Object.keys(applied.orgTypes);
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

        if (filterOrgTypeKeys) {
          const acc = (entry.org_type || "").toLowerCase();
          if (!filterOrgTypeKeys.some(s => acc === s)) {
            return;
          }
        }

        if (entry.marker) {
          const mapBounds = map.getBounds();

          if (mapBounds && !mapBounds.contains(entry.marker.getPosition())) {
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

const getCountryDataUrl = (countryDataFilename) => {
  return `https://findthemasks.com/${countryDataFilename}`
};

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
        getCountryDataUrl(getCountryDataFilename(code)),
        (result) => {
          const otherData = countryData[code] = toDataByLocation(result);

          // opacity value matches what's in css for the .secondarycluster class -
          // can set a css class for the clusters, but not for individual pins.
          otherMarkers.push(...getMarkers(otherData, {}, null, secondaryMarkerOptions).outOfFilters);
          updateClusters(null, secondaryCluster);
        }
      );
    }
  }
}

$(function () {
  const url = new URL(window.location);

  const renderListings = function (result) {
    const data = countryData[currentCountry] = toDataByLocation(result);
    const searchParams = new URLSearchParams(url.search);
    const showList = searchParams.get('hide-list') !== 'true';
    const showFilters = showList && searchParams.get('hide-filters') !== 'true';
    const showMap = searchParams.get('hide-map') !== 'true';

    const $map = $('#map');
    // Second, allow an override from ?hide-search=[bool].
    if (searchParams.get('hide-search') !== null) {
      showMapSearch = searchParams.get('hide-search') !== 'true';
    }

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
      $map.show();
      loadMapScript(searchParams, data, filters);
    }

    $('.locations-loading').hide();

    if (showList) {
      $('.locations-container').show();

      if (showFilters) {
        createFilterElements(data, filters);
        $(".filters-container").show();
      }

      refreshList(data, filters);
    }
  };

  $.getJSON(getCountryDataUrl(getCountryDataFilename(currentCountry)), function (result) {
    if(window.i18nReady) {
      renderListings(result);
    } else {
      $('html').on('i18n:ready', function() {
        renderListings(result);
      });
    }
  });

  const footerHeight = 40;  // small buffer near bottom of window
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
    children.push(getEntryEl(entry));
    renderLocation += 1;
  });

  ac(el, children);
  lastLocationRendered = renderLocation - 1;
}

function getOneLineAddress(address) {
  return address.trim().replace(/\n/g, ", ");
}

function googleMapsUri(address) {
  return encodeURI(`https://www.google.com/maps/search/?api=1&query=${address}`);
}

function getEntryEl(entry) {
  if (!entry.domElem) {
    entry.domElem = ce('div', 'location py-3');
    const header = ce('div', 'd-flex');
    const headerHospitalInfo = ce('div', 'flex-grow-1');
    const headerOrgType = ce('div', 'flex-grow-1 d-flex justify-content-end text-pink');
    ac(headerHospitalInfo, ce('h5', null, ctn(entry.name)));

    if (entry.org_type && entry.org_type.length) {
      ac(headerOrgType, [
        ce('p', null, ctn(translateEnumValue(entry.org_type)))
      ]);
    }

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
      ac(link, ctn(address));

      ac(headerHospitalInfo, para);
    }

    ac(header, headerHospitalInfo);
    ac(header, headerOrgType);
    ac(entry.domElem, header);

    if (entry.accepting) {
      const ppeNeededContainer = ce('div', 'row');

      ac(ppeNeededContainer, [
        ce('label', 'col-12 col-md-3 font-weight-bold', ctn($.i18n('ftm-ppe-needed'))),
        ce('p', 'col-12 col-md-9', ctn(translateEnumList(entry.accepting)))
      ]);

      ac(entry.domElem, ppeNeededContainer);
    }

    if (entry.open_box) {
      const openPackagesContainer = ce('div', 'row');

      ac(openPackagesContainer, [
        ce('label', 'col-12 col-md-3 font-weight-bold', ctn($.i18n('ftm-open-packages'))),
        ce('p', 'col-12 col-md-9', ctn(translateEnumValue(entry.open_box)))
      ]);

      ac(entry.domElem, openPackagesContainer);
    }

    if (entry.instructions) {
      const instructionsContainer = ce('div', 'row');

      ac(instructionsContainer, [
        ce('label', 'col-12 col-md-3 font-weight-bold', ctn($.i18n('ftm-instructions'))),
        linkifyElement(ce('p', 'col-12 col-md-9', multilineStringToNodes(entry.instructions)))
      ]);

      ac(entry.domElem, instructionsContainer);
    }
  }

  return entry.domElem; // TODO: generate this here.
}

function onFilterChange(data, prefix, idx, selected, filters) {
  const filter = filters[prefix] && filters[prefix][Object.keys(filters[prefix])[idx]];
  if (!filter) {
    return;
  }

  if (selected) {
    filter.isSet = true;
  } else {
    filter.isSet = false;
  }

  updateFilters(filters);
  refreshList(data, filters);
  showMarkers(data, filters, false);
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

let currentViewportCenter = {};

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

  google.maps.event.addListener(map, 'bounds_changed', () => {
    const mapBounds = map.getBounds();

    if (mapBounds && currentViewportCenter) {
      const currentLat = mapBounds.getCenter().lat();
      const currentLng = mapBounds.getCenter().lng();

      if (currentLat !== currentViewportCenter.lat || currentLng !== currentViewportCenter.lng) {
        refreshList(data, filters);
      }

      currentViewportCenter = {
        lat: currentLat,
        lng: currentLng
      }
    }
  });

  const mapBounds = map.getBounds();

  if (mapBounds) {
    const mapCenter = mapBounds.getCenter();
    currentViewportCenter = {
      lat: mapCenter.lat(),
      lng: mapCenter.lng()
    };
  }

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

  // initialize map search with query param `q` if it's set
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const q = searchParams.get('q');
  if (q) {
    $search.val(q);
    attemptGeocode(q);
  }

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
      }
    } else {
      sendEvent("map","search", $search.val());
      attemptGeocode($search.val());
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

function attemptGeocode(searchText) {
  // Attempt a geocode of the direct user input instead.
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: searchText }, (results, status) => {
    // Ensure we got a valid response with an array of at least one result.
    if (status === 'OK' && Array.isArray(results) && results.length > 0) {
      let viewport = results[0].geometry.viewport;
      fitMapToMarkersNearBounds(viewport);
    } else {
      sendEvent("map","geocode-fail", searchText);
    }
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
      const bounds = new google.maps.LatLngBounds();
      const latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      bounds.extend(latlng);

      fitMapToMarkersNearBounds(bounds);
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

  const markersByDistance = getMarkersByDistanceFrom(center.lat(), center.lng(), 3);

  // extend bounds to fit closest three markers
  markersByDistance.forEach((marker) => {
    bounds.extend(marker.position);
  });

  if (!bounds.getNorthEast().equals(bounds.getSouthWest())) {
    // zoom to fit user loc + nearest markers
    map.fitBounds(bounds);
  } else {
    // just has user loc - shift view without zooming
    map.setCenter(center);
  }
}

/**
 * Returns a list of markers sorted by distance from an arbitrary set of lat/lng coords.
 */
function getMarkersByDistanceFrom(latitude, longitude, n=3) {
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
  return distances.slice(0, n).map((distance) => markerDistances.get(distance));
}

/********************************
 * END MAP SEARCH FUNCTIONALITY *
 ********************************/

function getMarkers(data, appliedFilters, bounds, markerOptions) {
  const filterAcceptKeys = appliedFilters.acceptItems && Object.keys(appliedFilters.acceptItems);
  const filterOrgTypeKeys = appliedFilters.orgTypes && Object.keys(appliedFilters.orgTypes);
  const hasStateFilter = !!appliedFilters.states;

  const inFiltersMarkers = [];
  const outOfFiltersMarkers = [];

  for (const stateName of Object.keys(data)) {
    const inStateFilter = appliedFilters.states && appliedFilters.states[stateName];

    const hasFilters = !!filterAcceptKeys || !!filterOrgTypeKeys || hasStateFilter;

    const state = data[stateName];
    const cities = state.cities;

    for (const cityName of Object.keys(cities)) {
      const city = cities[cityName];

      // Handle multiple entries at the same address. Example: 800 Commissioners Rd E London, ON N6A 5W9
      const entriesByAddress = city.entries.reduce((acc, curr) => {
        const latlong = `${curr.lat} ${curr.lng}`;
        if (latlong in acc) {
          console.log(`double at ${latlong}`)
          acc[latlong].push(curr);
        } else {
          acc[latlong] = [curr];
        }
        return acc;
      }, {})

      for (const entry of city.entries) {
        // filter out if not in state and state filter is applied
        // filter out if not in accept and accept filter is not applied
        // filter out if not in org type and org type filter is not applied]

        // add marker to primary if filters exist && marker matches
        // else add markers to secondary

        let secondaryFiltersApplied = false;

        let inAcceptFilter = true;
        if (filterAcceptKeys) {
          const acc = (entry.accepting || "").toLowerCase();
          if (!filterAcceptKeys.some(s => acc.includes(s))) {
            inAcceptFilter = false;
            secondaryFiltersApplied = true;
          }
        }

        let inOrgTypeFilter = true;

        if (filterOrgTypeKeys) {
          const orgTypeKey = (entry.org_type || "").toLowerCase();
          if (!filterOrgTypeKeys.includes(orgTypeKey)) {
            inOrgTypeFilter = false;
            secondaryFiltersApplied = true;
          }
        }

        const inSecondaryFilter = inAcceptFilter && inOrgTypeFilter;
        // state or secondary filter applied
        const filteredEntry = (hasStateFilter && !inStateFilter) || secondaryFiltersApplied;

        let marker = entry.marker;

        if (marker) {
          if (!inSecondaryFilter) {
            marker.setMap(null);
            marker = null;
          }
        } else if (inSecondaryFilter) {
          const lat = Number(entry.lat);
          const lng = Number(entry.lng);

          // Guard against non-geocoded entries. Assuming no location exactly on the equator or prime meridian
          if (lat && lng) {
            const otherRequesters = entriesByAddress[`${lat} ${lng}`].filter(e => e.name !== entry.name);
            marker = entry.marker = createMarker(
              lat,
              lng,
              entry.org_type,
              entry.address,
              entry.name,
              entry.instructions,
              entry.accepting,
              entry.open_box,
              markerOptions,
              otherRequesters
            );
          }
        }

        if (marker) {
          if (hasFilters && !filteredEntry) {
            inFiltersMarkers.push(marker);

            if (hasStateFilter) {
              bounds && bounds.extend(marker.position);
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
    outOfFilters: outOfFiltersMarkers
  };
}

/**
 * Changes the markers currently rendered on the map based strictly on . This will reset the 'markers' module variable as well.
 */
function showMarkers(data, filters, recenterMap=true) {
  if (!map || !primaryCluster) {
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  const applied = filters.applied || {};
  const hasFilters = applied.states || applied.acceptItems || applied.orgTypes;

  const markers = getMarkers(data, applied, hasFilters && bounds);

  if (applied.states || applied.acceptItems || applied.orgTypes) {
    primaryMarkers = markers.inFilters;
    secondaryMarkers = markers.outOfFilters;
  } else {
    primaryMarkers = markers.outOfFilters;
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
  updateStats($mapStats, markers.inFilters.length + markers.outOfFilters.length);

  // HACK. On some browsers, the markercluster freaks out if it gets a bunch of new markers
  // immediately followed by a map view change. Making the view change async works around
  // this bug.
  if (recenterMap) {
    setTimeout(() => {
      centerMapToBounds(map, bounds, 9);
    }, 0);
  }
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
  ca: { zoom: 4, center: { lat: 57.130366, lng: -99.346771 }},
  ch: { zoom: 7, center: { lat: 46.818188, lng: 8.227512 }},
  de: { zoom: 5, center: { lat: 51.165691, lng: 10.451526 }},
  es: { zoom: 5, center: { lat: 40.163667, lng:	-3.74922 }},
  fr: { zoom: 5, center: { lat: 46.227638, lng: 2.213749 }},
  gb: { zoom: 5, center: { lat: 55.378051, lng: -3.435973 }},
  in: { zoom: 5, center: { lat: 20.593684, lng: 78.96288 }},
  it: { zoom: 5, center: { lat: 41.87194, lng: 12.56738 }},
  pl: { zoom: 5, center: { lat: 51.919438, lng: 19.145136 }},
  pt: { zoom: 6, center: { lat: 39.399872, lng: -8.224454 }},
  us: { zoom: 4, center: { lat: 37.09024, lng: -95.712891 }},
};

function getMapInitialView() {
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const coords = searchParams.get('coords');
  // default zoom is pretty tight because if you're passing latlng
  // you are probably trying to center on a pretty specific location
  const zoom = parseFloat(searchParams.get('zoom')) || 11;
  if (coords) {
    const latlng = coords.split(',').map(coord => parseFloat(coord));
    if ( // validate lat lng
        latlng.length === 2 &&
        latlng[0] >= -85 &&
        latlng[0] <= 85 &&
        latlng[1] >= -180 &&
        latlng[1] <= 180
      ) {
      return {
        zoom: zoom,
        center: {
          lat: latlng[0],
          lng: latlng[1]
        }
      }
    };
  }
  return MAP_INITIAL_VIEW[getCountry()];

}


function centerMapToBounds(map, bounds, maxZoom) {
  if (bounds.isEmpty()) {
    const params = getMapInitialView();
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

const translateEnumValue = (value) => {
  if (value) {
    const enumValue = ENUM_MAPPINGS[value.toLowerCase()];

    if (enumValue) {
      return $.i18n(enumValue.name);
    }
  }

  return value;
};

const translateEnumList = (enumListString) => {
  if (enumListString) {
    // split on commas, unless the comma is in a parenthesis
    return enumListString.split(/, (?![^(]*\))/).map((stringValue) => (
      translateEnumValue(stringValue && stringValue.trim())
    )).join(', ')
  }

  return enumListString;
};

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

function createMarker(latitude, longitude, orgType, address, name, instructions, accepting, open_accepted, markerOptions, otherRequesters) {
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
      const contentTags = [ce('h5', null, ctn(name))];

      if (orgType && orgType.length) {
        contentTags.push(
          ce('div', 'label', ctn($.i18n('ftm-maps-marker-org-type-label'))),
          ce('div', 'value', ctn(translateEnumValue(orgType)))
        );
      }

      contentTags.push(
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-address-label'))),
        ce('div', 'value', createMapLink(address)),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-instructions-label'))),
        linkifyElement(ce('div', 'value', multilineStringToNodes(instructions))),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-accepting-label'))),
        ce('div', 'value', ctn(translateEnumList(accepting))),
        ce('div', 'label', ctn($.i18n('ftm-maps-marker-open-packages-label'))),
        ce('div', 'value', ctn(translateEnumValue(open_accepted)))
      );

      if (otherRequesters && otherRequesters.length > 0) {
        otherRequesters.forEach(e => {
          contentTags.push(ce('h5', 'separator', ctn(e.name)));
          if (e.org_type && e.org_type.length) {
            contentTags.push(
              ce('div', 'label', ctn($.i18n('ftm-maps-marker-org-type-label'))),
              ce('div', 'value', ctn(translateEnumValue(e.org_type)))
            );
          }

          contentTags.push(
            ce('div', 'label', ctn($.i18n('ftm-maps-marker-address-label'))),
            ce('div', 'value', createMapLink(e.address)),
            ce('div', 'label', ctn($.i18n('ftm-maps-marker-instructions-label'))),
            linkifyElement(ce('div', 'value', multilineStringToNodes(e.instructions))),
            ce('div', 'label', ctn($.i18n('ftm-maps-marker-accepting-label'))),
            ce('div', 'value', ctn(translateEnumList(e.accepting))),
            ce('div', 'label', ctn($.i18n('ftm-maps-marker-open-packages-label'))),
            ce('div', 'value', ctn(translateEnumValue(e.open_box)))
          );
        })
      }

      const content = ce('div', null, contentTags);

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
 */
function updateStats($elem, count) {
  const prettyMarkerCount = number_format(count, 0);

  $elem.html($.i18n('ftm-requesters-count', prettyMarkerCount));
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
function number_format(number, decimal_places, dec_separator, thou_separator) {
  // Init defaults.
  if (typeof decimal_places === 'undefined') decimal_places = 0;
  if (typeof dec_separator === 'undefined') dec_separator = '.';
  if (typeof thou_separator === 'undefined') thou_separator = ',';

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
  if (thou_separator != '' && f[0].length > 3) {
    let h = f[0];
    f[0] = '';
    for (let j = 3; j < h.length; j += 3) {
      let i = h.slice(h.length - j, h.length - j + 3);
      f[0] = thou_separator + i + f[0] + '';
    }
    let j = h.substr(0, (h.length % 3 == 0) ? 3 : (h.length % 3));
    f[0] = j + f[0];
  }
  dec_separator = (decimal_places <= 0) ? '' : dec_separator;
  return f[0] + dec_separator + f[1];
}
