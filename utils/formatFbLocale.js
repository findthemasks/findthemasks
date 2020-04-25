module.exports = (locale) => {
  let language;
  let region;

  if (locale.includes('-')) {
    [language, region] = locale.split('-');
    return `${language}_${region.toUpperCase()}`;
  }
  return locale;
};
