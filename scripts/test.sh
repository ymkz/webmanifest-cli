#!/usr/bin/env sh

set -eu

EXAMPLE_ICON="public/icon.svg"
EXAMPLE_WORKSPACE="./example"
PKG_NAME=`node -p "require('./package.json').name"`
PKG_VERSION=`node -p "require('./package.json').version"`
PKG_PACKED=$PKG_NAME-$PKG_VERSION.tgz

if [ -e $PKG_PACKED ]; then
  echo "** Already exists packed module: $PKG_PACKED"
  echo "** Remove old packed file..."
  rm $PKG_PACKED
  echo "** Done, package remove"
fi

echo "+ Building module..."
npm run build

echo "+ Packing module..."
npm pack

if [ -e $EXAMPLE_WORKSPACE ]; then
  echo "** Already exists example workspace: $EXAMPLE_WORKSPACE"
  echo "** Remove old workspace..."
  rm -rf $EXAMPLE_WORKSPACE
fi

echo "+ generate workspace directory"
mkdir -p $EXAMPLE_WORKSPACE/public

echo "+ move test-target module to workspace"
mv $PKG_PACKED $EXAMPLE_WORKSPACE

echo "+ copy necessary icon and manifest"
cp public/icon.svg $EXAMPLE_WORKSPACE/public
cp public/manifest.webmanifest $EXAMPLE_WORKSPACE/public

echo "+ change directory to workspace"
cd $EXAMPLE_WORKSPACE

echo "+ initialize npm in workspace"
npm init -y

echo "+ install test-target module in workspace"
npm i $PKG_PACKED

echo "+ run test-target module"
npx webmanifest --icon $EXAMPLE_ICON

echo "+ back to home"
cd ..
