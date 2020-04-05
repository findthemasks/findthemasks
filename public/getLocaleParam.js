const transformFbLocale = (fbLocale) => {
  if (fbLocale) {
    return fbLocale.replace('_', '-');
  }

  return null;
};

export default (defaultLocale = null) => {
  const searchParams = new URLSearchParams((new URL(window.location)).search);
  return searchParams.get('locale') || transformFbLocale(searchParams.get('fb_locale')) || defaultLocale;
}
