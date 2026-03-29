#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo ""
echo "Build complete! Deploy the following to your server:"
echo "- index.html (from dist/)"
echo "- assets/ (from dist/)"
echo "- .htaccess (from dist/)"
echo "- api/"
echo "- api/data/ (writable by PHP)"
echo ""
echo "Or run: cp -r dist/index.html dist/assets dist/.htaccess ."
