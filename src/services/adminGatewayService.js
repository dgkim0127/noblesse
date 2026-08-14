import { httpsCallable } from 'firebase/functions'
import { functions, isHybridCommerceMode } from '../firebase'

const callAdmin = async (name, payload = {}) => {
  if (!isHybridCommerceMode || !functions) throw new Error('Noblesse hybrid commerce is not configured.')
  const result = await httpsCallable(functions, name)(payload)
  return result.data
}

export const getAdminSnapshot = () => callAdmin('noblesseAdminList')
export const updateAdminBuyer = (payload) => callAdmin('noblesseAdminUpdateBuyer', payload)
export const updateAdminInquiry = (payload) => callAdmin('noblesseAdminUpdateInquiry', payload)
export const saveAdminProduct = (product) => callAdmin('noblesseAdminSaveProduct', { product })
export const publishAdminProduct = (productId, isVisible) => callAdmin('noblesseAdminPublishProduct', { productId, isVisible })
export const saveAdminPrice = (price) => callAdmin('noblesseAdminSavePrice', { price })
export const saveAdminContent = (kind, record) => callAdmin('noblesseAdminSaveContent', { kind, record })
export const rebuildAdminProjection = () => callAdmin('noblesseAdminRebuildProjection')

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(new Error('이미지 파일을 읽지 못했습니다.'))
  reader.onload = () => resolve(String(reader.result || '').split(',', 2)[1] || '')
  reader.readAsDataURL(file)
})

export const uploadProductVariant = async ({ productId, variant, file }) => {
  if (!file || file.type !== 'image/webp' || file.size >= 10 * 1024 * 1024) {
    throw new Error('각 이미지는 10MB 미만의 WebP 파일이어야 합니다.')
  }
  return callAdmin('noblesseAdminUploadProductImage', {
    productId,
    variant,
    fileName: file.name,
    base64: await fileToBase64(file),
  })
}
