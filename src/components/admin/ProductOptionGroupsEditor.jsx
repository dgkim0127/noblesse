import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createProductOptionPreset,
  normalizeProductOptionGroups,
  productOptionPresets,
} from '../../utils/productOptions'

function makeValueId() {
  return `value-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`.slice(0, 64)
}

function moveItem(items, sourceIndex, targetIndex) {
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= items.length || sourceIndex === targetIndex) return items
  const next = [...items]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

export function ProductOptionGroupsEditor({ activeLocale, groups, images, onChange, onSelectField }) {
  const safeGroups = normalizeProductOptionGroups(groups)
  const [selectedGroupId, setSelectedGroupId] = useState(safeGroups[0]?.id || '')
  const [preset, setPreset] = useState('color')
  const [draggedGroupId, setDraggedGroupId] = useState('')
  const [draggedValueId, setDraggedValueId] = useState('')

  useEffect(() => {
    if (!safeGroups.some((group) => group.id === selectedGroupId)) setSelectedGroupId(safeGroups[0]?.id || '')
  }, [safeGroups, selectedGroupId])

  const selectedGroup = safeGroups.find((group) => group.id === selectedGroupId) || safeGroups[0] || null
  const commit = (nextGroups) => onChange(normalizeProductOptionGroups(nextGroups))
  const updateGroup = (groupId, patch) => commit(safeGroups.map((group) => group.id === groupId ? { ...group, ...patch } : group))
  const removeGroup = (groupId) => {
    const next = safeGroups.filter((group) => group.id !== groupId)
    commit(next)
    setSelectedGroupId(next[0]?.id || '')
  }
  const addPreset = () => {
    if (safeGroups.length >= 6) return
    const next = createProductOptionPreset(preset, safeGroups)
    commit([...safeGroups, next])
    setSelectedGroupId(next.id)
    onSelectField?.('options')
  }
  const moveGroup = (groupId, targetIndex) => commit(moveItem(safeGroups, safeGroups.findIndex((group) => group.id === groupId), targetIndex))

  const updateValue = (valueId, patch) => {
    if (!selectedGroup) return
    updateGroup(selectedGroup.id, {
      values: selectedGroup.values.map((value) => value.id === valueId ? { ...value, ...patch } : value),
    })
  }
  const addValue = () => {
    if (!selectedGroup || selectedGroup.values.length >= 20) return
    updateGroup(selectedGroup.id, {
      values: [...selectedGroup.values, {
        id: makeValueId(),
        active: true,
        labels: { kr: '', en: '', jp: '', 'zh-TW': '' },
        swatch: selectedGroup.type === 'swatch' ? '#D4AF37' : '',
        imageId: '',
      }],
    })
  }
  const removeValue = (valueId) => updateGroup(selectedGroup.id, { values: selectedGroup.values.filter((value) => value.id !== valueId) })
  const moveValue = (valueId, targetIndex) => updateGroup(selectedGroup.id, {
    values: moveItem(selectedGroup.values, selectedGroup.values.findIndex((value) => value.id === valueId), targetIndex),
  })

  return <section className="admin-option-editor" aria-label="상품 옵션 그룹 편집">
    <header className="admin-option-editor-heading">
      <div><strong>상품 옵션</strong><span>고객이 견적 요청 전에 선택할 항목입니다.</span></div>
      <span>{safeGroups.length}/6 그룹</span>
    </header>

    <div className="admin-option-add-row">
      <label className="admin-field"><span>추가할 옵션</span><select value={preset} onChange={(event) => setPreset(event.target.value)}>{productOptionPresets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="admin-secondary-action" disabled={safeGroups.length >= 6} type="button" onClick={addPreset}><Plus size={16} />그룹 추가</button>
    </div>

    {safeGroups.length === 0 ? <div className="admin-option-empty"><strong>등록된 옵션이 없습니다.</strong><span>색상이나 바 길이 프리셋으로 시작하세요.</span></div> : <>
      <div className="admin-option-group-list" role="list" aria-label="옵션 그룹 순서">
        {safeGroups.map((group, index) => <article
          className={selectedGroup?.id === group.id ? 'is-selected' : ''}
          draggable
          key={group.id}
          onDragEnd={() => setDraggedGroupId('')}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={() => setDraggedGroupId(group.id)}
          onDrop={(event) => { event.preventDefault(); if (draggedGroupId) moveGroup(draggedGroupId, index); setDraggedGroupId('') }}
        >
          <button className="admin-option-drag" aria-label={`${index + 1}번 옵션 그룹 순서 변경`} type="button"><GripVertical size={16} /></button>
          <button className="admin-option-group-select" type="button" onClick={() => { setSelectedGroupId(group.id); onSelectField?.('options') }}>
            <strong>{group.labels[activeLocale] || group.labels.kr || `${index + 1}번 옵션`}</strong>
            <span>{group.values.filter((value) => value.active).length}개 값 · {group.required ? '필수' : '선택'}</span>
          </button>
          <div className="admin-option-order-actions">
            <button aria-label="위로 이동" disabled={index === 0} type="button" onClick={() => moveGroup(group.id, index - 1)}><ChevronUp size={15} /></button>
            <button aria-label="아래로 이동" disabled={index === safeGroups.length - 1} type="button" onClick={() => moveGroup(group.id, index + 1)}><ChevronDown size={15} /></button>
          </div>
        </article>)}
      </div>

      {selectedGroup && <div className="admin-option-group-settings">
        <div className="admin-form-grid">
          <label className="admin-field"><span>{activeLocale} 옵션명</span><input maxLength="120" value={selectedGroup.labels[activeLocale]} onChange={(event) => updateGroup(selectedGroup.id, { labels: { ...selectedGroup.labels, [activeLocale]: event.target.value } })} /></label>
          <label className="admin-field"><span>표시 방식</span><select value={selectedGroup.type} onChange={(event) => updateGroup(selectedGroup.id, { type: event.target.value })}><option value="text">텍스트</option><option value="swatch">색상 스와치</option></select></label>
        </div>
        <div className="admin-option-group-toggles">
          <label className="admin-switch"><input checked={selectedGroup.required} type="checkbox" onChange={(event) => updateGroup(selectedGroup.id, { required: event.target.checked })} /><span>필수 선택</span></label>
          <button className="admin-danger-text" type="button" onClick={() => removeGroup(selectedGroup.id)}><Trash2 size={15} />그룹 삭제</button>
        </div>

        <div className="admin-option-value-list" role="list" aria-label="옵션 값 순서">
          {selectedGroup.values.map((value, index) => <article
            className={!value.active ? 'is-inactive' : ''}
            draggable
            key={value.id}
            onDragEnd={() => setDraggedValueId('')}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedValueId(value.id)}
            onDrop={(event) => { event.preventDefault(); if (draggedValueId) moveValue(draggedValueId, index); setDraggedValueId('') }}
          >
            <div className="admin-option-value-row">
              <button className="admin-option-drag" aria-label={`${index + 1}번 옵션 값 순서 변경`} type="button"><GripVertical size={16} /></button>
              {selectedGroup.type === 'swatch' && <input aria-label="색상" className="admin-option-color" type="color" value={value.swatch || '#D4AF37'} onChange={(event) => updateValue(value.id, { swatch: event.target.value.toUpperCase() })} />}
              <label className="admin-field"><span>{activeLocale} 값</span><input maxLength="120" placeholder={`${index + 1}번 값`} value={value.labels[activeLocale]} onChange={(event) => updateValue(value.id, { labels: { ...value.labels, [activeLocale]: event.target.value } })} /></label>
              <div className="admin-option-order-actions">
                <button aria-label="위로 이동" disabled={index === 0} type="button" onClick={() => moveValue(value.id, index - 1)}><ChevronUp size={14} /></button>
                <button aria-label="아래로 이동" disabled={index === selectedGroup.values.length - 1} type="button" onClick={() => moveValue(value.id, index + 1)}><ChevronDown size={14} /></button>
              </div>
              <button aria-label={`${index + 1}번 옵션 값 삭제`} className="admin-icon-button" type="button" onClick={() => removeValue(value.id)}><Trash2 size={15} /></button>
            </div>
            <div className="admin-option-value-meta">
              <label className="admin-switch"><input checked={value.active} type="checkbox" onChange={(event) => updateValue(value.id, { active: event.target.checked })} /><span>사용</span></label>
              <label className="admin-field"><span>선택 시 보여줄 사진</span><select value={value.imageId} onChange={(event) => updateValue(value.id, { imageId: event.target.value })}>
                <option value="">연결 안 함</option>
                {images.map((image, imageIndex) => <option disabled={image.kind === 'new'} key={image.id} value={image.kind === 'new' ? '' : image.existingId || image.id}>{imageIndex + 1}번 사진{image.kind === 'new' ? ' (저장 후 연결 가능)' : ''}</option>)}
              </select></label>
            </div>
          </article>)}
        </div>
        <button className="admin-secondary-action admin-option-add-value" disabled={selectedGroup.values.length >= 20} type="button" onClick={addValue}><Plus size={16} />옵션 값 추가</button>
      </div>}
    </>}
  </section>
}
