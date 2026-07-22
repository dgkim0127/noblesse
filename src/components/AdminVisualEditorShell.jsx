import {
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Monitor,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const visualEditorViewportWidths = {
  desktop: 1440,
  tablet: 1024,
  mobile: 390,
}

const defaultDevices = [
  { id: 'desktop', label: 'PC', icon: Monitor },
  { id: 'tablet', label: '태블릿', icon: Tablet },
  { id: 'mobile', label: '모바일', icon: Smartphone },
]

export function AdminFixedPreviewCanvas({ ariaLabel, children, mode = 'desktop' }) {
  const viewportRef = useRef(null)
  const stageRef = useRef(null)
  const [layout, setLayout] = useState({ height: 0, left: 16, scale: 1 })
  const logicalWidth = visualEditorViewportWidths[mode] || visualEditorViewportWidths.desktop

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const stage = stageRef.current
    if (!viewport || !stage) return undefined

    const updateLayout = () => {
      const inset = viewport.clientWidth < 520 ? 8 : 16
      const usableWidth = Math.max(1, viewport.clientWidth - inset * 2)
      const scale = Math.min(1, usableWidth / logicalWidth)
      const scaledWidth = logicalWidth * scale
      const left = inset + Math.max(0, Math.floor((usableWidth - scaledWidth) / 2))
      const height = Math.max(260, Math.ceil(stage.scrollHeight * scale) + inset * 2)

      setLayout((current) => (
        Math.abs(current.scale - scale) < 0.001
        && current.height === height
        && current.left === left
          ? current
          : { height, left, scale }
      ))
    }

    updateLayout()
    window.addEventListener('resize', updateLayout)
    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateLayout)
    }

    const observer = new ResizeObserver(updateLayout)
    observer.observe(viewport)
    observer.observe(stage)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateLayout)
    }
  }, [logicalWidth])

  return <div
    aria-label={ariaLabel}
    className={`admin-visual-preview-frame is-${mode}`}
    data-preview-width={logicalWidth}
    ref={viewportRef}
    style={layout.height ? { height: `${layout.height}px` } : undefined}
  >
    <div
      className="admin-visual-preview-stage"
      ref={stageRef}
      style={{ left: `${layout.left}px`, transform: `scale(${layout.scale})`, width: `${logicalWidth}px` }}
    >
      {children}
    </div>
  </div>
}

export function AdminVisualEditorShell({
  actions,
  activeDevice = 'desktop',
  activeLocale,
  children,
  description,
  devices = defaultDevices,
  dirty = false,
  draggedSectionId = '',
  inspector,
  inspectorCloseRef,
  inspectorOpen = false,
  inspectorRef,
  inspectorReturnFocusRef,
  locales = [],
  onCloseInspector,
  onDeviceChange,
  onDragStartSection,
  onDropSection,
  onLocaleChange,
  onMoveSection,
  onReadinessClick,
  onSelectSection,
  onToggleSection,
  previewAriaLabel,
  readiness,
  sections = [],
  selectedSectionId,
  title,
}) {
  const selectedSection = sections.find((section) => section.id === selectedSectionId) || sections[0]
  const fallbackInspectorRef = useRef(null)
  const fallbackReturnFocusRef = useRef(null)
  const activeInspectorRef = inspectorRef || fallbackInspectorRef
  const activeReturnFocusRef = inspectorReturnFocusRef || fallbackReturnFocusRef
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1279px)')
    const sync = () => setCompact(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const closeInspector = useCallback(() => {
    onCloseInspector?.()
    window.setTimeout(() => activeReturnFocusRef.current?.focus(), 0)
  }, [activeReturnFocusRef, onCloseInspector])

  useEffect(() => {
    if (!compact || !inspectorOpen) return undefined
    const panel = activeInspectorRef.current
    const focusTimer = window.setTimeout(() => panel?.querySelector('.admin-visual-editor-inspector-header > button')?.focus(), 0)
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeInspector()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(panel?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]') || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeInspectorRef, closeInspector, compact, inspectorOpen])

  return <section className={`admin-visual-editor${inspectorOpen ? ' is-inspector-open' : ''}`}>
    <header className="admin-visual-editor-commandbar">
      <div className="admin-visual-editor-title">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>

      <div className="admin-visual-editor-locales" role="tablist" aria-label="편집 언어">
        {locales.map(({ key, label }) => <button
          aria-selected={activeLocale === key}
          className={activeLocale === key ? 'is-active' : undefined}
          key={key}
          role="tab"
          type="button"
          onClick={() => onLocaleChange?.(key)}
        >{label}</button>)}
      </div>

      <div className="admin-visual-editor-devices" aria-label="미리보기 화면" role="group">
        {devices.map(({ id, label, icon: Icon }) => <button
          aria-label={`${label} 미리보기`}
          aria-pressed={activeDevice === id}
          className={activeDevice === id ? 'is-active' : undefined}
          key={id}
          title={`${label} 미리보기`}
          type="button"
          onClick={() => onDeviceChange?.(id)}
        ><Icon aria-hidden="true" size={17} /></button>)}
      </div>

      {readiness ? <button
        className={`admin-visual-editor-readiness${readiness.ready ? ' is-ready' : ''}`}
        type="button"
        onClick={onReadinessClick}
      >
        {readiness.ready ? <Check aria-hidden="true" size={15} /> : null}
        <span>{readiness.label}</span>
      </button> : null}

      <div className="admin-visual-editor-actions">{actions}</div>
    </header>

    <div className="admin-visual-editor-workspace">
      <nav className="admin-visual-editor-sections" aria-label="화면 구성">
        <div className="admin-visual-editor-sections-heading">
          <span>화면 구성</span>
          {dirty ? <strong>저장 안 됨</strong> : <small>저장됨</small>}
        </div>
        <div className="admin-visual-editor-section-list">
          {sections.map((section) => {
            const Icon = section.icon
            const selected = section.id === selectedSectionId
            const hidden = section.visible === false
            return <div
              className={`admin-visual-editor-section${selected ? ' is-selected' : ''}${hidden ? ' is-hidden' : ''}${draggedSectionId === section.id ? ' is-dragging' : ''}`}
              draggable={Boolean(section.reorderable)}
              key={section.id}
              onDragEnd={() => onDragStartSection?.('')}
              onDragOver={(event) => section.reorderable && event.preventDefault()}
              onDragStart={() => onDragStartSection?.(section.id)}
              onDrop={() => onDropSection?.(section.id)}
            >
              {section.reorderable ? <button
                aria-label={`${section.label} 순서 변경`}
                className="admin-visual-editor-drag"
                title="끌어서 순서 변경"
                type="button"
              ><GripVertical aria-hidden="true" size={15} /></button> : <span className="admin-visual-editor-drag-spacer" />}
              <button className="admin-visual-editor-section-main" type="button" onClick={(event) => { activeReturnFocusRef.current = event.currentTarget; onSelectSection?.(section.id) }}>
                {Icon ? <Icon aria-hidden="true" size={17} /> : null}
                <span><strong>{section.label}</strong>{section.description ? <small>{section.description}</small> : null}</span>
              </button>
              <span className="admin-visual-editor-section-state" title={section.statusLabel || ''}>
                <span className={`admin-visual-editor-section-status is-${section.status || 'neutral'}`} />
                {section.statusText ? <small>{section.statusText}</small> : null}
              </span>
              {typeof section.visible === 'boolean' ? <button
                aria-label={section.visible ? `${section.label} 숨기기` : `${section.label} 표시하기`}
                className="admin-visual-editor-visibility"
                disabled={section.visibilityLocked}
                title={section.visible ? '숨기기' : '표시하기'}
                type="button"
                onClick={() => onToggleSection?.(section.id)}
              >{section.visible ? <Eye aria-hidden="true" size={15} /> : <EyeOff aria-hidden="true" size={15} />}</button> : null}
              {section.reorderable && onMoveSection ? <span className="admin-visual-editor-order">
                <button aria-label={`${section.label} 위로 이동`} disabled={section.moveUpDisabled} type="button" onClick={() => onMoveSection(section.id, -1)}>↑</button>
                <button aria-label={`${section.label} 아래로 이동`} disabled={section.moveDownDisabled} type="button" onClick={() => onMoveSection(section.id, 1)}>↓</button>
              </span> : null}
            </div>
          })}
        </div>
      </nav>

      <button className="admin-visual-editor-backdrop" aria-label="설정 닫기" type="button" onClick={closeInspector} />
      <aside
        aria-hidden={compact ? !inspectorOpen : undefined}
        aria-label={`${selectedSection?.label || '선택 항목'} 설정`}
        aria-modal={compact ? true : undefined}
        className="admin-visual-editor-inspector"
        inert={compact && !inspectorOpen ? true : undefined}
        ref={activeInspectorRef}
        role={compact ? 'dialog' : 'complementary'}
      >
        <header className="admin-visual-editor-inspector-header">
          <div><span>선택 항목 설정</span><strong>{selectedSection?.label || '설정'}</strong></div>
          <button aria-label="설정 닫기" ref={inspectorCloseRef} title="닫기" type="button" onClick={closeInspector}><X aria-hidden="true" size={18} /></button>
        </header>
        <div className="admin-visual-editor-inspector-body">{inspector}</div>
      </aside>

      <main className="admin-visual-editor-canvas">
        <AdminFixedPreviewCanvas ariaLabel={previewAriaLabel} mode={activeDevice}>{children}</AdminFixedPreviewCanvas>
      </main>
    </div>
  </section>
}
