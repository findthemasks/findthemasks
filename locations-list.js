function toDataByLocation(data) {
  const headers = data.values[0];
  const approvedIndex = headers.findIndex( e => e === 'Approved' );
  const stateIndex = headers.findIndex( e => e === 'State?' );
  const cityIndex = headers.findIndex( e => e === 'City' );
  const data_by_location = {};

  const published_entries = data.values.slice(1).filter((entry) => entry[approvedIndex] === "x");

  published_entries.forEach( entry => {
    const state = entry[stateIndex];
    const city = entry[cityIndex];
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
        entry_obj[value] = entry[index]
      } else {
        entry_obj[value] = ""
      }
    });
    entry_array.push(entry_obj);
  });

  return data_by_location;
}

function toHtmlSnippets(data_by_location) {
  const lines = [];
  const state_nav = [];

  for (const state of Object.keys(data_by_location).sort()) {
    lines.push(`<div class=state>`);
    lines.push(`<h2 id="${state}">${state}</h2>`);

    state_nav.push(`<a href="#${state}">${state}</a>`);

    const cities = data_by_location[state];
    for (const city of Object.keys(cities).sort()) {
      lines.push(`<div class=city>`)
      lines.push(`<h3>${city}</h3>`);

      for (const entry of cities[city]) {
        const name = entry["What is the name of the hospital or clinic?"];
        const address = entry["Street address for dropoffs?"];
        const instructions = entry["Drop off instructions, eg curbside procedure or mailing address ATTN: instructions:"];
        const accepting = entry["What are they accepting?"];
        const will_they_accept = entry["Will they accept open boxes/bags?"];

        lines.push(`<div class=location>`)
        lines.push(`<h4 class="marginBottomZero">${name}</h4>`);

        lines.push(`<label>Address</label>`)
        lines.push(`<p class="marginTopZero medEmph">${address.replace(/\n/g,'<br>')}</p>`);

        if (instructions !== "") {
          lines.push(`<label>Instructions</label>`)
          lines.push(`<p>${instructions}</p>`);
        }
        if (accepting !== "") {
          lines.push(`<label>Accepting</label>`)
          lines.push(`<p>${accepting}</p>`);
        }
        if (will_they_accept !== "") {
          lines.push(`<label>Open packages?</label>`)
          lines.push(`<p>${will_they_accept}</p>`);
        }
        lines.push('</div>');
      }
      lines.push('</div>');
    }
    lines.push('</div>');
  }

  lines.unshift(`BY STATE: ` + state_nav.join(`&nbsp;|&nbsp;`) + `<br/>`);
  return lines;
}

document.addEventListener("DOMContentLoaded", function() {
  $.getJSON("https://storage.googleapis.com/findthemasks.appspot.com/data.json", function(result){
    // may end up using this for search / filtering...
    window.locations = result;
    window.data_by_location = toDataByLocation(locations);
    html_snippets = toHtmlSnippets(data_by_location);
    $(".locations-list").append(html_snippets.join(" "));
  });
});