#!/usr/bin/env node

import { pathExists, readJSON, writeJSON } from 'fs-extra'
import { imageSize } from 'image-size'
import meow from 'meow'
import sharp from 'sharp'

const ICON_SIZE_DELIMITER = ','
const MIN_ACCEPT_IMAGE_RESOLUTION = 512
const DEFAULT_INPUT_ICON_PATH = 'public/icon.svg'
const DEFAULT_INPUT_MANIFEST_PATH = 'public/manifest.webmanifest'
const DEFAULT_OUTPUT_ICON_PATH = 'public/assets'
const DEFAULT_OUTPUT_MANIFEST_PATH = 'public/manifest.webmanifest'
const DEFAULT_OUTPUT_SIZES = '512,384,192,180,152,144,128,96,72'

!(async () => {
  const cli = meow(
    `
  Usage
    $ webmanifest --icon <filepath>

  Options
    --icon, -i Template icon file <required>
    --manifest, -m Template webmanifest file
    --outputIcon, -oi Output icons directory path
    --outputManifest, -om Output webmanifest directory path
    --sizes, -s Output icon sizes

  Examples
    $ webmanifest
    $ webmanifest --icon public/icon.svg --manifest public/manifest.webmanifest --outputIcon public/assets --outputManifest public/manifest.webmanifest --sizes 512,384,192,180,152,144,128,96,72
  `,
    {
      flags: {
        icon: {
          type: 'string',
          alias: 'i',
          default: DEFAULT_INPUT_ICON_PATH,
        },
        manifest: {
          type: 'string',
          alias: 'm',
          default: DEFAULT_INPUT_MANIFEST_PATH,
        },
        outputIcon: {
          type: 'string',
          alias: 'oi',
          default: DEFAULT_OUTPUT_ICON_PATH,
        },
        outputManifest: {
          type: 'string',
          alias: 'om',
          default: DEFAULT_OUTPUT_MANIFEST_PATH,
        },
        sizes: {
          type: 'string',
          alias: 's',
          default: DEFAULT_OUTPUT_SIZES,
        },
      },
    }
  )

  if (!(await pathExists(cli.flags.icon))) {
    throw new Error(`${cli.flags.icon} does not exists.`)
  }
  if (!(await pathExists(cli.flags.manifest))) {
    throw new Error(`${cli.flags.manifest} does not exists.`)
  }
  if (!(await pathExists(cli.flags.outputIcon))) {
    throw new Error(`${cli.flags.outputIcon} does not exists.`)
  }
  if (!(await pathExists(cli.flags.outputManifest))) {
    throw new Error(`${cli.flags.outputManifest} does not exists.`)
  }

  const iconRectangle = imageSize(cli.flags.icon)

  if (!iconRectangle.width || !iconRectangle.height) {
    throw new Error('Icon file is invalid.')
  }
  if (iconRectangle.width !== iconRectangle.height) {
    throw new Error('Icon file is required its square.')
  }
  if (iconRectangle.width && iconRectangle.width < MIN_ACCEPT_IMAGE_RESOLUTION) {
    throw new Error(`Icon file is required larger than ${MIN_ACCEPT_IMAGE_RESOLUTION}px.`)
  }
  if (iconRectangle.height && iconRectangle.height < MIN_ACCEPT_IMAGE_RESOLUTION) {
    throw new Error(`Icon file is required larger than ${MIN_ACCEPT_IMAGE_RESOLUTION}px.`)
  }

  const ascendingOrder = (a: number, b: number) => (a < b ? 1 : -1)

  const outputSizes = cli.flags.sizes.includes(ICON_SIZE_DELIMITER)
    ? cli.flags.sizes
        .split(ICON_SIZE_DELIMITER)
        .map(Number)
        .filter(Number)
        .sort(ascendingOrder)
    : [Number(cli.flags.sizes)].filter(Number)

  for (const size of outputSizes) {
    await sharp(cli.flags.icon)
      .resize(size, size)
      .png()
      .toFile(`${cli.flags.outputIcon}/icon-${size}x${size}.png`)
    console.log(`Output icon: ${cli.flags.outputIcon}/icon-${size}x${size}.png`)
  }

  const inputManifest = await readJSON(cli.flags.manifest)
  const outputManifestContent = {
    ...inputManifest,
    icons: outputSizes.map(size => ({
      src: `icon-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
    })),
  }

  await writeJSON(cli.flags.outputManifest, outputManifestContent, { spaces: 2 })
  console.log(`Output webmanifest: ${cli.flags.outputManifest}`)

  console.log('\n🎉 All icons and webmanifest file is generated successfully.\n')
})()
