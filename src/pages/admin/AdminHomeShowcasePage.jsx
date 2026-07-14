import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAdminAccess } from '../../components/AdminAccessContext'
import { AdminConfirmDialog, AdminEmptyState, AdminPageHeader, AdminToast } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'

const languages = [
  { key: 'kr', label: '한국어' },
  { key: 'en', label: 'English' },
  { key: 'jp', label: '日本語' },
  { key: 'zh-TW', label: '繁體中文' },
]

const emptyLocalized = () => Object.fromEntries(languages.map(({ key }) => [key, '']))
const createEmptyForm = () => ({
  internalName: '',
  label: 'NEW',
  targetUrl: '/products',
  title: emptyLocalized(),
  eyebrow: emptyLocalized(),
  description: emptyLocalized(),
})

function slideToForm(slide) {
  return {
    internalName: slide.internalName || '',
    label: slide.label || '',
    targetUrl: slide.targetUrl || '/products',
    title: { ...emptyLocalized(), ...(slide.title || {}) },
    eyebrow: { ...emptyLocalized(), ...(slide.eyebrow || {}) },
    description: { ...emptyLocalized(), ...(slide.description || {}) },
  }
}

function formPayload(form) {
  return {
    internalName: form.internalName.trim(),
    label: form.label.trim(),
    targetUrl: form.targetUrl.trim(),
    title: Object.fromEntries(languages.map(({ key }) => [key, form.title[key].trim()])),
    eyebrow: Object.fromEntries(languages.map(({ key }) => [key, form.eyebrow[key].trim()])),
    description: Object.fromEntries(languages.map(({ key }) => [key, form.description[key].trim()])),
  }
}

function missingLabel(missing = []) {
  const titleLocales = missing
    .filter((field) => field.startsWith('title.'))
    .map((field) => languages.find(({ key }) => key === field.slice(6))?.label)
    .filter(Boolean)
  const parts = []
  if (titleLocales.length) parts.push(`제목: ${titleLocales.join(', ')}`)
  if (missing.includes('image')) parts.push('대표 사진')
  if (missing.includes('targetUrl')) parts.push('연결 경로')
  return parts.join(' / ')
}

export function AdminHomeShowcasePage() {
  const { hasPermission } = useAdminAccess()
  const canWrite = hasPermission('catalog.write')
  const canPublish = hasPermission('catalog.publish')
  const [refreshKey, setRefreshKey] = useState(0)
  const [editor, setEditor] = useState(null)
  const [form, setForm] = useState(createEmptyForm)
  const [activeLanguage, setActiveLanguage] = useState('kr')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [busyId, setBusyId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast, setToast] = useState({ message: '', tone: 'success' })
  const mutate = useAdminApiMutation()
  const { data, error, status } = useAdminApiResource(
    (api, token) => api.getHomeShowcase(token),
    [refreshKey],
  )
  const slides = useMemo(() => data?.slides || [], [data])
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return undefined
    }
    const objectUrl = URL.createObjectURL(imageFile)
    setImagePreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [imageFile])

  if (apiState) return apiState

  const closeEditor = () => {
    setEditor(null)
    setForm(createEmptyForm())
    setImageFile(null)
    setActiveLanguage('kr')
  }

  const openCreate = () => {
    setEditor({ mode: 'create', id: '', image: '' })
    setForm(createEmptyForm())
    setImageFile(null)
    setActiveLanguage('kr')
  }

  const openEdit = (slide) => {
    setEditor({ mode: 'edit', id: slide.id, image: slide.imageSet?.card || slide.imageSet?.detail || '' })
    setForm(slideToForm(slide))
    setImageFile(null)
    setActiveLanguage('kr')
  }

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const setLocalizedField = (field, value) => setForm((current) => ({
    ...current,
    [field]: { ...current[field], [activeLanguage]: value },
  }))

  const saveSlide = async (event) => {
    event.preventDefault()
    setBusyId(editor?.id || 'create')
    let createdId = ''
    try {
      const result = editor?.mode === 'edit'
        ? await mutate((api, token) => api.updateHomeShowcaseSlide(editor.id, formPayload(form), token))
        : await mutate((api, token) => api.createHomeShowcaseSlide(formPayload(form), token))
      const savedId = result.data?.id || editor?.id
      if (editor?.mode === 'create' && savedId) {
        createdId = savedId
        setEditor({ mode: 'edit', id: savedId, image: '' })
      }
      if (imageFile && savedId) {
        const upload = new FormData()
        upload.append('image', imageFile)
        await mutate((api, token) => api.uploadHomeShowcaseImage(savedId, upload, token))
      }
      setToast({ message: '홈 스냅을 저장했습니다.', tone: 'success' })
      closeEditor()
      setRefreshKey((current) => current + 1)
    } catch (saveError) {
      setToast({
        message: createdId
          ? '초안은 저장됐지만 사진을 처리하지 못했습니다. 사진을 다시 선택해 저장해 주세요.'
          : (saveError?.message || '홈 스냅을 저장하지 못했습니다.'),
        tone: 'error',
      })
      if (createdId) setRefreshKey((current) => current + 1)
    } finally {
      setBusyId('')
    }
  }

  const toggleVisibility = async (slide) => {
    if (!canPublish) return
    if (!slide.isActive && !slide.completion?.isPublishable) {
      setToast({ message: `공개 전 입력이 필요합니다. ${missingLabel(slide.completion?.missing)}`, tone: 'error' })
      return
    }
    setBusyId(slide.id)
    try {
      await mutate((api, token) => api.updateHomeShowcaseSlide(slide.id, { isActive: !slide.isActive }, token))
      setToast({ message: slide.isActive ? '홈 화면에서 숨겼습니다.' : '홈 화면에 공개했습니다.', tone: 'success' })
      setRefreshKey((current) => current + 1)
    } catch (toggleError) {
      setToast({ message: toggleError?.message || '공개 상태를 변경하지 못했습니다.', tone: 'error' })
    } finally {
      setBusyId('')
    }
  }

  const moveSlide = async (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= slides.length) return
    const nextSlides = [...slides]
    const [moved] = nextSlides.splice(index, 1)
    nextSlides.splice(nextIndex, 0, moved)
    setBusyId(moved.id)
    try {
      await mutate((api, token) => api.reorderHomeShowcase(nextSlides.map((slide) => slide.id), token))
      setRefreshKey((current) => current + 1)
    } catch (moveError) {
      setToast({ message: moveError?.message || '노출 순서를 변경하지 못했습니다.', tone: 'error' })
    } finally {
      setBusyId('')
    }
  }

  const deleteSlide = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await mutate((api, token) => api.deleteHomeShowcaseSlide(deleteTarget.id, token))
      setToast({ message: '홈 스냅을 삭제했습니다.', tone: 'success' })
      setDeleteTarget(null)
      setRefreshKey((current) => current + 1)
    } catch (deleteError) {
      setToast({ message: deleteError?.message || '홈 스냅을 삭제하지 못했습니다.', tone: 'error' })
    } finally {
      setBusyId('')
    }
  }

  const currentPreview = imagePreview || editor?.image

  return <>
    <AdminPageHeader
      title="홈 스냅"
      description="홈 첫 화면의 사진, 문구, 연결 위치와 노출 순서를 관리합니다. 현재 예시 이미지는 등록된 스냅이 없을 때만 보입니다."
      actions={canWrite && slides.length < 12 && <button className="primary-action" type="button" onClick={openCreate}><Plus size={17} /> 새 스냅</button>}
    />

    {editor && <form className="admin-editor-section admin-showcase-editor" onSubmit={saveSlide}>
      <div className="admin-section-heading">
        <div><h2>{editor.mode === 'edit' ? '스냅 편집' : '새 스냅'}</h2><p>초안은 일부 내용만 저장할 수 있습니다. 공개하려면 사진과 네 언어 제목이 필요합니다.</p></div>
      </div>
      <div className="admin-showcase-editor-layout">
        <div className="admin-showcase-image-editor">
          <div className="admin-showcase-image-preview">
            {currentPreview ? <img alt="스냅 미리보기" src={currentPreview} /> : <ImagePlus aria-hidden="true" size={34} />}
          </div>
          <label className="secondary-action admin-file-action">
            <ImagePlus size={17} /> 사진 선택
            <input accept="image/jpeg,image/png,image/webp" type="file" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
          </label>
          <small>JPG, PNG, WebP / 최대 10MB. 저장하면 화면별 WebP 크기를 자동 생성합니다.</small>
        </div>
        <div className="admin-showcase-fields">
          <div className="admin-form-grid">
            <label className="admin-field"><span>관리용 이름 <b>*</b></span><input required value={form.internalName} onChange={(event) => setField('internalName', event.target.value)} /></label>
            <label className="admin-field"><span>상단 라벨</span><input maxLength="24" placeholder="NEW" value={form.label} onChange={(event) => setField('label', event.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>클릭 시 이동 경로 <b>*</b></span><input pattern="/.*" placeholder="/products?collection=new" required value={form.targetUrl} onChange={(event) => setField('targetUrl', event.target.value)} /></label>
          </div>
          <div className="admin-language-tabs" role="tablist" aria-label="문구 언어">
            {languages.map((language) => <button aria-selected={activeLanguage === language.key} className={activeLanguage === language.key ? 'is-active' : undefined} key={language.key} role="tab" type="button" onClick={() => setActiveLanguage(language.key)}>{language.label}</button>)}
          </div>
          <div className="admin-form-grid">
            <label className="admin-field admin-field-wide"><span>큰 제목</span><input maxLength="160" value={form.title[activeLanguage]} onChange={(event) => setLocalizedField('title', event.target.value)} /></label>
            <label className="admin-field"><span>보조 제목</span><input maxLength="80" placeholder="COLLECTION" value={form.eyebrow[activeLanguage]} onChange={(event) => setLocalizedField('eyebrow', event.target.value)} /></label>
            <label className="admin-field admin-field-wide"><span>설명</span><textarea maxLength="300" rows="3" value={form.description[activeLanguage]} onChange={(event) => setLocalizedField('description', event.target.value)} /></label>
          </div>
        </div>
      </div>
      <div className="admin-actions"><button type="button" onClick={closeEditor}>취소</button><button className="primary-action" disabled={Boolean(busyId)} type="submit">{busyId ? '저장 중...' : '초안 저장'}</button></div>
    </form>}

    {slides.length === 0 ? <AdminEmptyState
      title="등록된 홈 스냅이 없습니다."
      description="지금은 예시 이미지가 홈에 표시됩니다. 첫 스냅을 등록하면 운영자 콘텐츠로 자동 전환됩니다."
      action={canWrite && <button className="primary-action" type="button" onClick={openCreate}><Plus size={17} /> 첫 스냅 등록</button>}
    /> : <section className="admin-showcase-list" aria-label="홈 스냅 노출 순서">
      {slides.map((slide, index) => <article className="admin-showcase-row" key={slide.id}>
        <div className="admin-showcase-order"><strong>{String(index + 1).padStart(2, '0')}</strong><div><button aria-label="위로 이동" disabled={!canWrite || index === 0 || Boolean(busyId)} title="위로 이동" type="button" onClick={() => moveSlide(index, -1)}><ArrowUp size={16} /></button><button aria-label="아래로 이동" disabled={!canWrite || index === slides.length - 1 || Boolean(busyId)} title="아래로 이동" type="button" onClick={() => moveSlide(index, 1)}><ArrowDown size={16} /></button></div></div>
        <div className="admin-showcase-thumbnail">{slide.imageSet?.card ? <img alt="" src={slide.imageSet.card} /> : <ImagePlus aria-hidden="true" size={24} />}</div>
        <div className="admin-showcase-summary">
          <div><span className={`admin-status ${slide.isActive ? 'visible' : 'hidden'}`}>{slide.isActive ? '공개' : '초안'}</span><small>{slide.label || 'NOBLESSE'}</small></div>
          <strong>{slide.title?.kr || slide.title?.en || slide.internalName}</strong>
          <p>{slide.internalName} · {slide.targetUrl}</p>
          {!slide.completion?.isPublishable && <small className="admin-showcase-missing">필요: {missingLabel(slide.completion?.missing)}</small>}
        </div>
        <div className="admin-row-actions admin-showcase-actions">
          {canWrite && <button aria-label="편집" title="편집" type="button" onClick={() => openEdit(slide)}><Pencil size={16} /></button>}
          {canPublish && <button disabled={busyId === slide.id} type="button" onClick={() => toggleVisibility(slide)}>{slide.isActive ? <><EyeOff size={16} /> 숨기기</> : <><Eye size={16} /> 공개</>}</button>}
          {canWrite && canPublish && <button aria-label="삭제" className="danger-action" title="삭제" type="button" onClick={() => setDeleteTarget(slide)}><Trash2 size={16} /></button>}
        </div>
      </article>)}
    </section>}

    <AdminConfirmDialog
      danger
      busy={busyId === deleteTarget?.id}
      confirmLabel="삭제"
      description="사진 파일과 등록한 문구가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
      open={Boolean(deleteTarget)}
      title={`${deleteTarget?.internalName || '홈 스냅'}을 삭제할까요?`}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={deleteSlide}
    />
    <AdminToast message={toast.message} tone={toast.tone} onClose={() => setToast({ message: '', tone: 'success' })} />
  </>
}
