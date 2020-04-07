#!/usr/bin/env bash

# Use a .env file with default settings
if ! ls .env; then
  echo "Creating .env file"
  cp .env.local .env
fi

# Install firebase CLI for local development
if ! firebase -V; then
  echo "Installing firebase CLI"
  npm install -g firebase-tools
fi

npm install

# This is temporary for now, we want to dynamically grab them
echo "Downloading latest country data."
for country in at ca ch de es fr it pt us; do
  curl --fail --silent https://storage.googleapis.com/findthemasks.appspot.com/data-$country.json -o data-$country.json
  curl --fail --silent https://storage.googleapis.com/findthemasks.appspot.com/data-$country.csv -o data-$country.csv
done
