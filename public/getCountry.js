// TODO(ajwong): This is copied into donation-form-bounce.html. Careful.
export default () => {
  const url = new URL(window.location);
  const directories = url.pathname.split("/");
  if (directories.length > 2) {
    return directories[1];
  }

  return 'us';
}
