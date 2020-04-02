#!/bin/bash

set -e

###### 
## Hacky race guard logic

TIMESTAMP_FILE=~/deploy_timestamp.txt

if [ ! -f ${TIMESTAMP_FILE} ]; then
  echo 0 > ${TIMESTAMP_FILE}
fi

this_deploy=$(date +%s)
last_deploy=$(<${TIMESTAMP_FILE})
if (( this_deploy < (last_deploy + 30) )); then 
  echo "Deploying too fast. Skipping."
  exit 1
fi

# Write timestamp to file.
echo $this_deploy > ${TIMESTAMP_FILE}

# Reread the written value to guard against a race. Note, 2 commands in the
# same second will incorrectly pass this check but doing it right is hard.
last_deploy=$(<${TIMESTAMP_FILE})
if [ $this_deploy -ne $last_deploy ]; then
  echo "Lost a race. Bowing out."
  exit 2
fi

###### 
## Deploy the code.

pushd ~/src/findthemasks > /dev/null

# Update the git repository
git fetch
git reset --hard origin/master
git clean -f
rsync -lr --delete --exclude data-*.json data-*.csv ~/src/findthemasks/public/ ~/findthemasks.com

popd > /dev/null

# Get latest data.
for country in at ca ch de es fr it pt us; do
  curl --fail https://storage.googleapis.com/findthemasks.appspot.com/data-$country.json > ~/findthemasks.com/data-$country.json_
  mv ~/findthemasks.com/data-$country.json_ ~/findthemasks.com/data-$country.json

  curl --fail https://storage.googleapis.com/findthemasks.appspot.com/data-$country.csv > ~/findthemasks.com/data-$country.csv_
  mv ~/findthemasks.com/data-$country.csv_ ~/findthemasks.com/data-$country.csv
done
