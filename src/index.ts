#!/usr/bin/env node

import { pathExists, readJSON, writeJSON } from 'fs-extra'
import { cli, option } from 'typed-cli'
import { imageSize } from 'image-size'
import sharp from 'sharp'

const SPLIT_TARGET_CHAR = ','
const MIN_ACCEPT_IMAGE_RESOLUTION = 512
const DEFAULT_WEBMANIFEST_PATH = 'public/manifest.webmanifest'
const DEFAULT_OUTPUT_PATH = 'public'
const DEFAULT_OUTPUT_SIZES = '512,384,192,180,152,144,128,96,72'

!(async () => {
  const { options } = cli({
    options: {
      icon: option.string
        .alias('i')
        .description('icon file')
        .required(),
      manifest: option.string
        .alias('m')
        .description('manifest file')
        .default(DEFAULT_WEBMANIFEST_PATH),
      output: option.string
        .alias('o')
        .description('output path')
        .default(DEFAULT_OUTPUT_PATH),
      sizes: option.string
        .alias('s')
        .description('icon sizes')
        .default(DEFAULT_OUTPUT_SIZES)
    }
  })

  if (!(await pathExists(options.icon))) {
    throw new Error(`${options.icon} does not exists.`)
  }
  if (!(await pathExists(options.manifest))) {
    throw new Error(`${options.manifest} does not exists.`)
  }
  if (!(await pathExists(options.output))) {
    throw new Error(`${options.output} does not exists.`)
  }

  const iconDimension = imageSize(options.icon)

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

  const outputSizes = options.sizes.includes(SPLIT_TARGET_CHAR)
    ? options.sizes
        .split(SPLIT_TARGET_CHAR)
        .map(Number)
        .filter(Number)
        .sort(ascendingOrder)
    : [Number(options.sizes)].filter(Number)

  try {
    for (const size of outputSizes) {
      await sharp(options.icon)
        .resize(size, size)
        .png()
        .toFile(`${options.output}/icon-${size}x${size}.png`)
      console.log(`Output: ${options.output}/icon-${size}x${size}.png`)
    }
  } catch (error) {
    throw error
  }

  const inputManifest = await readJSON(options.manifest)
  const outputManifest = {
    ...inputManifest,
    icons: outputSizes.map(size => ({
      src: `icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png'
    }))
  }

  await writeJSON(options.manifest, outputManifest, { spaces: 2 })
  console.log(`Output: ${options.manifest}`)

  console.log('\n🎉 Done! All icons and manifest file is generated successfully.\n')
})()
