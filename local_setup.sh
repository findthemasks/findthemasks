#!/usr/bin/env bash

# Use a .env file with default settings
if ! test -f .env; then
  echo "Creating .env file"
  cp .env.local .env
fi

npm install
