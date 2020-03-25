import toDataByLocation from './toDataByLocation.js';

function createFiltersListHTML() {
  $('.locations-container').show();

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

      for (const entry of city.entries) {
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
              ce('p', null, ctn(entry.instructions))
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

        // TODO: Create map marker here
      }
    }
  }
}

function getFilteredContent(data, filters) {
  const content = [];
  const filterAcceptKeys = filters && filters.acceptItems && Object.keys(filters.acceptItems);

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

  return content;
}

$(function () {
  $.getJSON("https://findthemasks.com/data.json", function (result) {
    // may end up using this for search / filtering...
    window.locations = result;
    window.data_by_location = toDataByLocation(locations);

    createContent(window.data_by_location);

    const searchParams = new URLSearchParams((new URL(window.location)).search);
    const stateParams = searchParams.getAll('state').map(state => state.toUpperCase());
    const states = stateParams.map(param => param.split(',')).reduce((acc, val) => acc.concat(val), []);

    // show map unless hide-map="true"
    if (!searchParams.get('hide-map') || searchParams.get('hide-map') !== 'true') {
      initMap(states);
    }

    const hideList = searchParams.get('hide-list') && searchParams.get('hide-list') === 'true';

    if (!hideList) {
      // Generate and populate filter + list HTML. Once completed, swap loading and list container.
      $('.filters-list').html(createFiltersListHTML(data_by_location).join(" "));
      $('.locations-loading').hide();
      $('.locations-container').show();

      $(".locations-list").empty().append(getFilteredContent(data_by_location));

      // show filters unless hide-filters="true"
      if (!searchParams.get('hide-filters') || searchParams.get('hide-filters') !== 'true') {
        $(".filters-container").show();
      }

      states.forEach(state => {
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

  locationsList.empty().append(getFilteredContent(data_by_location, filters));

  if (scrollNeeded) {
    locationsList[0].scrollIntoView({'behavior': 'smooth'});
  }
};

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

function initMap(states) {
     var data_by_location = window.data_by_location;
     var middle_of_us = { lat: 39.0567939, lng: -94.6065124};

     var element = document.getElementById('map');

     if (element == null) {
         alert('could not find map div');
     }

    $(".map-container").show();

     const singleStateFilter = states && states.length === 1;
     let firstState = states[0] || '';
     firstState = firstState.toUpperCase();

     // The map, roughly zoomed to show the entire US.
     var map = new google.maps.Map( element, {zoom: 4, center: middle_of_us});

     let markers = [];

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
         const cities = data_by_location[state].cities;

         for (const city of Object.keys(cities).sort()) {
             for (const entry of cities[city].entries) {
                 const name = entry["name"];
                 const address = entry["address"];
                 const latitude = entry["lat"];
                 const longitude = entry["lng"];
                 const instructions = entry["instructions"];
                 const accepting = entry["accepting"];
                 const open_accepted = entry["open_box"];
                 // Convert the lat and lng fields to numbers
                 if (!isNaN(Number(latitude))) {
                     var marker = addMarkerToMap(map, Number(latitude), Number(longitude),
                         address, name, instructions, accepting, open_accepted);
                     markers.push(marker);
                 }
             }
         }
     }

     let $mapStats = $('#map-stats');
     if (singleStateFilter) {
       // Center the map to a state if only one is set in query params
       centerMapToState(map, firstState);

       // Update map stats (w/ selected state)
       updateStats($mapStats, markers.length, [firstState]);

     } else {
       // Center the map on the nearest markers to the user if possible
       centerMapToNearestMarkers(map, markers);

       // Update stats (no states).
       updateStats($mapStats, markers.length);
     }
}


function centerMapToState(map, state) {
  const stateLocationMapping = stateLocationMappings[state.toUpperCase()];

  if (stateLocationMapping) {
    map.setCenter({ lat: stateLocationMapping.lat, lng: stateLocationMapping.lng });
    // roughly zoom to focus on the state, hardcoded zooms to handle special case of Alaska
    map.setZoom(stateLocationMapping.zoom);
  }
}

function centerMapToNearestMarkers(map, markers) {
    // First check to see if the user will accept getting their location, if not, silently return
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
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

                const marker_lat = marker.position.lat();
                const marker_lng = marker.position.lng();

                const loc = new google.maps.LatLng(marker_lat, marker_lng);
                bounds.extend(loc);
            }
            map.fitBounds(bounds);       // auto-zoom
            map.panToBounds(bounds);     // auto-center
        })
    }
}

let openInfoWindows = [];

function addMarkerToMap(map, latitude, longitude, address, name, instructions, accepting, open_accepted) {
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

