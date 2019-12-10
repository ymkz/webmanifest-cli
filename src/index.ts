#!/usr/bin/env node

import { pathExists, readJSON, writeJSON } from 'fs-extra'
import { imageSize } from 'image-size'
import sharp from 'sharp'
import meow from 'meow'

const SPLIT_TARGET_CHAR = ','
const MIN_ACCEPT_IMAGE_RESOLUTION = 512
const DEFAULT_WEBMANIFEST_PATH = 'public/manifest.webmanifest'
const DEFAULT_OUTPUT_PATH = 'public'
const DEFAULT_OUTPUT_SIZES = '512,384,192,180,152,144,128,96,72'

!(async () => {
  const cli = meow(
    `
  Usage
    $ webmanifest --icon <filepath>

  Options
    --icon, -i Template icon file <required>
    --manifest, -m Template webmanifest file
    --output, -o Output directory path
    --sizes, -s Output icon sizes

  Examples
    $ webmanifest --icon public/icon.svg
    $ webmanifest --icon public/icon.svg --sizes 512,192,96,32,16
  `,
    {
      flags: {
        icon: {
          type: 'string',
          alias: 'i'
        },
        manifest: {
          type: 'string',
          alias: 'm',
          default: DEFAULT_WEBMANIFEST_PATH
        },
        output: {
          type: 'string',
          alias: 'o',
          default: DEFAULT_OUTPUT_PATH
        },
        sizes: {
          type: 'string',
          alias: 's',
          default: DEFAULT_OUTPUT_SIZES
        }
      }
    }
  )

  if (!(await pathExists(cli.flags.icon))) {
    throw new Error(`${cli.flags.icon} does not exists.`)
  }
  if (!(await pathExists(cli.flags.manifest))) {
    throw new Error(`${cli.flags.manifest} does not exists.`)
  }
  if (!(await pathExists(cli.flags.output))) {
    throw new Error(`${cli.flags.output} does not exists.`)
  }

  const iconDimension = imageSize(cli.flags.icon)

  if (!iconDimension.width || !iconDimension.height) {
    throw new Error('Icon file is invalid.')
  }
  if (iconDimension.width !== iconDimension.height) {
    throw new Error('Icon file is required its square.')
  }
  if (iconDimension.width && iconDimension.width < MIN_ACCEPT_IMAGE_RESOLUTION) {
    throw new Error(`Icon file is required larger than ${MIN_ACCEPT_IMAGE_RESOLUTION}px.`)
  }
  if (iconDimension.height && iconDimension.height < MIN_ACCEPT_IMAGE_RESOLUTION) {
    throw new Error(`Icon file is required larger than ${MIN_ACCEPT_IMAGE_RESOLUTION}px.`)
  }

  const ascendingOrder = (a: number, b: number) => (a < b ? 1 : -1)

  const outputSizes = cli.flags.sizes.includes(SPLIT_TARGET_CHAR)
    ? cli.flags.sizes
        .split(SPLIT_TARGET_CHAR)
        .map(Number)
        .filter(Number)
        .sort(ascendingOrder)
    : [Number(cli.flags.sizes)].filter(Number)

  try {
    for (const size of outputSizes) {
      await sharp(cli.flags.icon)
        .resize(size, size)
        .png()
        .toFile(`${cli.flags.output}/icon-${size}x${size}.png`)
      console.log(`Output: ${cli.flags.output}/icon-${size}x${size}.png`)
    }
  } catch (error) {
    throw error
  }

  const inputManifest = await readJSON(cli.flags.manifest)
  const outputManifestContent = {
    ...inputManifest,
    icons: outputSizes.map(size => ({
      src: `icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png'
    }))
  }

  await writeJSON(cli.flags.manifest, outputManifestContent, { spaces: 2 })
  console.log(`Output: ${cli.flags.manifest}`)

  console.log('\n🎉 Done! All icons and manifest file is generated successfully.\n')
})()
