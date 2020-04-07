$(window).on( "load", function() {
  // get url path and strip leading/trailing slashes, if no path, assume US
  var countryCode = window.location.pathname.replace(/^\/|\/$/g, '') || 'us';
  $('#flag-icon-span').removeClass().addClass('flag-icon flag-icon-' + countryCode);
});
