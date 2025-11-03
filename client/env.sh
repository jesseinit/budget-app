#!/bin/sh

# Generate runtime config from all VITE_* environment variables automatically
echo "window.__RUNTIME_CONFIG__ = {" > /code/dist/config.js

# Loop through all environment variables starting with VITE_
env | grep '^VITE_' | while IFS='=' read -r key value; do
  # Escape double quotes in the value
  escaped_value=$(echo "$value" | sed 's/"/\\"/g')
  echo "  $key: \"$escaped_value\"," >> /code/dist/config.js
done

echo "};" >> /code/dist/config.js

echo "Runtime config generated:"
cat /code/dist/config.js

# Start the server
exec serve -s dist -l 80
