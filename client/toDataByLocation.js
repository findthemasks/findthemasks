export default function toDataByLocation(data) {
  const headers = data.values[1];
  const approvedIndex = headers.findIndex( e => e === 'approved' );
  const stateIndex = headers.findIndex( e => e === 'state' );
  const cityIndex = headers.findIndex( e => e === 'city' );
  const latIndex = headers.findIndex( e => e === 'lat' );
  const lngIndex = headers.findIndex( e => e === 'lng' );
  const data_by_location = {};

  const published_entries = data
    .values.slice(1)
    .filter((entry) => entry[approvedIndex] === "x" && entry[latIndex] && entry[lngIndex]);

  published_entries.forEach( entry => {
    const state = entry[stateIndex].trim().toUpperCase();
    const city = entry[cityIndex].trim().toLowerCase();

    const state_obj = data_by_location[state] = (data_by_location[state] || { cities: {} });
    const city_obj = state_obj.cities[city] = (state_obj.cities[city] || { entries: [] });
    const entry_array = city_obj.entries;
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
