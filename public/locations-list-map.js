function toDataByLocation(data) {
  const headers = data.values[0];
  const approvedIndex = headers.findIndex( e => e === 'Approved' );
  const stateIndex = headers.findIndex( e => e === 'State?' );
  const cityIndex = headers.findIndex( e => e === 'City' );
  const data_by_location = {};

  const published_entries = data.values.slice(1).filter((entry) => entry[approvedIndex] === "x");

  published_entries.forEach( entry => {
    const state = entry[stateIndex].trim();
    const city = entry[cityIndex].trim();
    let entry_array;
    if (!(state in data_by_location) || !(city in data_by_location[state])) {
      entry_array = [];
      if (state in data_by_location) {
        data_by_location[state][city] = entry_array;
      } else {
        data_by_location[state] = { [city]: entry_array };
      }
    } else {
      entry_array = data_by_location[state][city];
    }
    const entry_obj = {};
    headers.forEach( (value, index) => {
      if (entry[index] !== undefined) {
        entry_obj[value] = entry[index];
      } else {
        entry_obj[value] = "";
      }
    });
    entry_array.push(entry_obj);
  });

  return data_by_location;
}

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
        const v = entry["Will they accept open boxes/bags?"];
        acceptOpenFilters[toHTMLID(v)] = v;
      }
    }
  }

  const filters = [];
  filters.push(`<h4>States</h4>`);
  for (const state of Object.keys(states)) {
    filters.push(`
      <div>
        <input
          id="state-${state}"
          type="checkbox"
          name="states"
          value="${state}"
          onchange="onFilterChange(this)"
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

//  filters.push(`<h3>Accepts Open Boxes/bags</h3>`);
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
    'n95s': 'N95 masks/respirators',
    'masks': 'surgical masks',
    'face shields': 'face shields',
    'booties': 'medical booties',
    'goggles': 'safety goggles',
    'gloves': 'gloves',
    'kleenex': 'kleenex',
    'sanitizer': 'hand-sanitizer',
    'overalls': 'medical overalls',
    'gowns': 'gowns',
    'respirators': 'advanced respirators (PAPR/CAPR/etc.)',
  };
  filters.push(`<h4>Accepted Items</h4>`);
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
          onchange="onFilterChange(this)"
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

  for (const state of Object.keys(data_by_location).sort()) {
    if (filters && filters.states && !filters.states[state]) {
      continue;
    }

    const cityLines = [];

    const cities = data_by_location[state];
    for (const city of Object.keys(cities).sort()) {
      const entryLines = [];
      for (const entry of cities[city]) {
        const name = entry["What is the name of the hospital or clinic?"];
        const address = entry["Street address for dropoffs?"];
        const instructions = entry["Drop off instructions, eg curbside procedure or mailing address ATTN: instructions:"];
        const accepting = entry["What are they accepting?"];
        const will_they_accept = entry["Will they accept open boxes/bags?"];

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

        entryLines.push(`<div class=location>`)
        entryLines.push(`<h4 class="marginBottomZero">${name}</h4>`);

        entryLines.push(`<label>Address</label>`)
        entryLines.push(`<p class="marginTopZero medEmph">${address.replace(/\n/g,'<br>')}</p>`);

        if (instructions !== "") {
          entryLines.push(`<label>Instructions</label>`)
          entryLines.push(`<p>${instructions}</p>`);
        }
        if (accepting !== "") {
          entryLines.push(`<label>Accepting</label>`)
          entryLines.push(`<p>${accepting}</p>`);
        }
        if (will_they_accept !== "") {
          entryLines.push(`<label>Open packages?</label>`)
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

  return lines;
}

document.addEventListener("DOMContentLoaded", function() {
    $.getJSON("https://findthemasks.com/data.json", function(result){
    // may end up using this for search / filtering...
    window.locations = result;
    window.data_by_location = toDataByLocation(locations);

    const searchParams = new URLSearchParams((new URL(window.location)).search);
    const stateParams = searchParams.getAll('state').map(state => state.toUpperCase());
    const states = stateParams.map(param => param.split(',')).flat();

    // show map unless hide-map="true"
    if (!searchParams.get('hide-map') || searchParams.get('hide-map') !== 'true') {
      initMap(states);
    }

    const hideList = searchParams.get('hide-list') && searchParams.get('hide-list') === 'true';

    if (!hideList) {
      $(".filters-list").html(createFiltersListHTML(data_by_location).join(" "));

      const htmlSnippets = toHtmlSnippets(data_by_location, null);
      $(".locations-list").html(htmlSnippets.join(" "));

      // show filters unless hide-filters="true"
      if (!searchParams.get('hide-filters') || searchParams.get('hide-filters') !== 'true') {
        $(".filters-container").show();
      }

      states.forEach(state => {
        elem = document.getElementById(`state-${state}`);
        elem.checked = true;
        onFilterChange(elem);
      });
    }
  });
});

function onFilterChange(elem) {
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
  $(".locations-list").html(htmlSnippets.join(" "));
}


 function initMap(states) {
     var data_by_location = window.data_by_location;
     var middle_of_us = { lat: 39.0567939, lng: -94.6065124};

     var element = document.getElementById('map');

     if (element == null) {
         alert('could not find map div');
     }

    $(".map-container").show();

     // The map, roughly zoomed to show the entire US.
     var map = new google.maps.Map( element, {zoom: 4, center: middle_of_us});

     var markers = [];
     var i = 0;
     for (const state of Object.keys(data_by_location).sort()) {
         const cities = data_by_location[state];
         for (const city of Object.keys(cities).sort()) {
             for (const entry of cities[city]) {
                 const name = entry["What is the name of the hospital or clinic?"];
                 const address = entry["Street address for dropoffs?"];
                 const latitude = entry["Lat"];
                 const longitude = entry["Lng"];
                 const instructions = entry["Drop off instructions, eg curbside procedure or mailing address ATTN: instructions:"];
                 const accepting = entry["What are they accepting?"];
                 const open_accepted = entry["Will they accept open boxes/bags?"];
                 // Convert the lat and lng fields to numbers
                 if (!isNaN(Number(latitude))) {
                     var marker = addMarkerToMap(map, Number(latitude), Number(longitude),
                         address, name, instructions, accepting, open_accepted);
                     markers.push(marker);
                 }
             }
         }
     }

     if (states && states.length === 1) {
       // Center the map to a state if only one is set in query params
       centerMapToState(map, states[0]);
     } else {
       // Center the map on the nearest markers to the user if possible
       centerMapToNearestMarkers(map, markers);
     }
}

const stateLocationMappings = {
  "AK": { "lat": 63.588753, "lng": -154.493062 },
  "AL": { "lat": 32.318231, "lng": -86.902298 },
  "AR": { "lat": 35.20105, "lng": -91.831833 },
  "AZ": { "lat": 34.048928, "lng": -111.093731 },
  "CA": { "lat": 36.778261, "lng": -119.417932 },
  "CO": { "lat": 39.550051, "lng": -105.782067 },
  "CT": { "lat": 41.603221, "lng": -73.087749 },
  "DC": { "lat": 38.905985, "lng": -77.033418 },
  "DE": { "lat": 38.910832, "lng": -75.52767 },
  "FL": { "lat": 27.664827, "lng": -81.515754 },
  "GA": { "lat": 32.157435, "lng": -82.907123 },
  "HI": { "lat": 19.898682, "lng": -155.665857 },
  "IA": { "lat": 41.878003, "lng": -93.097702 },
  "ID": { "lat": 44.068202, "lng": -114.742041 },
  "IL": { "lat": 40.633125, "lng": -89.398528 },
  "IN": { "lat": 40.551217, "lng": -85.602364 },
  "KS": { "lat": 39.011902, "lng": -98.484246 },
  "KY": { "lat": 37.839333, "lng": -84.270018 },
  "LA": { "lat": 31.244823, "lng": -92.145024 },
  "MA": { "lat": 42.407211, "lng": -71.382437 },
  "MD": { "lat": 39.045755, "lng": -76.641271 },
  "ME": { "lat": 45.253783, "lng": -69.445469 },
  "MI": { "lat": 44.314844, "lng": -85.602364 },
  "MN": { "lat": 46.729553, "lng": -94.6859 },
  "MO": { "lat": 37.964253, "lng": -91.831833 },
  "MS": { "lat": 32.354668, "lng": -89.398528 },
  "MT": { "lat": 46.879682, "lng": -110.362566 },
  "NC": { "lat": 35.759573, "lng": -79.0193 },
  "ND": { "lat": 47.551493, "lng": -101.002012 },
  "NE": { "lat": 41.492537, "lng": -99.901813 },
  "NH": { "lat": 43.193852, "lng": -71.572395 },
  "NJ": { "lat": 40.058324, "lng": -74.405661 },
  "NM": { "lat": 34.97273, "lng": -105.032363 },
  "NV": { "lat": 38.80261, "lng": -116.419389 },
  "NY": { "lat": 43.299428, "lng": -74.217933 },
  "OH": { "lat": 40.417287, "lng": -82.907123 },
  "OK": { "lat": 35.007752, "lng": -97.092877 },
  "OR": { "lat": 43.804133, "lng": -120.554201 },
  "PA": { "lat": 41.203322, "lng": -77.194525 },
  "PR": { "lat": 18.220833, "lng": -66.590149 },
  "RI": { "lat": 41.580095, "lng": -71.477429 },
  "SC": { "lat": 33.836081, "lng": -81.163725 },
  "SD": { "lat": 43.969515, "lng": -99.901813 },
  "TN": { "lat": 35.517491, "lng": -86.580447 },
  "TX": { "lat": 31.968599, "lng": -99.901813 },
  "UT": { "lat": 39.32098, "lng": -111.093731 },
  "VA": { "lat": 37.431573, "lng": -78.656894 },
  "VT": { "lat": 44.558803, "lng": -72.577841 },
  "WA": { "lat": 47.751074, "lng": -120.740139 },
  "WI": { "lat": 43.78444, "lng": -88.787868 },
  "WV": { "lat": 38.597626, "lng": -80.454903 },
  "WY": { "lat": 43.075968, "lng": -107.29028 }
};

function centerMapToState(map, state) {
  const stateLocationMapping = stateLocationMappings[state.toUpperCase()];

  // below code left for future use of geocoder API which would be more accurate in zooming

  // const geocoder = new google.maps.Geocoder();
  // geocoder.geocode({'address': `State of ${stateMappings[state]}`}, (results, state) => {
  //   // no-op if state not found
  //   if (state === 'OK' && results && results[0] && results[0].geometry && results[0].geometry.viewport) {
  //     map.fitBounds(results[0].geometry.viewport);
  //   }
  // });

  if (stateLocationMapping) {
    map.setCenter({ lat: stateLocationMapping.lat, lng: stateLocationMapping.lng });
    // roughly zoom to focus on the state, hardcoded zooms to handle special case of Alaska
    if (state.toUpperCase() === 'AK') {
      map.setZoom(3.5);
    } else {
      map.setZoom(5);
    }
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
            bounds = new google.maps.LatLngBounds();
            bounds.extend(user_latlng);

            // Extend the bounds to contain the three closest markers
            i = 0;
            while (i < 3) {
                // Get one of the closest markers
                var distance = distances[i]
                var marker = markerDistances[distance];

                // Add to the iterator first just in case something fails later to avoid infinite loop
                i++;

                marker_lat = marker.position.lat();
                marker_lng = marker.position.lng();

                loc = new google.maps.LatLng(marker_lat, marker_lng);
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

