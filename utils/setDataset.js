const VALID_DATASETS = [
  'requester',
  'makers',
  'getusppe-affiliates',
];

module.exports = (queryParams, defaultDataset) => {
  if (VALID_DATASETS.includes(queryParams.dataset)) {
    return queryParams.dataset;
  }

  return defaultDataset;
};
