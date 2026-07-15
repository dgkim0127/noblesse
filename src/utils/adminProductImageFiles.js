import { unzip } from 'fflate'

export const maxProductImages = 8
export const maxProductImageBytes = 10 * 1024 * 1024
export const maxProductImageBatchBytes = 80 * 1024 * 1024
export const allowedProductImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp'])
const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function normalizedPath(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '')
}

function isIgnoredArchivePath(path) {
  const parts = normalizedPath(path).split('/').filter(Boolean)
  return parts.length === 0
    || parts.some((part) => part === '__MACOSX' || part.startsWith('.'))
}

function extensionOf(path) {
  const filename = normalizedPath(path).split('/').at(-1) || ''
  return filename.includes('.') ? filename.split('.').at(-1).toLowerCase() : ''
}

export function detectProductImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png'
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return ''
}

export function sortProductImageCandidates(candidates) {
  return [...candidates].sort((left, right) => naturalCollator.compare(left.sortKey || left.file?.name || '', right.sortKey || right.file?.name || ''))
}

async function validateDirectImage(file) {
  if (file.size > maxProductImageBytes) throw new Error(`${file.name}: 장당 10MB를 초과했습니다.`)
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const detectedType = detectProductImageType(bytes)
  if (!allowedProductImageTypes.has(detectedType)) throw new Error(`${file.name}: JPG, PNG, WebP 파일만 사용할 수 있습니다.`)
  if (file.type && file.type !== detectedType) throw new Error(`${file.name}: 파일 형식과 내용이 일치하지 않습니다.`)
  return {
    file: file.type === detectedType ? file : new File([file], file.name, { type: detectedType, lastModified: file.lastModified }),
    sortKey: file.webkitRelativePath || file.name,
  }
}

export async function prepareDirectProductImages(files) {
  const candidates = await Promise.all([...files].map(validateDirectImage))
  const totalBytes = candidates.reduce((sum, item) => sum + item.file.size, 0)
  if (totalBytes > maxProductImageBatchBytes) throw new Error('선택한 이미지 전체 용량은 80MB 이하여야 합니다.')
  return sortProductImageCandidates(candidates)
}

function unzipAsync(bytes) {
  return new Promise((resolve, reject) => {
    unzip(bytes, (error, entries) => {
      if (error) reject(new Error('ZIP 파일을 열 수 없습니다. 손상되었거나 암호화된 파일인지 확인해 주세요.'))
      else resolve(entries)
    })
  })
}

export async function extractProductImagesFromZip(zipFile) {
  if (!zipFile || zipFile.size === 0) throw new Error('비어 있는 ZIP 파일입니다.')
  if (zipFile.size > maxProductImageBatchBytes) throw new Error('ZIP 파일은 80MB 이하여야 합니다.')
  const entries = await unzipAsync(new Uint8Array(await zipFile.arrayBuffer()))
  const candidates = []
  let totalBytes = 0

  for (const [entryPath, bytes] of Object.entries(entries)) {
    const path = normalizedPath(entryPath)
    if (path.endsWith('/') || isIgnoredArchivePath(path) || !imageExtensions.has(extensionOf(path))) continue
    const detectedType = detectProductImageType(bytes)
    if (!detectedType) throw new Error(`${path}: 이미지 파일 내용이 올바르지 않습니다.`)
    if (bytes.length > maxProductImageBytes) throw new Error(`${path}: 장당 10MB를 초과했습니다.`)
    totalBytes += bytes.length
    if (totalBytes > maxProductImageBatchBytes) throw new Error('ZIP 해제 후 이미지 전체 용량은 80MB 이하여야 합니다.')
    const filename = path.split('/').at(-1)
    candidates.push({
      file: new File([bytes], filename, { type: detectedType, lastModified: zipFile.lastModified }),
      sortKey: path,
    })
  }

  if (candidates.length === 0) throw new Error('ZIP 안에 사용할 수 있는 JPG, PNG, WebP 이미지가 없습니다.')
  return sortProductImageCandidates(candidates)
}
