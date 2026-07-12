#!/bin/sh
# Build and publish to GitHub Pages (gh-pages branch).
set -e
cd "$(dirname "$0")"
/opt/homebrew/bin/node ./node_modules/.bin/vite build
touch dist/.nojekyll
cd dist
/usr/bin/git init -q -b gh-pages
/usr/bin/git add -A
/usr/bin/git commit -q -m "deploy $(date +%Y-%m-%d_%H%M)"
/usr/bin/git push -q --force https://github.com/kmulroy1972/wardrobe.git gh-pages
cd ..
rm -rf dist/.git
echo "Deployed → https://kmulroy1972.github.io/wardrobe/"
