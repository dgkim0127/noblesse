import { ImagePlus, RefreshCw, Save, Send, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCommerce } from '../commerce/commerceStore'
import {
  getAdminSnapshot,
  publishAdminProduct,
  rebuildAdminProjection,
  saveAdminContent,
  saveAdminPrice,
  saveAdminProduct,
  updateAdminBuyer,
  updateAdminInquiry,
  uploadProductVariant,
} from '../services/adminGatewayService'
import { getHybridGatewayErrorMessage } from '../services'
import { formatMoney } from '../utils/commerce'

const tabs = [['buyers', '바이어 승인'], ['inquiries', '견적 처리'], ['products', '상품 및 이미지'], ['prices', '시장별 가격'], ['content', '카테고리와 콘텐츠']]
const markets = ['KR', 'JP', 'US', 'CN', 'GLOBAL']
const emptyProduct = {
  productId: '', code: '', categoryId: '', collectionIds: [], nameKo: '', nameEn: '', nameJa: '', nameZh: '',
  descriptionKo: '', descriptionEn: '', descriptionJa: '', descriptionZh: '', material: '', colors: [], sizes: [],
  leadTime: '', origin: 'KR', tone: '', badge: '', imageSet: {}, imagePaths: {}, imageAlt: {},
  isNew: false, isBest: false, isExportAvailable: true, sortOrder: 0,
}

const toList = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
const fieldValue = (value) => Array.isArray(value) ? value.join(', ') : value || ''

function AdminNotice({ children, tone = 'info' }) {
  return <p className={`admin-notice ${tone}`} role={tone === 'error' ? 'alert' : undefined}>{children}</p>
}

function BuyerRow({ buyer, onSaved }) {
  const [draft, setDraft] = useState({
    status: buyer.status === 'email_verification_pending' ? 'pending' : buyer.status,
    assignedMarket: buyer.assignedMarket || 'KR',
    discountRate: buyer.discountRate || 0,
    minOrderAmount: buyer.minOrderAmount || 0,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setSaving(true); setError('')
    try { await updateAdminBuyer({ buyerUid: buyer.uid, ...draft }); await onSaved() } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } finally { setSaving(false) }
  }

  return <article className="admin-row admin-buyer-row">
    <div><strong>{buyer.companyName}</strong><span>{buyer.contactName} · {buyer.email}</span><small>{buyer.country} · {buyer.preferredLanguage}</small></div>
    <label>상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="pending">보류</option><option value="approved">승인</option><option value="blocked">차단</option></select></label>
    <label>배정 시장<select value={draft.assignedMarket} disabled={draft.status !== 'approved'} onChange={(event) => setDraft({ ...draft, assignedMarket: event.target.value })}>{markets.map((market) => <option key={market}>{market}</option>)}</select></label>
    <label>할인율(%)<input min="0" max="100" type="number" value={draft.discountRate} onChange={(event) => setDraft({ ...draft, discountRate: Number(event.target.value) })} /></label>
    <label>최소 문의 금액<input min="0" type="number" value={draft.minOrderAmount} onChange={(event) => setDraft({ ...draft, minOrderAmount: event.target.value })} /></label>
    <button className="secondary-action" disabled={saving} type="button" onClick={() => { void save() }}>저장</button>
    {error && <AdminNotice tone="error">{error}</AdminNotice>}
  </article>
}

function InquiryRow({ inquiry, onSaved }) {
  const [draft, setDraft] = useState({ status: inquiry.status, finalTotal: inquiry.finalTotal ?? inquiry.estimatedTotal, adminMemo: inquiry.adminMemo || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setSaving(true); setError('')
    try { await updateAdminInquiry({ inquiryId: inquiry.inquiryId, ...draft }); await onSaved() } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } finally { setSaving(false) }
  }

  return <article className="admin-row admin-inquiry-row">
    <div><strong>{inquiry.inquiryId}</strong><span>{inquiry.buyerCompanyName} · {inquiry.totalItems}개 품목 / {inquiry.totalQuantity} pcs</span><small>예상 {formatMoney(inquiry.estimatedTotal, inquiry.currency)}</small></div>
    <label>상태<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>{['requested', 'checking', 'quoted', 'confirmed', 'cancelled'].map((status) => <option key={status}>{status}</option>)}</select></label>
    <label>최종 금액<input min="0" type="number" value={draft.finalTotal} onChange={(event) => setDraft({ ...draft, finalTotal: event.target.value })} /></label>
    <label className="admin-wide">바이어 공개 메모<textarea maxLength="2000" value={draft.adminMemo} onChange={(event) => setDraft({ ...draft, adminMemo: event.target.value })} /></label>
    <button className="secondary-action" disabled={saving} type="button" onClick={() => { void save() }}>견적 공개 및 저장</button>
    {error && <AdminNotice tone="error">{error}</AdminNotice>}
  </article>
}

function ProductEditor({ products, categories, onSaved }) {
  const [draft, setDraft] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = (name, value) => setDraft((current) => ({ ...current, [name]: value }))
  const chooseProduct = (productId) => setDraft(products.find((product) => product.productId === productId) || emptyProduct)
  const upload = async (variant, file) => {
    if (!draft.productId) { setError('이미지를 올리기 전에 상품 ID를 입력하고 임시 저장해주세요.'); return }
    setSaving(true); setError('')
    try {
      const uploaded = await uploadProductVariant({ productId: draft.productId, variant, file })
      setDraft((current) => ({ ...current, imageSet: { ...current.imageSet, [variant]: uploaded.url }, imagePaths: { ...current.imagePaths, [variant]: uploaded.path } }))
    } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } finally { setSaving(false) }
  }
  const save = async () => {
    setSaving(true); setError('')
    try {
      await saveAdminProduct({ ...draft, collectionIds: toList(draft.collectionIds), colors: toList(draft.colors), sizes: toList(draft.sizes), sortOrder: Number(draft.sortOrder) || 0 })
      await onSaved()
    } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } finally { setSaving(false) }
  }
  const publish = async (isVisible) => {
    setSaving(true); setError('')
    try { await publishAdminProduct(draft.productId, isVisible); await onSaved() } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } finally { setSaving(false) }
  }

  return <section className="admin-editor">
    <div className="admin-editor-toolbar"><label>기존 상품<select value={draft.productId} onChange={(event) => chooseProduct(event.target.value)}><option value="">새 상품</option>{products.map((product) => <option key={product.productId} value={product.productId}>{product.code} · {product.nameEn}</option>)}</select></label><button className="secondary-action" type="button" onClick={() => setDraft(emptyProduct)}>새 상품</button></div>
    <div className="admin-form-grid">
      <label>상품 ID<input value={draft.productId} placeholder="NB-001" onChange={(event) => update('productId', event.target.value.toUpperCase())} /></label>
      <label>상품 코드<input value={draft.code} onChange={(event) => update('code', event.target.value.toUpperCase())} /></label>
      <label>카테고리<select value={draft.categoryId} onChange={(event) => update('categoryId', event.target.value)}><option value="">선택</option>{categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.nameEn}</option>)}</select></label>
      <label>컬렉션 ID<input value={fieldValue(draft.collectionIds)} onChange={(event) => update('collectionIds', event.target.value)} /></label>
      <label>영문 상품명<input value={draft.nameEn} onChange={(event) => update('nameEn', event.target.value)} /></label>
      <label>국문 상품명<input value={draft.nameKo} onChange={(event) => update('nameKo', event.target.value)} /></label>
      <label>일문 상품명<input value={draft.nameJa} onChange={(event) => update('nameJa', event.target.value)} /></label>
      <label>중문 상품명<input value={draft.nameZh} onChange={(event) => update('nameZh', event.target.value)} /></label>
      <label>재질<input value={draft.material} onChange={(event) => update('material', event.target.value)} /></label>
      <label>색상(쉼표 구분)<input value={fieldValue(draft.colors)} onChange={(event) => update('colors', event.target.value)} /></label>
      <label>사이즈(쉼표 구분)<input value={fieldValue(draft.sizes)} onChange={(event) => update('sizes', event.target.value)} /></label>
      <label>리드 타임<input value={draft.leadTime} onChange={(event) => update('leadTime', event.target.value)} /></label>
      <label>정렬 순서<input type="number" value={draft.sortOrder} onChange={(event) => update('sortOrder', Number(event.target.value))} /></label>
      <label>영문 설명<textarea value={draft.descriptionEn} onChange={(event) => update('descriptionEn', event.target.value)} /></label>
      <label>국문 설명<textarea value={draft.descriptionKo} onChange={(event) => update('descriptionKo', event.target.value)} /></label>
    </div>
    <div className="admin-image-grid">{['thumb', 'card', 'detail', 'zoom'].map((variant) => <label key={variant}><ImagePlus size={16} /> {variant} WebP<input accept="image/webp" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(variant, file) }} /><small>{draft.imagePaths?.[variant] ? '업로드됨' : '필수'}</small></label>)}</div>
    <div className="admin-editor-actions"><button className="primary-action" disabled={saving} type="button" onClick={() => { void save() }}><Save size={16} /> 임시 저장</button><button className="secondary-action" disabled={saving || !draft.productId} type="button" onClick={() => { void publish(true) }}>공개</button><button className="secondary-action" disabled={saving || !draft.productId} type="button" onClick={() => { void publish(false) }}>비공개</button></div>
    {error && <AdminNotice tone="error">{error}</AdminNotice>}
  </section>
}

function PriceEditor({ products, prices, onSaved }) {
  const [price, setPrice] = useState({ productId: '', market: 'KR', wholesalePrice: '', retailPrice: '', moq: 1, minOrderAmount: 0, isActive: true })
  const [error, setError] = useState('')
  const choosePrice = (value) => {
    const [productId, market] = value.split(':')
    const selected = prices.find((item) => item.productId === productId && item.market === market)
    if (selected) setPrice(selected)
  }
  const save = async () => { try { setError(''); await saveAdminPrice({ ...price, moq: Number(price.moq) }); await onSaved() } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } }
  return <section className="admin-editor"><div className="admin-editor-toolbar"><label>기존 시장 가격<select value={`${price.productId}:${price.market}`} onChange={(event) => choosePrice(event.target.value)}><option value=":">새 시장 가격</option>{prices.map((item) => <option key={`${item.productId}:${item.market}`} value={`${item.productId}:${item.market}`}>{item.productId} · {item.market}</option>)}</select></label></div><div className="admin-form-grid"><label>상품<select value={price.productId} onChange={(event) => setPrice({ ...price, productId: event.target.value })}><option value="">선택</option>{products.map((product) => <option key={product.productId} value={product.productId}>{product.code} · {product.nameEn}</option>)}</select></label><label>시장<select value={price.market} onChange={(event) => setPrice({ ...price, market: event.target.value })}>{markets.map((market) => <option key={market}>{market}</option>)}</select></label><label>도매가<input min="0" type="number" value={price.wholesalePrice} onChange={(event) => setPrice({ ...price, wholesalePrice: event.target.value })} /></label><label>권장가<input min="0" type="number" value={price.retailPrice} onChange={(event) => setPrice({ ...price, retailPrice: event.target.value })} /></label><label>MOQ<input min="1" type="number" value={price.moq} onChange={(event) => setPrice({ ...price, moq: event.target.value })} /></label><label>최소 문의 금액<input min="0" type="number" value={price.minOrderAmount} onChange={(event) => setPrice({ ...price, minOrderAmount: event.target.value })} /></label></div><button className="primary-action" type="button" onClick={() => { void save() }}>가격 저장</button>{error && <AdminNotice tone="error">{error}</AdminNotice>}</section>
}

function ContentEditor({ snapshot, onSaved }) {
  const [kind, setKind] = useState('category')
  const [record, setRecord] = useState({ categoryId: '', nameEn: '', nameKo: '', coverUrl: '', isVisible: true, sortOrder: 0 })
  const [error, setError] = useState('')
  const changeKind = (nextKind) => {
    setKind(nextKind)
    if (nextKind === 'category') setRecord({ categoryId: '', nameEn: '', nameKo: '', coverUrl: '', isVisible: true, sortOrder: 0 })
    else if (nextKind === 'collection') setRecord({ collectionId: '', titleEn: '', titleKo: '', coverUrl: '', isVisible: true, sortOrder: 0 })
    else if (nextKind === 'banner') setRecord({ bannerId: '', titleEn: '', titleKo: '', imageUrl: '', linkPath: '/products', isVisible: true, sortOrder: 0 })
    else setRecord({ fileId: '', title: '', storagePath: 'noblesse/catalogs/KR/', allowedMarkets: ['KR'], isVisible: true })
  }
  const save = async () => { try { setError(''); await saveAdminContent(kind, { ...record, sortOrder: Number(record.sortOrder) || 0, allowedMarkets: toList(record.allowedMarkets) }); await onSaved() } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } }
  const rows = kind === 'category' ? snapshot.categories : kind === 'collection' ? snapshot.collections : kind === 'banner' ? snapshot.banners : snapshot.catalogFiles
  const idKey = kind === 'category' ? 'categoryId' : kind === 'collection' ? 'collectionId' : kind === 'banner' ? 'bannerId' : 'fileId'
  return <section className="admin-editor"><div className="admin-editor-toolbar"><label>콘텐츠 종류<select value={kind} onChange={(event) => changeKind(event.target.value)}><option value="category">카테고리</option><option value="collection">컬렉션</option><option value="banner">배너</option><option value="catalogFile">카탈로그 파일</option></select></label></div><div className="admin-form-grid"><label>ID<input value={record[idKey] || ''} onChange={(event) => setRecord({ ...record, [idKey]: event.target.value })} /></label>{kind === 'category' && <><label>영문명<input value={record.nameEn || ''} onChange={(event) => setRecord({ ...record, nameEn: event.target.value })} /></label><label>국문명<input value={record.nameKo || ''} onChange={(event) => setRecord({ ...record, nameKo: event.target.value })} /></label><label>커버 URL<input value={record.coverUrl || ''} onChange={(event) => setRecord({ ...record, coverUrl: event.target.value })} /></label></>}{kind === 'collection' && <><label>영문명<input value={record.titleEn || ''} onChange={(event) => setRecord({ ...record, titleEn: event.target.value })} /></label><label>국문명<input value={record.titleKo || ''} onChange={(event) => setRecord({ ...record, titleKo: event.target.value })} /></label><label>커버 URL<input value={record.coverUrl || ''} onChange={(event) => setRecord({ ...record, coverUrl: event.target.value })} /></label></>}{kind === 'banner' && <><label>영문 제목<input value={record.titleEn || ''} onChange={(event) => setRecord({ ...record, titleEn: event.target.value })} /></label><label>이미지 URL<input value={record.imageUrl || ''} onChange={(event) => setRecord({ ...record, imageUrl: event.target.value })} /></label><label>연결 경로<input value={record.linkPath || ''} onChange={(event) => setRecord({ ...record, linkPath: event.target.value })} /></label></>}{kind === 'catalogFile' && <><label>제목<input value={record.title || ''} onChange={(event) => setRecord({ ...record, title: event.target.value })} /></label><label>Firebase Storage 경로<input value={record.storagePath || ''} onChange={(event) => setRecord({ ...record, storagePath: event.target.value })} /></label><label>허용 시장(쉼표 구분)<input value={fieldValue(record.allowedMarkets)} onChange={(event) => setRecord({ ...record, allowedMarkets: event.target.value })} /></label></>}<label>정렬<input type="number" value={record.sortOrder || 0} onChange={(event) => setRecord({ ...record, sortOrder: event.target.value })} /></label></div><button className="primary-action" type="button" onClick={() => { void save() }}>콘텐츠 저장</button>{error && <AdminNotice tone="error">{error}</AdminNotice>}<div className="admin-content-list">{rows.map((row) => { const rowId = row[idKey] || row.banner_id || row.file_id; return <span key={rowId}>{rowId} · {row.nameEn || row.titleEn || row.title}</span> })}</div></section>
}

export function AdminPage() {
  const { isAdmin, isHybridMode, loading: commerceLoading } = useCommerce()
  const [activeTab, setActiveTab] = useState('buyers')
  const [snapshot, setSnapshot] = useState({ buyers: [], inquiries: [], products: [], prices: [], categories: [], collections: [], banners: [], catalogFiles: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!isHybridMode || !isAdmin) return
    setLoading(true); setError('')
    try { setSnapshot(await getAdminSnapshot()) } catch (nextError) { setError(getHybridGatewayErrorMessage(nextError)) } finally { setLoading(false) }
  }, [isAdmin, isHybridMode])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])
  const content = useMemo(() => ({
    buyers: <div className="admin-list">{snapshot.buyers.map((buyer) => <BuyerRow buyer={buyer} key={buyer.uid} onSaved={load} />)}</div>,
    inquiries: <div className="admin-list">{snapshot.inquiries.map((inquiry) => <InquiryRow inquiry={inquiry} key={inquiry.inquiryId} onSaved={load} />)}</div>,
    products: <ProductEditor categories={snapshot.categories} products={snapshot.products} onSaved={load} />,
    prices: <PriceEditor prices={snapshot.prices} products={snapshot.products} onSaved={load} />,
    content: <ContentEditor snapshot={snapshot} onSaved={load} />,
  }), [load, snapshot])

  if (commerceLoading) return <main className="admin-page"><p>관리자 권한을 확인하고 있습니다.</p></main>
  if (!isHybridMode || !isAdmin) return <main className="admin-page"><section className="admin-access-denied"><ShieldCheck size={32} /><h1>관리자 접근이 제한되어 있습니다.</h1><p>Firebase Auth에 noblesseAdmin 권한이 있는 계정으로 로그인해야 합니다.</p><Link className="secondary-action" to="/login">로그인</Link></section></main>
  return <main className="admin-page"><header className="admin-header"><div><p>NOBLESSE OPERATIONS</p><h1>귀족 B2B 관리자</h1></div><div><button className="secondary-action" disabled={loading} type="button" onClick={() => { void load() }}><RefreshCw size={16} /> 새로고침</button><button className="primary-action" disabled={loading} type="button" onClick={() => { void rebuildAdminProjection().then(load).catch((nextError) => setError(getHybridGatewayErrorMessage(nextError))) }}><Send size={16} /> 구매자 화면 동기화</button></div></header><nav className="admin-tabs">{tabs.map(([key, label]) => <button className={activeTab === key ? 'active' : ''} key={key} type="button" onClick={() => setActiveTab(key)}>{label}</button>)}</nav>{error && <AdminNotice tone="error">{error}</AdminNotice>}{loading ? <p>운영 데이터를 불러오는 중입니다.</p> : content[activeTab]}</main>
}
