import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { zipSync } from 'fflate'
import {
  extractProductImagesFromZip,
  prepareDirectProductImages,
} from '../src/utils/adminProductImageFiles.js'
import {
  imageDraftsToPreviewSet,
  productGalleryEntries,
} from '../src/utils/productImageGallery.js'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8')
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01])
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

test('direct product images use natural filename order', async () => {
  const files = [
    new File([jpegBytes], 'image-10.jpg', { type: 'image/jpeg' }),
    new File([jpegBytes], 'image-2.jpg', { type: 'image/jpeg' }),
    new File([jpegBytes], 'image-01.jpg', { type: 'image/jpeg' }),
  ]

  const result = await prepareDirectProductImages(files)
  assert.deepEqual(result.map((item) => item.file.name), ['image-01.jpg', 'image-2.jpg', 'image-10.jpg'])
})

test('ZIP import ignores metadata and naturally orders supported images', async () => {
  const zip = zipSync({
    'set/10.png': pngBytes,
    'set/02.png': pngBytes,
    'set/01.png': pngBytes,
    '__MACOSX/._01.png': pngBytes,
    '.hidden/03.png': pngBytes,
    'set/readme.txt': new TextEncoder().encode('ignore'),
  })
  const file = new File([zip], 'product-images.zip', { type: 'application/zip' })

  const result = await extractProductImagesFromZip(file)
  assert.deepEqual(result.map((item) => item.sortKey), ['set/01.png', 'set/02.png', 'set/10.png'])
  assert.ok(result.every((item) => item.file.type === 'image/png'))
})

test('public gallery keeps actual photo order instead of treating variants as photos', () => {
  const product = {
    imageSet: {
      thumb: '/primary-thumb.webp',
      card: '/primary-card.webp',
      detail: '/primary-detail.webp',
      zoom: '/primary-zoom.webp',
      gallery: [
        { id: 'second', sortOrder: 1, thumb: '/2-t.webp', card: '/2-c.webp', detail: '/2-d.webp', zoom: '/2-z.webp', position: { x: 70, y: 25 }, scale: 1.4 },
        { id: 'first', sortOrder: 0, thumb: '/1-t.webp', card: '/1-c.webp', detail: '/1-d.webp', zoom: '/1-z.webp', position: { x: 40, y: 60 }, scale: 1.2 },
      ],
    },
    imageAlt: {
      gallery: [
        { id: 'first', altText: 'First image' },
        { id: 'second', altText: 'Second image' },
      ],
    },
  }

  const gallery = productGalleryEntries(product, 'Fallback')
  assert.equal(gallery.length, 2)
  assert.deepEqual(gallery.map((image) => image.id), ['first', 'second'])
  assert.deepEqual(gallery.map((image) => image.detailSrc), ['/1-d.webp', '/2-d.webp'])
  assert.deepEqual(gallery[0].position, { x: 40, y: 60 })
  assert.equal(gallery[1].scale, 1.4)
  assert.equal(gallery[0].alt, 'First image')
})

test('legacy single image remains one centered gallery photo', () => {
  const gallery = productGalleryEntries({
    imageSet: {
      thumb: '/thumb.webp',
      card: '/card.webp',
      detail: '/detail.webp',
      zoom: '/zoom.webp',
    },
  }, 'Legacy image')

  assert.equal(gallery.length, 1)
  assert.equal(gallery[0].detailSrc, '/detail.webp')
  assert.deepEqual(gallery[0].position, { x: 50, y: 50 })
  assert.equal(gallery[0].scale, 1)
})

test('preview image set makes the first draft primary and preserves presentation', () => {
  const preview = imageDraftsToPreviewSet([
    { id: 'b', filename: '02.jpg', previewUrl: '/02.jpg', position: { x: 20, y: 80 }, scale: 1.5 },
    { id: 'a', filename: '01.jpg', previewUrl: '/01.jpg', position: { x: 50, y: 50 }, scale: 1 },
  ])

  assert.equal(preview.primary, '/02.jpg')
  assert.equal(preview.gallery[0].isPrimary, true)
  assert.equal(preview.gallery[1].isPrimary, false)
  assert.deepEqual(preview.position, { x: 20, y: 80 })
  assert.equal(preview.scale, 1.5)
})

test('editor submits a manifest and storefront reads imageSet.gallery', () => {
  const editor = read('src/pages/admin/AdminProductEditorPage.jsx')
  const detail = read('src/pages/ProductDetailPage.jsx')

  assert.match(editor, /extractProductImagesFromZip/)
  assert.match(editor, /metadata\.items|items: images\.map/)
  assert.match(editor, /images\.length \+ candidates\.length > maxProductImages/)
  assert.match(editor, /setImages\(\(current\) => \[\.\.\.current, \.\.\.nextImages\]\)/)
  assert.match(editor, /admin-product-image-drag-handle/)
  assert.match(editor, /admin-product-image-crop-frame/)
  assert.match(editor, /handleCropKey/)
  assert.match(editor, /index === 0 \? '대표 이미지'/)
  assert.match(detail, /productGalleryEntries\(product, productAlt\)/)
  assert.doesNotMatch(detail, /\{ id: 'zoom', src: imageSet\.zoom/)
})
