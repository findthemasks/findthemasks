module.exports = (req, res, next) => {
  const { originalUrl } = req;
  const directories = originalUrl.split('/');

  if (directories.length > 2) {
    res.locals.currentCountry = directories[1].toLowerCase();
  } else {
    res.locals.currentCountry = 'us';
  }

  next();
};
