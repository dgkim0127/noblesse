import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Images,
  LayoutGrid,
  Monitor,
  RotateCcw,
  Send,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { useCommerce } from '../../commerce/commerceStore'
import { cloneHomeLayout, getHomeLayoutText, homeLayoutLocales, normalizeHomeLayout } from '../../config/homeLayout'
import { getLocalizedProductName } from '../../utils/locale'
import { HomePage } from '../HomePage'
import {
  AdminConfirmDialog,
  AdminLink,
  AdminPageHeader,
  AdminSaveBar,
  AdminToast,
} from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const localeLabels = { kr: '한국어', en: 'English', jp: '日本語', 'zh-TW': '繁體中文' }
const sectionLabels = {
  showcase: '메인 스냅',
  categories: '카테고리 바로가기',
  'new-arrival': '신상품',
  'weekly-pick': '주간 추천',
  'buyer-selection': '바이어 셀렉션',
  'piercing-catalog': '피어싱',
  'steady-selection': '스테디 셀렉션',
  campaign: '견적 안내 배너',
  support: '이용 안내',
}

const deviceOptions = [
  { id: 'desktop', label: '데스크톱', icon: Monitor },
  { id: 'tablet', label: '태블릿', icon: Tablet },
  { id: 'mobile', label: '모바일', icon: Smartphone },
]

function completionFor(config) {
  const missing = []
  if (config.header.showMarquee) {
    homeLayoutLocales.forEach((locale) => {
      if (!config.header.marquee?.[locale]?.trim()) missing.push(`상단 띠 문구 · ${localeLabels[locale]}`)
    })
  }
  config.sections.filter((section) => section.visible && section.id !== 'showcase').forEach((section) => {
    homeLayoutLocales.forEach((locale) => {
      if (!section.title?.[locale]?.trim()) missing.push(`${sectionLabels[section.id]} 제목 · ${localeLabels[locale]}`)
      if (!section.note?.[locale]?.trim()) missing.push(`${sectionLabels[section.id]} 설명 · ${localeLabels[locale]}`)
      if (section.type === 'campaign' && !section.ctaLabel?.[locale]?.trim()) {
        missing.push(`견적 안내 버튼 · ${localeLabels[locale]}`)
      }
    })
  })
  return { isPublishable: missing.length === 0, missing }
}

function LocalizedInput({ label, locale, multiline = false, value, onChange }) {
  const Input = multiline ? 'textarea' : 'input'
  return <label className="admin-home-editor-field">
    <span>{label} <small>{localeLabels[locale]}</small></span>
    <Input rows={multiline ? 4 : undefined} value={value || ''} onChange={(event) => onChange(event.target.value)} />
  </label>
}

function EditorInspector({ config, locale, products, selectedId, onChange, onClose }) {
  const sectionIndex = config.sections.findIndex((section) => section.id === selectedId)
  const section = sectionIndex >= 0 ? config.sections[sectionIndex] : null
  const updateHeader = (patch) => onChange({ ...config, header: { ...config.header, ...patch } })
  const updateSection = (patch) => {
    const sections = config.sections.map((item, index) => index === sectionIndex ? { ...item, ...patch } : item)
    onChange({ ...config, sections })
  }
  const updateLocalized = (field, value) => updateSection({
    [field]: { ...(section[field] || {}), [locale]: value },
  })

  if (selectedId === 'header') {
    return <div className="admin-home-editor-inspector-body">
      <div className="admin-home-editor-inspector-heading">
        <div><small>공통 영역</small><h2>상단 안내 띠</h2></div>
        <button className="admin-home-editor-close" aria-label="설정 닫기" title="설정 닫기" type="button" onClick={onClose}><X size={18} /></button>
      </div>
      <label className="admin-home-editor-switch-row">
        <span><strong>안내 띠 표시</strong><small>쇼핑몰 최상단에 반복 문구를 표시합니다.</small></span>
        <input checked={config.header.showMarquee} type="checkbox" onChange={(event) => updateHeader({ showMarquee: event.target.checked })} />
      </label>
      <LocalizedInput label="안내 문구" locale={locale} value={config.header.marquee?.[locale]} onChange={(value) => updateHeader({ marquee: { ...config.header.marquee, [locale]: value } })} />
      <p className="admin-home-editor-help">로고, 검색, 로그인, 견적 리스트와 언어 선택은 고정 영역입니다.</p>
    </div>
  }

  if (!section) return null
  const source = section.productSource
  const pinned = new Set(source?.pinnedProductIds || [])

  return <div className="admin-home-editor-inspector-body">
    <div className="admin-home-editor-inspector-heading">
      <div><small>{section.visible ? '홈에 표시 중' : '숨김'}</small><h2>{sectionLabels[section.id]}</h2></div>
      <button className="admin-home-editor-close" aria-label="설정 닫기" title="설정 닫기" type="button" onClick={onClose}><X size={18} /></button>
    </div>

    {section.id !== 'showcase' ? <label className="admin-home-editor-switch-row">
      <span><strong>섹션 표시</strong><small>끄면 고객 홈에서 이 영역을 숨깁니다.</small></span>
      <input checked={section.visible} type="checkbox" onChange={(event) => updateSection({ visible: event.target.checked })} />
    </label> : null}

    {section.id === 'showcase' ? <div className="admin-home-editor-linked-setting">
      <Images aria-hidden="true" size={22} />
      <div><strong>스냅 사진과 문구</strong><p>사진 업로드, 초점, 슬라이드 순서는 전용 화면에서 관리합니다.</p></div>
      <AdminLink to="/admin/home-showcase">스냅 관리</AdminLink>
    </div> : <>
      <LocalizedInput label="제목" locale={locale} value={section.title?.[locale]} onChange={(value) => updateLocalized('title', value)} />
      <LocalizedInput label="설명" locale={locale} multiline value={section.note?.[locale]} onChange={(value) => updateLocalized('note', value)} />
    </>}

    {section.type === 'productCollection' ? <>
      <label className="admin-home-editor-field">
        <span>표시 방식</span>
        <select value={section.layout || 'grid'} onChange={(event) => updateSection({ layout: event.target.value })}>
          <option value="grid">상품 그리드</option>
          <option value="feature">대표 상품 + 추천 상품</option>
        </select>
      </label>
      <label className="admin-home-editor-field">
        <span>표시 상품 수 <b>{source.limit}</b></span>
        <input max="12" min="1" type="range" value={source.limit} onChange={(event) => updateSection({ productSource: { ...source, limit: Number(event.target.value) } })} />
      </label>
      <fieldset className="admin-home-product-picker">
        <legend>우선 노출 상품 <small>선택한 순서가 자동 선정보다 먼저 표시됩니다.</small></legend>
        <div>
          {products.slice(0, 40).map((product) => <label key={product.productId}>
            <input checked={pinned.has(product.productId)} type="checkbox" onChange={(event) => {
              const ids = event.target.checked
                ? [...pinned, product.productId]
                : [...pinned].filter((id) => id !== product.productId)
              updateSection({ productSource: { ...source, pinnedProductIds: ids } })
            }} />
            <span>{getLocalizedProductName(product, locale)}</span>
            <small>{product.productId}</small>
          </label>)}
        </div>
      </fieldset>
    </> : null}

    {section.type === 'campaign' ? <>
      <LocalizedInput label="작은 제목" locale={locale} value={section.eyebrow?.[locale]} onChange={(value) => updateLocalized('eyebrow', value)} />
      <LocalizedInput label="버튼 문구" locale={locale} value={section.ctaLabel?.[locale]} onChange={(value) => updateLocalized('ctaLabel', value)} />
      <label className="admin-home-editor-field"><span>비회원 연결</span><input value={section.ctaPath} onChange={(event) => updateSection({ ctaPath: event.target.value })} /></label>
      <label className="admin-home-editor-field"><span>승인 회원 연결</span><input value={section.ctaApprovedPath} onChange={(event) => updateSection({ ctaApprovedPath: event.target.value })} /></label>
    </> : null}

    {section.id === 'categories' ? <p className="admin-home-editor-help">카테고리 이름과 연결 상품은 상품 카테고리 설정을 사용합니다.</p> : null}
    {section.id === 'support' ? <p className="admin-home-editor-help">최근 본 상품, 상담 안내, 회사 정보 카드의 세부 내용은 공통 쇼핑몰 정보와 연결됩니다.</p> : null}
  </div>
}

export function AdminHomeEditorPage() {
  const { hasPermission } = useAdminAccess()
  const { products } = useCommerce()
  const mutate = useAdminApiMutation()
  const resource = useAdminApiResource((api, token) => api.getHomeLayout(token), [])
  const [draft, setDraft] = useState(null)
  const [savedDraft, setSavedDraft] = useState(null)
  const [revision, setRevision] = useState(1)
  const [selectedId, setSelectedId] = useState('showcase')
  const [locale, setLocale] = useState('kr')
  const [device, setDevice] = useState('desktop')
  const [draggedId, setDraggedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const inspectorRef = useRef(null)

  useEffect(() => {
    if (resource.status !== 'ready' || !resource.data?.draftConfig) return
    const next = normalizeHomeLayout(resource.data.draftConfig)
    setDraft(cloneHomeLayout(next))
    setSavedDraft(cloneHomeLayout(next))
    setRevision(resource.data.draftRevision || 1)
  }, [resource.data, resource.status])

  useEffect(() => {
    if (!inspectorOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setInspectorOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [inspectorOpen])

  const dirty = useMemo(() => Boolean(draft && savedDraft && JSON.stringify(draft) !== JSON.stringify(savedDraft)), [draft, savedDraft])
  const completion = useMemo(() => draft ? completionFor(draft) : { isPublishable: false, missing: [] }, [draft])

  if (shouldShowAdminApiState(resource.status)) return <AdminApiState error={resource.error} status={resource.status} />
  if (!draft) return <AdminApiState error="홈 화면 설정을 불러오지 못했습니다." status="error" />

  const applyServerState = (data) => {
    const next = normalizeHomeLayout(data.draftConfig)
    setDraft(cloneHomeLayout(next))
    setSavedDraft(cloneHomeLayout(next))
    setRevision(data.draftRevision)
  }

  const saveDraft = async ({ quiet = false } = {}) => {
    setSaving(true)
    try {
      const result = await mutate((api, token) => api.saveHomeLayoutDraft(draft, revision, token))
      applyServerState(result.data)
      if (!quiet) setToast({ message: '홈 화면 초안을 저장했습니다.', tone: 'success' })
      return result.data
    } catch (error) {
      setToast({ message: error?.message || '초안을 저장하지 못했습니다.', tone: 'error' })
      return null
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    setConfirm(null)
    setSaving(true)
    try {
      let nextRevision = revision
      if (dirty) {
        const saved = await mutate((api, token) => api.saveHomeLayoutDraft(draft, revision, token))
        applyServerState(saved.data)
        nextRevision = saved.data.draftRevision
      }
      const result = await mutate((api, token) => api.publishHomeLayout(nextRevision, token))
      applyServerState(result.data)
      setToast({ message: '고객 홈에 새 구성을 적용했습니다.', tone: 'success' })
    } catch (error) {
      setToast({ message: error?.message || '홈 화면을 적용하지 못했습니다.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const resetToPublished = async () => {
    setConfirm(null)
    setSaving(true)
    try {
      const result = await mutate((api, token) => api.resetHomeLayoutDraft(revision, token))
      applyServerState(result.data)
      setToast({ message: '게시 중인 홈 화면으로 초안을 되돌렸습니다.', tone: 'success' })
    } catch (error) {
      setToast({ message: error?.message || '초안을 되돌리지 못했습니다.', tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const selectItem = (id) => {
    setSelectedId(id)
    setInspectorOpen(true)
    window.requestAnimationFrame(() => inspectorRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const moveSection = (sectionId, direction) => {
    if (sectionId === 'showcase') return
    const sections = [...draft.sections]
    const index = sections.findIndex((section) => section.id === sectionId)
    const target = Math.max(1, Math.min(sections.length - 1, index + direction))
    if (index < 0 || target === index) return
    const [moved] = sections.splice(index, 1)
    sections.splice(target, 0, moved)
    setDraft({ ...draft, sections })
  }

  const dropSection = (targetId) => {
    if (!draggedId || draggedId === 'showcase' || targetId === 'showcase' || draggedId === targetId) return
    const sections = [...draft.sections]
    const from = sections.findIndex((section) => section.id === draggedId)
    const to = sections.findIndex((section) => section.id === targetId)
    const [moved] = sections.splice(from, 1)
    sections.splice(to, 0, moved)
    setDraft({ ...draft, sections })
    setDraggedId('')
  }

  return <>
    <AdminPageHeader
      eyebrow="홈 운영"
      title="메인 화면 편집"
      description="고객이 보는 홈을 확인하면서 섹션 순서, 문구와 노출 상품을 정리합니다."
      actions={<>
        <button disabled={saving} type="button" onClick={() => setConfirm({ type: 'reset' })}><RotateCcw size={16} /> 게시본으로 되돌리기</button>
        {hasPermission('catalog.publish') ? <button className="primary-action" disabled={saving || !completion.isPublishable} type="button" onClick={() => setConfirm({ type: 'publish' })}><Send size={16} /> 고객 홈에 적용</button> : null}
      </>}
    />

    <div className="admin-home-editor-toolbar">
      <div className="admin-home-editor-locales" role="tablist" aria-label="미리보기 언어">
        {homeLayoutLocales.map((item) => <button aria-selected={locale === item} className={locale === item ? 'is-active' : undefined} key={item} role="tab" type="button" onClick={() => setLocale(item)}>{localeLabels[item]}</button>)}
      </div>
      <div className="admin-home-editor-devices" aria-label="미리보기 화면 크기">
        {deviceOptions.map(({ id, label, icon: Icon }) => <button aria-label={label} aria-pressed={device === id} className={device === id ? 'is-active' : undefined} key={id} title={label} type="button" onClick={() => setDevice(id)}><Icon size={17} /></button>)}
      </div>
      <button className={`admin-home-editor-readiness${completion.isPublishable ? ' is-ready' : ''}`} type="button" onClick={() => {
        if (completion.missing.length) setToast({ message: `공개 전 확인: ${completion.missing.slice(0, 3).join(', ')}`, tone: 'error' })
      }}>
        {completion.isPublishable ? <Check size={16} /> : null}
        {completion.isPublishable ? '공개 준비 완료' : `${completion.missing.length}개 확인 필요`}
      </button>
    </div>

    <section className={`admin-home-editor-workspace${inspectorOpen ? ' is-inspector-open' : ''}`}>
      <nav className="admin-home-editor-components" aria-label="홈 화면 구성">
        <button className={selectedId === 'header' ? 'is-selected' : undefined} type="button" onClick={() => selectItem('header')}>
          <LayoutGrid aria-hidden="true" size={18} /><span><strong>상단 공통 영역</strong><small>안내 띠와 고정 헤더</small></span>
        </button>
        <div className="admin-home-editor-component-list">
          {draft.sections.map((section, index) => <div
            className={`admin-home-editor-component${selectedId === section.id ? ' is-selected' : ''}${section.visible ? '' : ' is-hidden'}`}
            draggable={section.id !== 'showcase'}
            key={section.id}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedId(section.id)}
            onDrop={() => dropSection(section.id)}
          >
            <button className="admin-home-editor-drag" aria-label={`${sectionLabels[section.id]} 순서 이동`} disabled={section.id === 'showcase'} title="끌어서 순서 변경" type="button"><GripVertical size={16} /></button>
            <button className="admin-home-editor-component-main" type="button" onClick={() => selectItem(section.id)}>
              <span><strong>{sectionLabels[section.id]}</strong><small>{getHomeLayoutText(section.title, locale)}</small></span>
            </button>
            <button aria-label={section.visible ? '숨기기' : '표시하기'} className="admin-home-editor-visibility" disabled={section.id === 'showcase'} title={section.visible ? '숨기기' : '표시하기'} type="button" onClick={() => {
              const sections = draft.sections.map((item) => item.id === section.id ? { ...item, visible: !item.visible } : item)
              setDraft({ ...draft, sections })
            }}>{section.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
            <span className="admin-home-editor-order-buttons">
              <button aria-label="위로 이동" disabled={section.id === 'showcase' || index <= 1} title="위로 이동" type="button" onClick={() => moveSection(section.id, -1)}><ArrowUp size={14} /></button>
              <button aria-label="아래로 이동" disabled={section.id === 'showcase' || index === draft.sections.length - 1} title="아래로 이동" type="button" onClick={() => moveSection(section.id, 1)}><ArrowDown size={14} /></button>
            </span>
          </div>)}
        </div>
      </nav>

      <button className="admin-home-editor-backdrop" aria-label="설정 닫기" type="button" onClick={() => setInspectorOpen(false)} />
      <aside className="admin-home-editor-inspector" ref={inspectorRef}>
        <EditorInspector config={draft} locale={locale} products={products} selectedId={selectedId} onChange={setDraft} onClose={() => setInspectorOpen(false)} />
      </aside>

      <div className="admin-home-editor-canvas">
        <div className={`admin-home-editor-viewport is-${device}`}>
          <div className="admin-home-preview-header">
            {draft.header.showMarquee ? <div className="admin-home-preview-marquee">{getHomeLayoutText(draft.header.marquee, locale)}</div> : null}
            <div><strong>NOBLESSE</strong><span>피어싱, 재질, 스타일을 검색해보세요</span><small>MY · 견적 리스트</small></div>
          </div>
          <HomePage editorMode layoutOverride={draft} localeOverride={locale} selectedSectionId={selectedId} onSelectSection={selectItem} />
        </div>
      </div>
    </section>

    <AdminSaveBar visible={dirty} saving={saving} dirtyLabel="홈 화면 초안에 저장하지 않은 변경이 있습니다." saveLabel="초안 저장" onDiscard={() => setDraft(cloneHomeLayout(savedDraft))} onSave={() => saveDraft()} />
    <AdminConfirmDialog
      busy={saving}
      confirmDisabled={confirm?.type === 'publish' && !completion.isPublishable}
      confirmLabel={confirm?.type === 'publish' ? '고객 홈에 적용' : '게시본으로 되돌리기'}
      description={confirm?.type === 'publish' ? '현재 초안을 저장하고 고객이 보는 홈 화면에 적용합니다.' : '저장 중인 초안을 버리고 현재 고객 홈 구성을 다시 불러옵니다.'}
      open={Boolean(confirm)}
      title={confirm?.type === 'publish' ? '홈 화면을 적용할까요?' : '초안을 되돌릴까요?'}
      onCancel={() => !saving && setConfirm(null)}
      onConfirm={confirm?.type === 'publish' ? publish : resetToPublished}
    />
    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
