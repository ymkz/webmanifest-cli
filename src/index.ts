#!/usr/bin/env node

import { pathExists, readJSON, writeJSON } from 'fs-extra'
import { imageSize } from 'image-size'
import meow from 'meow'
import sharp from 'sharp'

const ICON_SIZE_DELIMITER = ','
const MIN_ACCEPT_IMAGE_RESOLUTION = 512
const DEFAULT_INPUT_ICON_PATH = 'public/favicon.svg'
const DEFAULT_INPUT_MANIFEST_PATH = 'public/site.webmanifest'
const DEFAULT_OUTPUT_PATH = 'public'
const DEFAULT_OUTPUT_SIZES = '180, 192, 512'

async function run() {
  const { flags } = meow(
    `
  Usage
    $ webmanifest --icon <file>

  Options
    --icon       Template icon file
    --manifest   Template webmanifest file
    --output     Output directory path

  Examples
    $ webmanifest --help
    $ webmanifest --icon public/icon.svg --manifest public/site.webmanifest
  `,
    {
      flags: {
        icon: {
          type: 'string',
          default: DEFAULT_INPUT_ICON_PATH,
        },
        manifest: {
          type: 'string',
          default: DEFAULT_INPUT_MANIFEST_PATH,
        },
        output: {
          type: 'string',
          default: DEFAULT_OUTPUT_PATH,
        },
        sizes: {
          type: 'string',
          default: DEFAULT_OUTPUT_SIZES,
        },
      },
    }
  )

  // パスの存在を確認
  if (!(await pathExists(flags.icon))) {
    throw new Error(`${flags.icon} does not exists.`)
  }
  if (!(await pathExists(flags.manifest))) {
    throw new Error(`${flags.manifest} does not exists.`)
  }
  if (!(await pathExists(flags.output))) {
    throw new Error(`${flags.output} does not exists.`)
  }

  const iconRectangle = imageSize(flags.icon)

  // widthとheightが異常な場合はinvalidとして弾く
  if (!iconRectangle.width || !iconRectangle.height) {
    throw new Error('Icon file is invalid.')
  }

  // 正方形以外は弾く
  if (iconRectangle.width !== iconRectangle.height) {
    throw new Error('Icon file is required its square.')
  }

  // svg以外のファイルは大きさのチェックを実施
  if (!flags.icon.endsWith('.svg')) {
    if (iconRectangle.width < MIN_ACCEPT_IMAGE_RESOLUTION) {
      throw new Error(
        `Icon file width is required larger than ${MIN_ACCEPT_IMAGE_RESOLUTION}px.`
      )
    }
    if (iconRectangle.height < MIN_ACCEPT_IMAGE_RESOLUTION) {
      throw new Error(
        `Icon file height is required larger than ${MIN_ACCEPT_IMAGE_RESOLUTION}px.`
      )
    }
  }

  // 出力サイズを文字列から配列にパース
  // デリミタが無い場合は数字としてパース
  const outputSizes = flags.sizes.includes(ICON_SIZE_DELIMITER)
    ? flags.sizes.split(ICON_SIZE_DELIMITER).map(Number).filter(Number)
    : [Number(flags.sizes)].filter(Number)

  // paddingは1/3で背景色は#fffで各サイズのPNG画像を生成
  for (const size of outputSizes) {
    const padding = Math.floor(size / 6)
    const content = Math.floor(size - padding * 2)
    const output = `${flags.output}/icon-x${size}.png`
    await sharp(flags.icon, { density: 2400 })
      .resize(content, content)
      .flatten({ background: '#fff' })
      .extend({
        background: '#fff',
        top: padding,
        left: padding,
        bottom: padding,
        right: padding,
      })
      .png()
      .toFile(output)
    console.log(`Output icon: ${output}`)
  }

  const inputManifest = await readJSON(flags.manifest)
  const outputManifestContent = {
    ...inputManifest,
    icons: outputSizes.map((size) => ({
      src: `icon-x${size}.png`,
      sizes: `${size}x${size}`,
      type: 'image/png',
    })),
  }

  await writeJSON(flags.manifest, outputManifestContent, { spaces: 2 })
  console.log(`Output webmanifest: ${flags.manifest}`)

  console.log('\n🎉 All process successfully done.\n')
}

run()
