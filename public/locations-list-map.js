import toDataByLocation from './toDataByLocation.js';

// TODO: The indentation in this file is not consistent and should be updated soon. Currently the project standard is
//  2-space indentation; please see .editorconfig and, if possible, configure your IDE to utilize this file.


/******************************************
 * MODULE VARS AVAILABLE TO ALL FUNCTIONS *
 ******************************************/

// Initialized on page load, populated from query string. Defaults to all states if no valid states defined (or empty).
let showStates = [];

// Should autocomplete search field display on map load?
let hideSearch = false;

// Map, markers and map associated UI components are initialized in initMap().
let autocomplete;
let map = null;
let markers = [];

// The map, roughly zoomed to show the entire US.
const middle_of_us = { lat: 39.0567939, lng: -94.6065124};
const middle_of_us_zoom = 4;

// Centralized, as this the initialization state is now needed in multiple places. In the future, we may not always be
// centering just on the US (if no browser location is provided via navigator.geolocation).
let inital_center = middle_of_us,
  initial_zoom = middle_of_us_zoom;

// Keep track of the previous info windows user has clicked so we can close them.
let openInfoWindows = [];

// TODO: Move stateLocationMappings here.

/*************************
 * END MODULE LEVEL VARS *
 *************************/



function createFiltersListHTML() {
  $('.locations-container').show();

  // We use objects here as a quick approach to removing duplicates.

  const states = {};
  const acceptOpenFilters = {};

  for (const state of Object.keys(data_by_location).sort()) {
    states[state] = true;

    const cities = data_by_location[state];
    for (const city of Object.keys(cities).sort()) {
      for (const entry of cities[city]) {
        const v = entry["open_box"];
        acceptOpenFilters[toHTMLID(v)] = v;
      }
    }
  }

  const filters = [];
  filters.push(`<h4>${$.i18n('ftm-states')}</h4>`);
  for (const state of Object.keys(states)) {
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

//  filters.push(`<h3>${$.i18n('ftm-accepts-open-boxes')}</h3>`);
//  for (const id of Object.keys(acceptOpenFilters)) {
//    const val = acceptOpenFilters[id];
//    filters.push(`
//      <div>
//        <input
//          id="accept-open-${id}"
//          type="checkbox"
//          name="accept-open"
//          value="${id}"
//          onchange="onFilterChange(this)"
//          />
//        <label
//          id="accept-open-${id}-label"
//          for="accept-open-${id}"
//          >
//          ${val}
//        </label>
//      </div>
//    `);
//  }

  const acceptedItemsFilter = {
    'n95s': $.i18n('ftm-item-n95s'),
    'masks': $.i18n('ftm-item-masks'),
    'face shields': $.i18n('ftm-item-face-shields'),
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
    const id = toHTMLID(val);
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

function toHTMLID(name) {
  let s = '';
  for (let i = 0; i < name.length; i++) {
    let c = name.charAt(i);
    // We remove `.` from IDs because selection using jQuery failed when they
    // appeared in IDs. TODO This should be investigated further.
    if (c.match(/^[a-z0-9_:]+$/i)) {
      s += c;
    } else {
      s += '-';
    }
  }
  return s.toLowerCase();
}


function toHtmlSnippets(data_by_location, filters) {
  const lines = [];

  let listCount = 0; // TODO: hacky, see note below.

  for (const state of Object.keys(data_by_location).sort()) {
    if (filters && filters.states && !filters.states[state]) {
      continue;
    }

    const cityLines = [];

    const cities = data_by_location[state];
    for (const city of Object.keys(cities).sort()) {
      const entryLines = [];
      for (const entry of cities[city]) {
        const name = entry["name"];
        const address = entry["address"];
        const instructions = entry["instructions"];
        const accepting = entry["accepting"];
        const will_they_accept = entry["open_box"];

        if (filters) {
//          if (filters.acceptOpens && !filters.acceptOpens[toHTMLID(will_they_accept)]) {
//            continue;
//          }
          if (filters.acceptItems) {
            let acc = accepting.toLowerCase();
            if (!Object.keys(filters.acceptItems).some(s => acc.includes(s))) {
              continue;
            }
          }
        }

        listCount++;
        entryLines.push(`<div class=location>`)
        entryLines.push(`<h4 class="marginBottomZero">${name}</h4>`);

        entryLines.push(`<label>${$.i18n('ftm-address')}</label>`)
        entryLines.push(`<p class="marginTopZero medEmph">${address.replace(/\n/g,'<br>')}</p>`);

        if (instructions !== "") {
          entryLines.push(`<label>${$.i18n('ftm-instructions')}</label>`)
          entryLines.push(`<p>${instructions}</p>`);
        }
        if (accepting !== "") {
          entryLines.push(`<label>${$.i18n('ftm-accepting')}</label>`)
          entryLines.push(`<p>${accepting}</p>`);
        }
        if (will_they_accept !== "") {
          entryLines.push(`<label>${$.i18n('ftm-open-packages')}</label>`)
          entryLines.push(`<p>${will_they_accept}</p>`);
        }
        entryLines.push('</div>');
      }

      if (entryLines.length > 0) {
        cityLines.push(`<div class=city>`)
        cityLines.push(`<h3>${city}</h3>`);
        cityLines.push(entryLines.join('\n'));
        cityLines.push('</div>');
      }
    }

    if (cityLines.length > 0) {
      lines.push(`<div class=state>`);
      lines.push(`<h2>${state}</h2>`);
      lines.push(cityLines.join('\n'));
      lines.push('</div>');
    }

  }

  // TODO: This is hacky since technically this function should ONLY be responsible for generating HTML snippets,
  //  not updating stats; however this is the quickest method for updating filter stats as well.
  updateStats($('#list-stats'), listCount);


  return lines;
}

$(function() {
    $.getJSON("https://findthemasks.com/data.json", function(result){
    // may end up using this for search / filtering...
    window.locations = result;
    window.data_by_location = toDataByLocation(locations);

    const searchParams = new URLSearchParams((new URL(window.location)).search);
    const stateParams = searchParams.getAll('state').map(state => state.toUpperCase());
    showStates = stateParams.map(param => param.split(',')).reduce((acc, val) => acc.concat(val), []);

    // Toggle parameters (consolidated in one place).
    const hideList = searchParams.get('hide-list') && searchParams.get('hide-list') === 'true';
    const hideMap = searchParams.get('hide-map') && searchParams.get('hide-map') === 'true';
    hideSearch = searchParams.get('hide-search') && searchParams.get('hide-search') === 'true';


    // show map unless hide-map="true"
    if (!hideMap) {
      // Since we know map is going to render, immediately hide the search area now in case that's indicated.
      if (hideSearch) {
        $('.map-search-wrap').hide();
      }

      // Dynamically load maps KEY based on query param (for local development). Otherwise, use default.
      let mapsKey = searchParams.get('mapsKey') || 'AIzaSyDSz0lnzPJIFeWM7SpSARHmV-snwrAXd2s'; // Production

      // Dynamically append tag including the maps key. This way, using the callback we eliminate any possibility of
      // encountering a race condition where 'google' object is not defined.
      let s = document.createElement( 'script' );
      s.setAttribute( 'src', 'https://maps.googleapis.com/maps/api/js?key=' + mapsKey + '&libraries=geometry,places&callback=initMap');
      document.body.appendChild(s);
    }


    if (!hideList) {
      $(".filters-list").html(createFiltersListHTML(data_by_location).join(" "));

      const htmlSnippets = toHtmlSnippets(data_by_location, null);
      $(".locations-list").html(htmlSnippets.join(" "));

      // show filters unless hide-filters="true"
      if (!searchParams.get('hide-filters') || searchParams.get('hide-filters') !== 'true') {
        $(".filters-container").show();
      }

      showStates.forEach(state => {
        const elem = document.getElementById(`state-${state}`);
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
      if (states === null) {
        states = {};
      }
      states[state.value] = true;
    }
  });

//  let acceptOpens = null;
//  document.filters['accept-open'].forEach((acceptOpen) => {
//    if (acceptOpen.checked) {
//      if (acceptOpens === null) {
//        acceptOpens = {};
//      }
//      acceptOpens[acceptOpen.value] = true;
//    }
//  });

  let acceptItems = null;
  document.filters['accept-item'].forEach((acceptItem) => {
    if (acceptItem.checked) {
      if (acceptItems === null) {
        acceptItems = {};
      }
      acceptItems[acceptItem.value] = true;
    }
  });

  const filters = {states, acceptItems};
  const htmlSnippets = toHtmlSnippets(window.data_by_location, filters);
  const locationsListElement = document.getElementById('locations-list');
  locationsListElement.innerHTML = htmlSnippets.join(" ");
  if (scrollNeeded) {
    locationsListElement.scrollIntoView({'behavior': 'smooth'});
  }
};


// TODO: Please move to module level variables section (above) later once merged into master. Doing so right now creates
//  a diff too large to read easily during review. Maybe turn this into an imported module like toDataByLocation?
const stateLocationMappings = {
  "AK": { "lat": 63.588753, "lng": -154.493062, zoom: 3.5 },
  "AL": { "lat": 32.318231, "lng": -86.902298, zoom: 6 },
  "AR": { "lat": 35.20105, "lng": -91.831833, zoom: 6.5 },
  "AZ": { "lat": 34.048928, "lng": -111.093731, zoom: 6 },
  "CA": { "lat": 36.778261, "lng": -119.417932, zoom: 5.25 },
  "CO": { "lat": 39.550051, "lng": -105.782067, zoom: 6 },
  "CT": { "lat": 41.603221, "lng": -73.087749, zoom: 7.25 },
  "DC": { "lat": 38.905985, "lng": -77.033418, zoom: 11 },
  "DE": { "lat": 38.910832, "lng": -75.52767, zoom: 7.5 },
  "FL": { "lat": 27.664827, "lng": -81.515754, zoom: 6 },
  "GA": { "lat": 32.157435, "lng": -82.907123, zoom: 6 },
  "HI": { "lat": 19.898682, "lng": -155.665857, zoom: 6.5 },
  "IA": { "lat": 41.878003, "lng": -93.097702, zoom: 6 },
  "ID": { "lat": 44.068202, "lng": -114.742041, zoom: 5.25 },
  "IL": { "lat": 40.633125, "lng": -89.398528, zoom: 6 },
  "IN": { "lat": 40.551217, "lng": -85.602364, zoom: 6 },
  "KS": { "lat": 39.011902, "lng": -98.484246, zoom: 6.25 },
  "KY": { "lat": 37.839333, "lng": -84.270018, zoom: 6.5 },
  "LA": { "lat": 31.244823, "lng": -92.145024, zoom: 6.5 },
  "MA": { "lat": 42.407211, "lng": -71.382437, zoom: 7.75 },
  "MD": { "lat": 39.045755, "lng": -76.641271, zoom: 8 },
  "ME": { "lat": 45.253783, "lng": -69.445469, zoom: 6.4 },
  "MI": { "lat": 44.314844, "lng": -85.602364, zoom: 6.2 },
  "MN": { "lat": 46.729553, "lng": -94.6859, zoom: 5.75 },
  "MO": { "lat": 37.964253, "lng": -91.831833, zoom: 6.25 },
  "MS": { "lat": 32.354668, "lng": -89.398528, zoom: 6.4 },
  "MT": { "lat": 46.879682, "lng": -110.362566, zoom: 6 },
  "NC": { "lat": 35.759573, "lng": -79.0193, zoom: 6.5 },
  "ND": { "lat": 47.551493, "lng": -101.002012, zoom: 6.25 },
  "NE": { "lat": 41.492537, "lng": -99.901813, zoom: 6.5 },
  "NH": { "lat": 43.793852, "lng": -71.572395, zoom: 7 },
  "NJ": { "lat": 40.058324, "lng": -74.405661, zoom: 7.2 },
  "NM": { "lat": 34.99973, "lng": -105.032363, zoom: 6 },
  "NV": { "lat": 38.80261, "lng": -116.419389, zoom: 5.9 },
  "NY": { "lat": 43.199428, "lng": -74.217933, zoom: 6.2 },
  "OH": { "lat": 40.417287, "lng": -82.907123, zoom: 6.4 },
  "OK": { "lat": 35.007752, "lng": -97.092877, zoom: 6.5 },
  "OR": { "lat": 43.804133, "lng": -120.554201, zoom: 6.25 },
  "PA": { "lat": 41.203322, "lng": -77.194525, zoom: 6.5 },
  "PR": { "lat": 18.220833, "lng": -66.590149, zoom: 9 },
  "RI": { "lat": 41.680095, "lng": -71.477429, zoom: 9 },
  "SC": { "lat": 33.836081, "lng": -81.163725, zoom: 6.75 },
  "SD": { "lat": 43.969515, "lng": -99.901813, zoom: 6.25 },
  "TN": { "lat": 35.517491, "lng": -86.580447, zoom: 6.75 },
  "TX": { "lat": 31.968599, "lng": -99.901813, zoom: 5.3 },
  "UT": { "lat": 39.32098, "lng": -111.093731, zoom: 6.25 },
  "VA": { "lat": 37.931573, "lng": -78.656894, zoom: 6.5 },
  "VT": { "lat": 44.258803, "lng": -72.577841, zoom: 6.9 },
  "WA": { "lat": 47.751074, "lng": -120.740139, zoom: 6.4 },
  "WI": { "lat": 44.78444, "lng": -88.787868, zoom: 6.2 },
  "WV": { "lat": 38.897626, "lng": -80.454903, zoom: 6.75 },
  "WY": { "lat": 43.075968, "lng": -107.2902, zoom: 6.25 }
};



/**
 * Called once Google Maps API is fully loaded ready to run.
 *
 * IMPORTANT: This is exposed via window.initMap so the script can execute it.
 */
function initMap() {
     var data_by_location = window.data_by_location;

     var element = document.getElementById('map');

     if (element == null) {
       console.error('could not find map div');
       return; // if we can't find a map, we're in for a cascade of more bugs.
     }

    $(".map-container").show();

     const singleStateFilter = showStates && showStates.length === 1;
     let firstState = showStates[0] || '';
     firstState = firstState.toUpperCase();

     // The map, roughly zoomed to show the entire US.
     map = new google.maps.Map(element, {zoom: initial_zoom, center: inital_center});

     // filter states if there is a state filter
     const filteredStates = Object.keys(data_by_location).filter((stateCode) => (
       (
         singleStateFilter
         && firstState === stateCode.toUpperCase()
         && stateLocationMappings[stateCode.toUpperCase()]
         // add markers when no single state filter or if state code is invalid
       ) || (!singleStateFilter || !stateLocationMappings[firstState])
     ));

     for (const state of filteredStates.sort()) {
         const cities = data_by_location[state];

         for (const city of Object.keys(cities).sort()) {
             for (const entry of cities[city]) {
                 const name = entry["name"];
                 const address = entry["address"];
                 const latitude = entry["lat"];
                 const longitude = entry["lng"];
                 const instructions = entry["instructions"];
                 const accepting = entry["accepting"];
                 const open_accepted = entry["open_box"];
                 // Convert the lat and lng fields to numbers
                 if (!isNaN(Number(latitude))) {
                     var marker = addMarkerToMap(Number(latitude), Number(longitude),
                         address, name, instructions, accepting, open_accepted);
                     markers.push(marker);
                 }
             }
         }
     }

     let $mapStats = $('#map-stats');
     if (singleStateFilter) {
          // Center the map to a state if only one is set in query params.
          // Also, allow function to reset the initial coords/zoom globals.
          centerMapToState(firstState, true);

          // Update map stats (w/ selected state)
          updateStats($mapStats, markers.length, [firstState]);

     } else {
          // Center the map on the nearest markers to the user if possible
          centerMapToMarkersNearUser();

          // Update stats (no states).
          updateStats($mapStats, markers.length);
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
     $('#use-location').on('click', function (e) {
       e.preventDefault();
       centerMapToMarkersNearUser();
     });

     $('#reset-map').on('click', function (e) {
       e.preventDefault();
       map.setCenter(inital_center);
       map.setZoom(initial_zoom);
     });
}
window.initMap = initMap;



function centerMapToState(state, init) {
  const stateLocationMapping = stateLocationMappings[state.toUpperCase()];

  if (stateLocationMapping) {
    let stateCoords = { lat: stateLocationMapping.lat, lng: stateLocationMapping.lng },
        stateZoom = stateLocationMapping.zoom;

    // If this is an initialization (100% of the time at time of writing, trying to future proof) then also update our
    // initial settings in order to retain this for reset link.
    if (init) {
      inital_center = stateCoords;
      initial_zoom = stateZoom;
    }

    map.setCenter(stateCoords);
    // roughly zoom to focus on the state, hardcoded zooms to handle special case of Alaska
    map.setZoom(stateZoom);
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
  let i = 0;
  while (i < 3) {
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



function addMarkerToMap(latitude, longitude, address, name, instructions, accepting, open_accepted) {
    // Text to go into InfoWindow
    var contentString =
        '<h5>' + name + '</h5>' +
        '<div class=label>Address:</div><div class=value>' + address + '</div>' +
        '<div class=label>Instructions:</div><div class=value>' + instructions + '</div>' +
        '<div class=label>Accepting:</div><div class=value>' + accepting + '</div>' +
        '<div class=label>Open Packages?:</div><div class=value>' + open_accepted + '</div>';

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
