import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createProductDetailBlock,
  normalizeProductDetailBlocks,
  productDetailBlockTypes,
} from '../../utils/productDetailBlocks'

const imageBlockTypes = new Set(['image', 'imageText', 'imageGrid'])
const textBlockTypes = new Set(['heading', 'text', 'imageText', 'notice'])
const specOptions = [
  ['gauge', '게이지'], ['length', '기본 길이'], ['barLength', '바 길이'], ['postLength', '포스트 길이'],
  ['ballSize', '볼 크기'], ['innerDiameter', '내경'], ['barThickness', '바 두께'], ['totalLength', '전체 길이'],
  ['decorationType', '장식 타입'], ['stoneType', '스톤'], ['closureType', '잠금 방식'], ['plating', '도금'], ['finish', '표면 마감'],
]

function moveItem(items, sourceIndex, targetIndex) {
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= items.length || sourceIndex === targetIndex) return items
  const next = [...items]
  const [moved] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, moved)
  return next
}

export function ProductDetailBlocksEditor({ activeLocale, blocks, images, onChange, onTemplate }) {
  const safeBlocks = normalizeProductDetailBlocks(blocks)
  const [selectedBlockId, setSelectedBlockId] = useState(safeBlocks[0]?.id || '')
  const [newType, setNewType] = useState('text')
  const [draggedBlockId, setDraggedBlockId] = useState('')

  useEffect(() => {
    if (!safeBlocks.some((block) => block.id === selectedBlockId)) setSelectedBlockId(safeBlocks[0]?.id || '')
  }, [safeBlocks, selectedBlockId])

  const selectedBlock = safeBlocks.find((block) => block.id === selectedBlockId) || safeBlocks[0] || null
  const commit = (next) => onChange(normalizeProductDetailBlocks(next))
  const updateBlock = (blockId, patch) => commit(safeBlocks.map((block) => block.id === blockId ? { ...block, ...patch } : block))
  const moveBlock = (blockId, targetIndex) => commit(moveItem(safeBlocks, safeBlocks.findIndex((block) => block.id === blockId), targetIndex))
  const addBlock = () => {
    if (safeBlocks.length >= 30) return
    const block = createProductDetailBlock(newType)
    commit([...safeBlocks, block])
    setSelectedBlockId(block.id)
  }
  const removeBlock = (blockId) => {
    const next = safeBlocks.filter((block) => block.id !== blockId)
    commit(next)
    setSelectedBlockId(next[0]?.id || '')
  }
  const setLocalized = (field, value) => updateBlock(selectedBlock.id, {
    translations: {
      ...selectedBlock.translations,
      [activeLocale]: { ...selectedBlock.translations[activeLocale], [field]: value },
    },
  })
  const toggleImage = (imageId) => {
    const selected = selectedBlock.imageIds.includes(imageId)
    updateBlock(selectedBlock.id, { imageIds: selected ? selectedBlock.imageIds.filter((id) => id !== imageId) : [...selectedBlock.imageIds, imageId].slice(0, 8) })
  }
  const toggleSpec = (specKey) => {
    const selected = selectedBlock.specKeys.includes(specKey)
    updateBlock(selectedBlock.id, { specKeys: selected ? selectedBlock.specKeys.filter((key) => key !== specKey) : [...selectedBlock.specKeys, specKey].slice(0, 20) })
  }

  return <section className="admin-detail-block-editor" aria-label="상품 상세 콘텐츠 블록 편집">
    <header className="admin-option-editor-heading">
      <div><strong>상세 콘텐츠</strong><span>안전한 블록을 순서대로 조합합니다.</span></div>
      <span>{safeBlocks.length}/30 블록</span>
    </header>
    <div className="admin-detail-block-actions">
      <div className="admin-option-add-row">
        <label className="admin-field"><span>블록 유형</span><select value={newType} onChange={(event) => setNewType(event.target.value)}>{productDetailBlockTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button className="admin-secondary-action" disabled={safeBlocks.length >= 30} type="button" onClick={addBlock}><Plus size={16} />블록 추가</button>
      </div>
      <button className="admin-link-button" type="button" onClick={onTemplate}>피어싱 기본 상세 구성 넣기</button>
    </div>

    {safeBlocks.length === 0 ? <div className="admin-option-empty"><strong>상세 콘텐츠가 없습니다.</strong><span>기본 구성 또는 필요한 블록부터 추가하세요.</span></div> : <>
      <div className="admin-detail-block-list" role="list" aria-label="상세 블록 순서">
        {safeBlocks.map((block, index) => <article
          className={selectedBlock?.id === block.id ? 'is-selected' : ''}
          draggable
          key={block.id}
          onDragEnd={() => setDraggedBlockId('')}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={() => setDraggedBlockId(block.id)}
          onDrop={(event) => { event.preventDefault(); if (draggedBlockId) moveBlock(draggedBlockId, index); setDraggedBlockId('') }}
        >
          <button className="admin-option-drag" aria-label={`${index + 1}번 상세 블록 순서 변경`} type="button"><GripVertical size={16} /></button>
          <button className="admin-option-group-select" type="button" onClick={() => setSelectedBlockId(block.id)}>
            <strong>{productDetailBlockTypes.find(([value]) => value === block.type)?.[1] || block.type}</strong>
            <span>{block.translations[activeLocale]?.title || block.translations[activeLocale]?.caption || `${index + 1}번 블록`}</span>
          </button>
          <div className="admin-option-order-actions">
            <button aria-label="위로 이동" disabled={index === 0} type="button" onClick={() => moveBlock(block.id, index - 1)}><ChevronUp size={15} /></button>
            <button aria-label="아래로 이동" disabled={index === safeBlocks.length - 1} type="button" onClick={() => moveBlock(block.id, index + 1)}><ChevronDown size={15} /></button>
          </div>
        </article>)}
      </div>

      {selectedBlock && <div className="admin-detail-block-settings">
        <div className="admin-form-grid">
          <label className="admin-field"><span>블록 유형</span><select value={selectedBlock.type} onChange={(event) => updateBlock(selectedBlock.id, { type: event.target.value })}>{productDetailBlockTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {selectedBlock.type === 'imageText' && <label className="admin-field"><span>배치</span><select value={selectedBlock.layout} onChange={(event) => updateBlock(selectedBlock.id, { layout: event.target.value })}><option value="imageLeft">이미지 왼쪽</option><option value="imageRight">이미지 오른쪽</option><option value="stacked">위아래</option></select></label>}
        </div>
        <div className="admin-option-group-toggles">
          <label className="admin-switch"><input checked={selectedBlock.visible} type="checkbox" onChange={(event) => updateBlock(selectedBlock.id, { visible: event.target.checked })} /><span>고객 화면에 표시</span></label>
          <button className="admin-danger-text" type="button" onClick={() => removeBlock(selectedBlock.id)}><Trash2 size={15} />블록 삭제</button>
        </div>

        {textBlockTypes.has(selectedBlock.type) && <div className="admin-detail-block-copy">
          <label className="admin-field"><span>{activeLocale} 제목</span><input maxLength="200" value={selectedBlock.translations[activeLocale].title} onChange={(event) => setLocalized('title', event.target.value)} /></label>
          {selectedBlock.type !== 'heading' && <label className="admin-field"><span>{activeLocale} 본문</span><textarea maxLength="6000" rows="5" value={selectedBlock.translations[activeLocale].body} onChange={(event) => setLocalized('body', event.target.value)} /></label>}
          {['text', 'notice'].includes(selectedBlock.type) && <label className="admin-field"><span>{activeLocale} 목록 (한 줄에 하나)</span><textarea rows="4" value={selectedBlock.translations[activeLocale].bullets.join('\n')} onChange={(event) => setLocalized('bullets', event.target.value.split('\n').slice(0, 20))} /></label>}
          {selectedBlock.type === 'imageText' && <label className="admin-field"><span>{activeLocale} 이미지 설명</span><input maxLength="500" value={selectedBlock.translations[activeLocale].caption} onChange={(event) => setLocalized('caption', event.target.value)} /></label>}
        </div>}
        {['image', 'imageGrid'].includes(selectedBlock.type) && <label className="admin-field"><span>{activeLocale} 이미지 설명</span><input maxLength="500" value={selectedBlock.translations[activeLocale].caption} onChange={(event) => setLocalized('caption', event.target.value)} /></label>}

        {imageBlockTypes.has(selectedBlock.type) && <div className="admin-detail-image-picker">
          <strong>갤러리 사진 연결</strong>
          {images.length ? <div>{images.map((image, index) => <label className={selectedBlock.imageIds.includes(image.existingId || image.id) ? 'is-selected' : ''} key={image.id}>
            <input checked={selectedBlock.imageIds.includes(image.existingId || image.id)} disabled={image.kind === 'new'} type="checkbox" onChange={() => toggleImage(image.existingId || image.id)} />
            <img alt="" src={image.thumbUrl || image.previewUrl} /><span>{index + 1}번{image.kind === 'new' ? ' · 저장 후 선택' : ''}</span>
          </label>)}</div> : <span>먼저 상품 이미지를 추가하세요.</span>}
        </div>}

        {selectedBlock.type === 'specTable' && <fieldset className="admin-detail-spec-picker"><legend>표시할 상품 사양</legend>{specOptions.map(([value, label]) => <label className="admin-switch" key={value}><input checked={selectedBlock.specKeys.includes(value)} type="checkbox" onChange={() => toggleSpec(value)} /><span>{label}</span></label>)}</fieldset>}
      </div>}
    </>}
  </section>
}
