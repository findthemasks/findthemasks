// Takes the dataSet, which is usually the first path element in the URL,
// and returns the type of dataset. This is used by templates to choose the
// content and data schema to render.
//
// TODO: Reword this file to be based on dataset, not country.
function getDatasetType(dataset) {
  if (dataset === 'makers') {
    return dataset;
  }

  return 'default';
}

module.exports = (req, res, next) => {
  const { originalUrl } = req;
  const directories = originalUrl.split('/');

  if (directories.length > 2) {
    res.locals.currentCountry = directories[1].toLowerCase();
  } else {
    res.locals.currentCountry = 'us';
  }

  // Transitional variable while extending the code from changing behavior
  // based on countryCode to behavior based on a generic dataset.
  //
  // This allows /makers to render a different schema with different language
  // at the handlebars template layer. In this world, dataset can be 'makers',
  // 'us', ca', etc.  The datasetType determines the schema of the data.
  //
  // TODO: replace use of countryCode everywhere with dataset.
  res.locals.dataset = res.locals.countryCode;
  res.locals.datasetType = getDatasetType(res.locals.dataset);

  next();
};
