set -o errexit

proj_dir='/home/findthemasks/findthemasks.com'

curl \
  --fail \
  https://storage.googleapis.com/findthemasks.appspot.com/data.json \
  > "$proj_dir"/data.json_

mv "$proj_dir"/data.json{_,}

DATA=$(cat "$proj_dir/data.json") \
  JS=$(cat "$proj_dir/ssr-locations-list.js") \
  envsubst \
  < "$proj_dir/ssr-index-template.html" \
  > "$proj_dir/ssr-index.html"
