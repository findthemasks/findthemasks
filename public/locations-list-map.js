import toDataByLocation from './toDataByLocation.js';



// TODO (patricknelson): The indentation in this file is not consistent and should be updated soon. Currently the project
//  standard is 2-space indentation; please see .editorconfig and, if possible, configure your IDE to utilize this file.

// TODO (patricknelson): All functions interacting with the map should not require the map as a parameter since this
//  will not change in the near future and is a module level variable already. Causes too much repeated code.

// TODO (patricknelson: Proposal to change functions responsible for recentering the map, using either generic lat/lng
//  coordinates as only dependency instead of taking map, bounds, etc as inputs. See full details below.



/******************************************
 * MODULE VARS AVAILABLE TO ALL FUNCTIONS *
 ******************************************/

// Map, markers and map associated UI components are initialized in initMap().
let autocomplete;
let map = null;
let markers = [];

// Configuration defined in query string. Initialized in jQuery DOM ready function.
// TODO (patnelson): This should be extended with every other option as well.
let showMapSearch = true;

// The map, roughly zoomed to show the entire US.
const middle_of_us = { lat: 39.0567939, lng: -94.6065124};
const middle_of_us_zoom = 4;

// Centralized, as this the initialization state is now needed in multiple places. In the future, we may not always be
// centering just on the US (if no browser location is provided via navigator.geolocation).
let inital_center = middle_of_us,
  initial_zoom = middle_of_us_zoom,
  initial_marker_filters = null; // TODO (patnelson): Defined in map initialization function; this SHOULD happen jQuery DOM ready function instead.

// Keep track of the previous info windows user has clicked so we can close them.
let openInfoWindows = [];

/*************************
 * END MODULE LEVEL VARS *
 *************************/



function createFiltersListHTML() {
  const filters = [];
  filters.push(`<h4>${$.i18n('ftm-states')}</h4>`);
  for (const state of Object.keys(data_by_location).sort()) {
    filters.push(`
      <div>
        <input
          id="state-${state}"
          type="checkbox"
          name="states"
          value="${state}"
          onchange="onFilterChange(this, true)"
          />
        <label
          id="state-${state}-label"
          for="state-${state}"
          >
          ${state}
        </label>
      </div>
    `);
  }

  const acceptedItemsFilter = {
    'n95s': $.i18n('ftm-item-n95s'),
    'masks': $.i18n('ftm-item-masks'),
    'shields': $.i18n('ftm-item-face-shields'),
    'booties': $.i18n('ftm-item-booties'),
    'goggles': $.i18n('ftm-item-goggles'),
    'gloves': $.i18n('ftm-item-gloves'),
    'kleenex': $.i18n('ftm-item-kleenex'),
    'sanitizer': $.i18n('ftm-item-sanitizer'),
    'overalls': $.i18n('ftm-item-overalls'),
    'gowns': $.i18n('ftm-item-gowns'),
    'respirators': $.i18n('ftm-item-respirators'),
  };

  filters.push(`<h4>${$.i18n('ftm-accepted-items')}</h4>`);
  for (const val of Object.keys(acceptedItemsFilter)) {
    const id = val;
    const descr = acceptedItemsFilter[val];
    filters.push(`
      <div>
        <input
          id="accept-item-${id}"
          type="checkbox"
          name="accept-item"
          value="${val}"
          onchange="onFilterChange(this, true)"
          />
        <label
          id="accept-item-${id}-label"
          for="accept-item-${id}"
          >
          ${descr}
        </label>
      </div>
    `);
  }

  return filters;
}

function createContent(data, showList, showMap) {
  function ce(elementName, className, child) {
    const el = document.createElement(elementName);
    className && (el.className = className);
    child && el.appendChild(child);
    return el;
  }

  function ctn(text) {
    return document.createTextNode(text);
  }

  for (const stateName of Object.keys(data)) {
    const state = data[stateName];

    if (showList) {
      state.domElem = $(ce('div', 'state', ce('h2', null, ctn(stateName))));
      state.containerElem = $(ce('div'));
      state.domElem.append(state.containerElem);
    }

    const cities = state.cities;
    for (const cityName of Object.keys(cities)) {
      const city = cities[cityName];

      if (showList) {
        city.domElem = $(ce('div', 'city', ce('h3', null, ctn(cityName))));
        city.containerElem = $(ce('div'));
        city.domElem.append(city.containerElem);
      }

      // Array.prototype.sort sorts in-place, so only need to do it once per city
      for (const entry of city.entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (showList) {
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

        if (showMap) {
          const lat = Number(entry.lat);
          const lng = Number(entry.lng);

          if (!isNaN(lat)) {
            entry.marker = addMarkerToMap(null, lat, lng, entry.address, entry.name, entry.instructions, entry.accepting, entry.open_box);
          }
        }
      }
    }
  }
}

function getFilteredContent(data, filters) {
  const content = [];
  const filterAcceptKeys = filters && filters.acceptItems && Object.keys(filters.acceptItems);

  let listCount = 0; // TODO: hacky, see note below.

  for (const stateName of Object.keys(data).sort()) {
    if (filters && filters.states && !filters.states[stateName]) {
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

$(function() {
  const url = new URL(window.location);
  const directories = url.pathname.split("/");

  let country = 'us';
  let countryDataFilename;

  // TODO: super brittle
  if (directories.length > 2 && directories[1] !== 'us') {
    country = directories[1];
    countryDataFilename = `data-${country}.json`;
  } else {
    countryDataFilename = 'data.json';
  }

  const donationSiteForms = document.getElementsByClassName("add-donation-site-form");


  for (let i = 0; i < donationSiteForms.length; i++) {
    donationSiteForms[i].setAttribute('href', `/${country}/donation-form`);
  }

  $.getJSON(`https://findthemasks.com/${countryDataFilename}`, function(result){
    // may end up using this for search / filtering...
    window.locations = result;
    window.data_by_location = toDataByLocation(locations);

    // TODO (patnelson): IMHO, every single one of these show/hide settings configured by query string should be elevated
    //  to the module-level scope for reference.
    const searchParams = new URLSearchParams(url.search);
    const stateParams = searchParams.getAll('state').map(state => state.toUpperCase());
    const states = stateParams.map(param => param.split(',')).reduce((acc, val) => acc.concat(val), []);
    const showList = searchParams.get('hide-list') !== 'true';
    const showMap = searchParams.get('hide-map') !== 'true';
    showMapSearch = searchParams.get('hide-search') !== 'true';

    createContent(window.data_by_location, showList, showMap);

    const stateFilter = {};
    states.forEach(stateName => {
      if (data_by_location[stateName]) {
        stateFilter[stateName] = true;
      }
    });

    if (showMap) {
      initMap(stateFilter);
    }

    $('.locations-loading').hide();

    if (showList) {
      $(".filters-list").html(createFiltersListHTML(data_by_location).join(" "));
      $('.locations-container').show();

      $(".locations-list").empty().append(getFilteredContent(data_by_location));

      // show filters unless hide-filters="true"
      if (!searchParams.get('hide-filters') || searchParams.get('hide-filters') !== 'true') {
        $(".filters-container").show();
      }

      Object.keys(stateFilter).forEach(state => {
        const elem = document.getElementById(`state-${ state }`);
        elem.checked = true;
        onFilterChange(elem, false);
      });
    }
  });
});

window.onFilterChange = function (elem, scrollNeeded) {
  // This is a hacky approach to programatically highlighting selected items as
  // it uses hard-coded ID references. We use this approach for now for
  // simplicity, speed of implementation and performance, but it should ideally
  // be replaced with a more robust solution if time allows and performance
  // isn't affected.
  let label = $("#" + elem.id + "-label");
  if (elem.checked) {
    label.addClass("selected");
  } else {
    label.removeClass("selected");
  }

  let states = null;
  document.filters['states'].forEach((state) => {
    if (state.checked) {
      states = states || {};
      states[state.value] = true;
    }
  });

  let acceptItems = null;
  document.filters['accept-item'].forEach((acceptItem) => {
    if (acceptItem.checked) {
      acceptItems = acceptItems || {};
      acceptItems[acceptItem.value] = true;
    }
  });

  const filters = { states, acceptItems };
  const locationsList = $(".locations-list");
  const mapContainer = $(".map-container");

  locationsList.empty().append(getFilteredContent(data_by_location, filters));
  showMarkers(data_by_location, filters, false);

  if (scrollNeeded) {
    mapContainer[0].scrollIntoView({'behavior': 'smooth'});
  }
};

// Polyfill required for Edge for the .forEach methods above, since this method doesn't exist in that browser.
if (window.HTMLCollection && !HTMLCollection.prototype.forEach) {
  HTMLCollection.prototype.forEach = Array.prototype.forEach;
}

// TODO (patricknelson): The initMap() function should ONLY be responsible for initializing the map. Additional modifications
//  to map must instead be performed AFTER initialization, either via module-level state that is maintained (e.g. markers,
//  filters, etc) or via a callback function that can be executed to proceed with further updates once initialization has
//  been completed. This means that the "stateFilter" should be removed from here and potentially changed to a callback instead.
function initMap(stateFilter) {
  var data_by_location = window.data_by_location;

  var element = document.getElementById('map');

  if (element == null) {
    alert('could not find map div');
  }

  $(".map-container").show();

  const states = Object.keys(stateFilter);
  if (!states.length) {
    stateFilter = null;
  }

  map = new google.maps.Map(element);

  showMarkers(data_by_location, { states: stateFilter }, !stateFilter);

  // TODO (patricknelson): This showMarkers call above has to be duplicated due to crossing of concerns of this function
  //   (init map vs. initial map state). See resetMap() function. Also, ideally the initialization of filters would happen
  //  OUTSIDE of this method. Also, to reduce merge conflicts, the initialization of the "initial_marker_filters" is
  //  defined here for now, but ideally it would instead be defined in jQuery DOM ready function instead.
  initial_marker_filters = { states: stateFilter };

  // Initialize autosuggest/search field above the map.
  initMapSearch();
}



/**********************************
 * BEGIN MAP SEARCH FUNCTIONALITY *
 **********************************/

/**
 * Responsible for initializing the search field and links below the search field (e.g. use location, reset map, etc).
 */
function initMapSearch() {
  // If disabled, hide the search fields and don't bother attaching any functionality to them.
  if (!showMapSearch) {
    $('.map-search-wrap').hide();
    return;
  }

  // Initialize the map search autocompleter.
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('map-search'), {types: ['geocode']}
  );

  // Avoid paying for data that you don't need by restricting the set of
  // place fields that are returned to just the address components.
  autocomplete.setFields(['geometry']);

  // When the user selects an address from the drop-down, populate the
  // address fields in the form.
  autocomplete.addListener('place_changed', loadSearchInMap);

  // Setup event listeners for map action links.
  $('#use-location').on('click', (e) => {
    e.preventDefault();
    centerMapToMarkersNearUser();
  });

  $('#reset-map').on('click', (e) => {
    e.preventDefault();
    resetMap();
  });
}



/**
 * Strictly responsible for resetting the map to it's initial state on page load WITHOUT user's location (since we have
 * a link to link to go back to that appearance).
 */
function resetMap() {
  // TODO THIS SHOULD HAVE TWO FUNCTION CALLS INSTEAD OF ONE:
  //  1.) Show initial markers based on initial filters (e.g. which state[s]?)
  //  2.) Reposition map (e.g. initial state?)
  //  However, repositioning is ALSO happening deep inside showMarkers() function which has made itself responsible for
  //  too many tasks.
  showMarkers(window.data_by_location, initial_marker_filters, !initial_marker_filters);
}



/**
 * Takes the form input and attempts to pull geocoded information from it. Once done, centers map on closest markers nearby.
 */
function loadSearchInMap() {
  if (!autocomplete) {
    console.error('autocomplete is not yet defined.');
    return;
  }

  let place = autocomplete.getPlace();
  if (place.geometry) {
    // Get the location object that we can map.setCenter() on.
    let location = place.geometry.location;
    if (location) {
      centerMapToMarkersNearCoords(location.lat(), location.lng())

    } else {
      console.warn('Location data not found in place geometry (place.geometry.location).')
    }
  } else {
    console.warn('No geometry found, skipping place');
  }
}



/**
 * Centers map at automatically detected coordinates using built in navigator.geolocation API.
 */
function centerMapToMarkersNearUser() {
  // First check to see if the user will accept getting their location, if not, silently return
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      // Use navigator provided lat/long coords to center map now.
      centerMapToMarkersNearCoords(position.coords.latitude, position.coords.longitude);

    }, function (err) {
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
  for (const marker of markers) {
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
  for(let i = 0; i < 3; i++) {
    // Get one of the closest markers
    let distance = distances[i];
    let marker = markerDistances[distance];

    // Add to the iterator first just in case something fails later to avoid infinite loop
    i++;

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



/**
 * Changes the markers currently rendered on the map based strictly on . This will reset the 'markers' module variable as well.
 *
 * TODO (patricknelson): The param "data" is redundant and should be removed! Currently it only refers to the global "data_by_location".
 *
 * TODO (patricknelson): The param "showNearest" is used only once and is not relevant to the purpose of this method (showing specific markers only depending on filters).
 */
function showMarkers(data, filters, showNearest) {
  markers = [];

  if (!map) {
    return;
  }

  filters = filters || {};

  const bounds = new google.maps.LatLngBounds();
  const filterAcceptKeys = filters.acceptItems && Object.keys(filters.acceptItems);
  const hasFilters = filters.states || filters.acceptItems;

  for (const stateName of Object.keys(data)) {
    let inStateFilter = true;

    if (filters.states && !filters.states[stateName]) {
      inStateFilter = false;
    }

    const state = data[stateName];
    const cities = state.cities;

    for (const cityName of Object.keys(cities)) {
      const city = cities[cityName];

      for (const entry of city.entries) {
        let inAcceptFilter = true;
        if (inStateFilter && filterAcceptKeys) {
          const acc = (entry.accepting || "").toLowerCase();
          if (!filterAcceptKeys.some(s => acc.includes(s))) {
            inAcceptFilter = false;
          }
        }

        const marker = entry.marker;

        if (marker) {
          if (inStateFilter && inAcceptFilter) {
            markers.push(marker);
            marker.setMap(map);
            hasFilters && bounds.extend(marker.position);
          } else {
            marker.setMap(null);
          }
        }
      }
    }
  }

  let $mapStats = $('#map-stats');
  updateStats($mapStats, markers.length);

  // TODO: See notes above; this function should NOT be responsible for positioning the map.

  if (showNearest) {
    centerMapToNearestMarkers(map, markers, bounds);
  } else {
    centerMapToBounds(map, bounds, 9)
  }
}
window.showMarkers = showMarkers; // Exposed for debug/testing.



// TODO (patricknelson): I propose completely scrapping this function in favor of centerMapToMarkersNearCoords() for simplicity.

function centerMapToBounds(map, bounds, maxZoom) {
  if (bounds.isEmpty()) {
    // Default view if no specific bounds
    map.setCenter(inital_center);
    map.setZoom(initial_zoom);
  } else {
    map.fitBounds(bounds);
    // Prevent zooming in too far if only one or two locations determine the bounds
    if (maxZoom && map.getZoom() > maxZoom) {
      map.setZoom(maxZoom);
    }
  }
}

// TODO (patricknelson: The code inside the .getCurrentPosition() is now DUPLICATED in centerMapToMarkersNearUser() AND centerMapToMarkersNearCoords()
//  This is to prevent conflicts. I propose we completely scrap this function because
//  1.) It is not properly named, since it's purpose is to center map on the USER coordinates (an API that isn't always available due to permissions)
//  2.) It does too much; it centers map on user AND it automatically calculates bounds on nearby markers. However, that
//      can be abstracted to normalized plain lat/lng coordinates instead.
//  Therefore, I propose we completely replace this with a simple function call to centerMapToMarkersNearUser().

function centerMapToNearestMarkers(map, markers, fallbackBounds) {
  // First check to see if the user will accept getting their location, if not, silently return
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var user_latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

        //Compute the distances of all markers from the user
        var markerDistances = new Map(); // an associative array containing the marker referenced by the computed distance
        var distances = []; // all the distances, so we can sort and then call markerDistances
        for (const marker of markers) {
          var distance = google.maps.geometry.spherical.computeDistanceBetween(marker.position, user_latlng);

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
        bounds.extend(user_latlng);

        // Extend the bounds to contain the three closest markers
        let i = 0;
        while (i < 3) {
          // Get one of the closest markers
          var distance = distances[i]
          var marker = markerDistances[distance];

          // Add to the iterator first just in case something fails later to avoid infinite loop
          i++;

          bounds.extend(marker.position);
        }
        centerMapToBounds(map, bounds);
      },
      function () {
        centerMapToBounds(map, fallbackBounds);

        // Hide the "User my location" link since we know that will not work.
        $('#use-location').hide();
      }
    );
  } else {
    centerMapToBounds(map, fallbackBounds);
  }
}



function addMarkerToMap(map, latitude, longitude, address, name, instructions, accepting, open_accepted) {
    // Text to go into InfoWindow
    var contentString =
        '<h5>' + name + '</h5>' +
        `<div class="label">${$.i18n('ftm-maps-marker-address-label')}</div><div class=value>` + address + '</div>' +
        `<div class="label">${$.i18n('ftm-maps-marker-instructions-label')}</div><div class=value>` + linkifyHtml(instructions) + '</div>' +
        `<div class="label">${$.i18n('ftm-maps-marker-accepting-label')}</div><div class=value>` + accepting + '</div>' +
        `<div class="label">${$.i18n('ftm-maps-marker-open-packages-label')}</div><div class=value>` + open_accepted + '</div>';

    var location = { lat: latitude, lng: longitude };
    var marker = new google.maps.Marker({
        position: location,
        title: name,
        map: map
    });
    // InfoWindow will pop up when user clicks on marker
    marker.infowindow = new google.maps.InfoWindow({
      content: contentString
    });
    marker.addListener('click', function() {
      openInfoWindows.forEach(infowindow => infowindow.close());
      openInfoWindows = [];
      marker.infowindow.open(map, marker);
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
    for (let i=f[1].length + 1; i <= decimal_places; i++) {
      g += '0';
    }
    f[1] = g;
  }
  if(thou_seperator != '' && f[0].length > 3) {
    let h = f[0];
    f[0] = '';
    for(let j = 3; j < h.length; j+=3) {
      let i = h.slice(h.length - j, h.length - j + 3);
      f[0] = thou_seperator + i +  f[0] + '';
    }
    let j = h.substr(0, (h.length % 3 == 0) ? 3 : (h.length % 3));
    f[0] = j + f[0];
  }
  dec_seperator = (decimal_places <= 0) ? '' : dec_seperator;
  return f[0] + dec_seperator + f[1];
}

