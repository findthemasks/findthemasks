export default function toDataByLocation(data) {
  const headers = data.values[1];
  const approvedIndex = headers.indexOf('approved');
  const stateIndex = headers.indexOf('state');
  const cityIndex = headers.indexOf('city');
  const latIndex = headers.indexOf('lat');
  const lngIndex = headers.indexOf('lng');
  const dataByLocation = {};

  const publishedEntries = data
    .values.slice(1)
    .filter((entry) => entry[approvedIndex] === 'x' && entry[latIndex] && entry[lngIndex]);

  publishedEntries.forEach((entry) => {
    const state = entry[stateIndex].trim().toUpperCase();
    const city = entry[cityIndex].trim().toLowerCase();

    const stateObj = (dataByLocation[state] || { cities: {} });
    dataByLocation[state] = stateObj;
    const cityObj = (stateObj.cities[city] || { entries: [] });
    stateObj.cities[city] = cityObj;
    const entryArray = cityObj.entries;
    const entryObj = {};

    headers.forEach((value, index) => {
      if (entry[index] !== undefined) {
        entryObj[value] = entry[index];
      } else {
        entryObj[value] = '';
      }
    });
    entryArray.push(entryObj);
  });

  return dataByLocation;
}
