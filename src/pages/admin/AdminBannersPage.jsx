import { useMemo, useState } from 'react'
import { AdminPageHeader, AdminPagination, AdminPreviewNote } from './AdminPageParts'
import { AdminApiState, shouldShowAdminApiState, useAdminApiMutation, useAdminApiResource } from './adminApiPageUtils'
import { useAdminCopy } from './adminCopy'

const initialForm = {
  bannerId: '',
  titleKo: '',
  titleEn: '',
  titleJa: '',
  subtitleKo: '',
  subtitleEn: '',
  subtitleJa: '',
  desktopImageUrl: '',
  mobileImageUrl: '',
  linkType: 'path',
  linkValue: '/',
  sortOrder: '0',
  isVisible: false,
}

const pageSize = 20

function formFromBanner(banner) {
  return {
    bannerId: banner.bannerId || '',
    titleKo: banner.titleKo || '',
    titleEn: banner.titleEn || '',
    titleJa: banner.titleJa || '',
    subtitleKo: banner.subtitleKo || '',
    subtitleEn: banner.subtitleEn || '',
    subtitleJa: banner.subtitleJa || '',
    desktopImageUrl: banner.desktopImageUrl || '',
    mobileImageUrl: banner.mobileImageUrl || '',
    linkType: banner.linkType || 'path',
    linkValue: banner.linkValue || '/',
    sortOrder: String(banner.sortOrder ?? 0),
    isVisible: Boolean(banner.isVisible),
  }
}

function toPayload(form, { partial = false } = {}) {
  const payload = {
    titleKo: form.titleKo.trim() || undefined,
    titleEn: form.titleEn.trim(),
    titleJa: form.titleJa.trim() || undefined,
    subtitleKo: form.subtitleKo.trim() || undefined,
    subtitleEn: form.subtitleEn.trim() || undefined,
    subtitleJa: form.subtitleJa.trim() || undefined,
    desktopImageUrl: form.desktopImageUrl.trim(),
    mobileImageUrl: form.mobileImageUrl.trim() || undefined,
    linkType: form.linkType,
    linkValue: form.linkValue.trim() || '/',
    sortOrder: Number(form.sortOrder || 0),
    isVisible: form.isVisible,
  }
  if (!partial) payload.bannerId = form.bannerId.trim()
  return payload
}

export function AdminBannersPage() {
  const t = useAdminCopy()
  const copy = t.banners
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState('')
  const [offset, setOffset] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [editingBannerId, setEditingBannerId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [savingId, setSavingId] = useState('')
  const [message, setMessage] = useState('')
  const filters = useMemo(() => ({
    visible,
    q: query.trim(),
    limit: pageSize,
    offset,
  }), [offset, query, visible])
  const { data, error, meta, status } = useAdminApiResource((api, token) => api.getBanners(filters, token), [query, visible, offset, refreshKey])
  const mutate = useAdminApiMutation()
  const apiState = shouldShowAdminApiState(status) ? <AdminApiState error={error} status={status} /> : null
  if (apiState) return apiState

  const banners = data?.banners || []
  const fields = copy.fields
  const isEditing = Boolean(editingBannerId)
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const resetPage = (setter) => (value) => {
    setter(value)
    setOffset(0)
  }

  const resetForm = () => {
    setEditingBannerId('')
    setForm(initialForm)
  }

  const saveBanner = async (event) => {
    event.preventDefault()
    setMessage('')
    setSavingId(editingBannerId || 'new')
    try {
      if (isEditing) {
        await mutate((api, token) => api.updateBanner(editingBannerId, toPayload(form, { partial: true }), token))
        setMessage(copy.updated)
      } else {
        await mutate((api, token) => api.createBanner(toPayload(form), token))
        setMessage(copy.created)
      }
      resetForm()
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || (isEditing ? copy.updateFailed : copy.createFailed))
    } finally {
      setSavingId('')
    }
  }

  const editBanner = (banner) => {
    setEditingBannerId(banner.id)
    setForm(formFromBanner(banner))
    setMessage('')
  }

  const toggleBanner = async (banner) => {
    setSavingId(banner.id)
    setMessage('')
    try {
      await mutate((api, token) => api.updateBanner(banner.id, { isVisible: !banner.isVisible }, token))
      setMessage(banner.isVisible ? copy.hidden : copy.visible)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setMessage(error?.message || copy.updateFailed)
    } finally {
      setSavingId('')
    }
  }

  return <>
    <AdminPageHeader title={copy.title} description={copy.description} />
    <AdminPreviewNote>{copy.note}</AdminPreviewNote>

    <form className="admin-card admin-banner-form" onSubmit={saveBanner}>
      <div className="admin-form-grid">
        <label>{fields.bannerId}<input disabled={isEditing} required={!isEditing} value={form.bannerId} onChange={(event) => setField('bannerId', event.target.value)} placeholder="home-main-01" /></label>
        <label>{fields.desktopImageUrl}<input required value={form.desktopImageUrl} onChange={(event) => setField('desktopImageUrl', event.target.value)} placeholder="https://..." /></label>
        <label>{fields.mobileImageUrl}<input value={form.mobileImageUrl} onChange={(event) => setField('mobileImageUrl', event.target.value)} placeholder="https://..." /></label>
        <label>{fields.sortOrder}<input min="0" type="number" value={form.sortOrder} onChange={(event) => setField('sortOrder', event.target.value)} /></label>
        <label>{fields.linkType}<select value={form.linkType} onChange={(event) => setField('linkType', event.target.value)}>
          <option value="path">Path</option>
          <option value="product">Product</option>
          <option value="collection">Collection</option>
          <option value="url">URL</option>
        </select></label>
        <label>{fields.linkValue}<input value={form.linkValue} onChange={(event) => setField('linkValue', event.target.value)} placeholder="/products" /></label>
        <label>{fields.titleKo}<input value={form.titleKo} onChange={(event) => setField('titleKo', event.target.value)} /></label>
        <label>{fields.titleEn}<input required value={form.titleEn} onChange={(event) => setField('titleEn', event.target.value)} /></label>
        <label>{fields.titleJa}<input value={form.titleJa} onChange={(event) => setField('titleJa', event.target.value)} /></label>
        <label>{fields.subtitleKo}<input value={form.subtitleKo} onChange={(event) => setField('subtitleKo', event.target.value)} /></label>
        <label>{fields.subtitleEn}<input value={form.subtitleEn} onChange={(event) => setField('subtitleEn', event.target.value)} /></label>
        <label>{fields.subtitleJa}<input value={form.subtitleJa} onChange={(event) => setField('subtitleJa', event.target.value)} /></label>
      </div>
      <div className="admin-actions">
        <label className="admin-check"><input checked={form.isVisible} type="checkbox" onChange={(event) => setField('isVisible', event.target.checked)} /> {fields.isVisible}</label>
        <button className="primary-action" disabled={savingId === (editingBannerId || 'new')} type="submit">{isEditing ? copy.update : copy.create}</button>
        {isEditing ? <button type="button" onClick={resetForm}>{copy.cancelEdit}</button> : null}
      </div>
    </form>

    <div className="admin-toolbar">
      <label className="admin-search">{t.common.search}<input value={query} onChange={(event) => resetPage(setQuery)(event.target.value)} placeholder="home, weekly, ring" /></label>
      <div className="admin-filter-tabs">
        {[['', t.common.all], ['true', t.common.visible], ['false', t.common.hidden]].map(([value, label]) => <button className={visible === value ? 'active' : ''} key={value || 'all'} type="button" onClick={() => resetPage(setVisible)(value)}>{label}</button>)}
      </div>
    </div>
    {message && <p className="admin-inline-message">{message}</p>}

    <section className="admin-card">
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>{fields.bannerId}</th><th>{t.fields.name}</th><th>{fields.linkValue}</th><th>{t.common.visible}</th><th>{fields.sortOrder}</th><th>{t.common.actions}</th></tr></thead>
          <tbody>{banners.map((banner) => <tr key={banner.id}>
            <td>{banner.bannerId}</td>
            <td>{banner.titleKo || banner.titleEn || banner.titleJa || '-'}</td>
            <td>{banner.linkValue || '-'}</td>
            <td>{banner.isVisible ? t.common.visible : t.common.hidden}</td>
            <td>{banner.sortOrder ?? 0}</td>
            <td>
              <div className="admin-actions tight">
                <button type="button" onClick={() => editBanner(banner)}>{copy.edit}</button>
                <button disabled={savingId === banner.id} type="button" onClick={() => toggleBanner(banner)}>{banner.isVisible ? t.common.hide : t.common.show}</button>
              </div>
            </td>
          </tr>)}</tbody>
        </table>
        {banners.length === 0 && <p className="admin-empty">{copy.empty}</p>}
        <AdminPagination
          disabled={status === 'loading'}
          meta={meta}
          onNext={() => setOffset(Number(meta?.nextOffset ?? offset + pageSize))}
          onPrevious={() => setOffset(Math.max(0, offset - pageSize))}
        />
      </div>
    </section>
  </>
}
