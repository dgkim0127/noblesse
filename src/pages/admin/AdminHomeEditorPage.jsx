import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Images,
  LifeBuoy,
  LayoutGrid,
  Megaphone,
  PackageSearch,
  RotateCcw,
  Send,
} from 'lucide-react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminVisualEditorShell } from '../../components/AdminVisualEditorShell'
import { useCommerce } from '../../commerce/commerceStore'
import { cloneHomeLayout, getHomeLayoutText, homeLayoutLocales, normalizeHomeLayout } from '../../config/homeLayout'
import { getLocalizedProductName } from '../../utils/locale'
import { HomePage } from '../HomePage'
import {
  AdminConfirmDialog,
  AdminLink,
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

function EditorInspector({ config, locale, products, selectedId, onChange }) {
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
      <label className="admin-home-editor-field"><span>로그인 회원 연결</span><input value={section.ctaApprovedPath} onChange={(event) => updateSection({ ctaApprovedPath: event.target.value })} /></label>
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

  const toggleSection = (sectionId) => {
    if (sectionId === 'showcase') return
    const sections = draft.sections.map((item) => item.id === sectionId ? { ...item, visible: !item.visible } : item)
    setDraft({ ...draft, sections })
  }
  const sectionIcon = (section) => {
    if (section.id === 'showcase') return Images
    if (section.type === 'campaign') return Megaphone
    if (section.id === 'support') return LifeBuoy
    return PackageSearch
  }
  const visualSections = [
    {
      id: 'header',
      label: '상단 공통 영역',
      description: '안내 띠와 고정 헤더',
      icon: LayoutGrid,
      status: !draft.header.showMarquee || draft.header.marquee?.[locale]?.trim() ? 'complete' : 'warning',
      statusLabel: '현재 언어 안내 문구',
    },
    ...draft.sections.map((section, index) => {
      const localeComplete = section.id === 'showcase'
        || (section.title?.[locale]?.trim() && section.note?.[locale]?.trim() && (section.type !== 'campaign' || section.ctaLabel?.[locale]?.trim()))
      return {
        id: section.id,
        label: sectionLabels[section.id],
        description: getHomeLayoutText(section.title, locale) || (section.visible ? '문구를 입력하세요' : '고객 홈에서 숨김'),
        icon: sectionIcon(section),
        moveDownDisabled: index === draft.sections.length - 1,
        moveUpDisabled: index <= 1,
        reorderable: section.id !== 'showcase',
        status: !section.visible ? 'neutral' : localeComplete ? 'complete' : 'warning',
        statusLabel: !section.visible ? '숨김' : localeComplete ? '현재 언어 준비 완료' : '현재 언어 문구 확인 필요',
        visible: section.visible,
        visibilityLocked: section.id === 'showcase',
      }
    }),
  ]

  return <>
    <AdminVisualEditorShell
      actions={<>
        <button disabled={saving} type="button" onClick={() => setConfirm({ type: 'reset' })}><RotateCcw size={16} />게시본 복원</button>
        {hasPermission('catalog.publish') ? <button className="primary-action" disabled={saving || !completion.isPublishable} type="button" onClick={() => setConfirm({ type: 'publish' })}><Send size={16} />고객 홈에 적용</button> : null}
      </>}
      activeDevice={device}
      activeLocale={locale}
      description="섹션 순서와 노출, 문구, 상품을 실제 화면에서 확인합니다."
      dirty={dirty}
      draggedSectionId={draggedId}
      inspector={<EditorInspector config={draft} locale={locale} products={products} selectedId={selectedId} onChange={setDraft} />}
      inspectorOpen={inspectorOpen}
      inspectorRef={inspectorRef}
      locales={homeLayoutLocales.map((key) => ({ key, label: localeLabels[key] }))}
      onCloseInspector={() => setInspectorOpen(false)}
      onDeviceChange={setDevice}
      onDragStartSection={setDraggedId}
      onDropSection={dropSection}
      onLocaleChange={setLocale}
      onMoveSection={moveSection}
      onReadinessClick={() => {
        if (completion.missing.length) setToast({ message: `공개 전 확인: ${completion.missing.slice(0, 3).join(', ')}`, tone: 'error' })
      }}
      onSelectSection={selectItem}
      onToggleSection={toggleSection}
      previewAriaLabel="실제 고객 홈 화면 편집 미리보기"
      readiness={{ ready: completion.isPublishable, label: completion.isPublishable ? '공개 준비 완료' : `${completion.missing.length}개 확인 필요` }}
      sections={visualSections}
      selectedSectionId={selectedId}
      title="메인 화면 편집"
    >
        <div className={`admin-home-editor-viewport is-${device}`}>
          <div className="admin-home-preview-header">
            {draft.header.showMarquee ? <div className="admin-home-preview-marquee">{getHomeLayoutText(draft.header.marquee, locale)}</div> : null}
            <div><strong>NOBLESSE</strong><span>피어싱, 재질, 스타일을 검색해보세요</span><small>MY · 견적 리스트</small></div>
          </div>
          <HomePage editorMode layoutOverride={draft} localeOverride={locale} selectedSectionId={selectedId} onSelectSection={selectItem} />
        </div>
    </AdminVisualEditorShell>

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
