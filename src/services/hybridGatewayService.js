import { httpsCallable } from 'firebase/functions'
import { functions, isHybridCommerceMode } from '../firebase'

const requireHybridGateway = () => {
  if (!isHybridCommerceMode || !functions) throw new Error('Noblesse hybrid commerce is not configured.')
}

const call = async (name, payload = {}) => {
  requireHybridGateway()
  const result = await httpsCallable(functions, name)(payload)
  return result.data
}

export const getHybridBuyerProfile = () => call('noblesseGetBuyerProfile')
export const getHybridCatalog = () => call('noblesseGetCatalog')
export const getHybridInquiries = () => call('noblesseGetMyInquiries')
export const submitHybridInquiry = ({ items, requestMemo }) => call('noblesseSubmitInquiry', { items, requestMemo })
export const registerHybridBuyer = (profile) => call('noblesseRegisterBuyer', profile)
export const getHybridCatalogFileLink = (fileId) => call('noblesseGetCatalogFileLink', { fileId })

export const getHybridGatewayErrorMessage = (error) => {
  if (error?.code === 'functions/unauthenticated') return '로그인이 필요합니다.'
  if (error?.code === 'functions/permission-denied') return '이 기능을 사용할 권한이 없습니다.'
  if (error?.code === 'functions/failed-precondition') return error.message || '현재 요청을 진행할 수 없습니다.'
  if (error?.code === 'functions/resource-exhausted') return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  return error?.message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
}
