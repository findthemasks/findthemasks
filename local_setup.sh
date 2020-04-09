#!/usr/bin/env bash

# Use a .env file with default settings
if ! ls .env; then
  echo "Creating .env file"
  cp .env.local .env
fi

npm install
