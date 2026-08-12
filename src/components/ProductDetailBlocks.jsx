import { Images } from 'lucide-react'
import { normalizeProductDetailBlocks } from '../utils/productDetailBlocks'
import { imagePresentationStyle } from '../utils/productImageGallery'

const supportedLocales = ['kr', 'en', 'jp', 'zh-TW']

function contentLocale(locale) {
  return locale === 'cn' ? 'zh-TW' : supportedLocales.includes(locale) ? locale : 'en'
}

function hasBlockCopy(copy = {}) {
  return Boolean(copy.title || copy.body || copy.caption || copy.bullets?.some(Boolean))
}

function getLocalizedDetailBlockCopy(block, locale, allowFallback = true) {
  const normalizedLocale = contentLocale(locale)
  const exact = block?.translations?.[normalizedLocale] || {}
  if (hasBlockCopy(exact) || !allowFallback) return exact
  for (const fallbackLocale of ['en', 'kr', 'jp', 'zh-TW']) {
    const fallback = block?.translations?.[fallbackLocale] || {}
    if (hasBlockCopy(fallback)) return fallback
  }
  return exact
}

function DetailImage({ image, onError, preserveRatio = false }) {
  const source = image?.detailSrc || image?.cardSrc
  if (!source) return null
  const style = preserveRatio
    ? { objectFit: 'contain', objectPosition: 'center', transform: 'none' }
    : { objectFit: 'cover', ...imagePresentationStyle(image) }
  return <img
    alt={image.alt || ''}
    loading="lazy"
    src={source}
    style={style}
    onError={(event) => {
      event.currentTarget.closest('figure')?.setAttribute('hidden', '')
      onError?.(image)
    }}
  />
}

function BlockImages({ block, copy, editor, galleryImages }) {
  const images = block.imageIds.map((id) => galleryImages.find((image) => image.id === id)).filter(Boolean)
  if (!images.length) {
    return editor ? <div className="pd-image-placeholder"><Images size={28} /><span>{copy.noImage}</span></div> : null
  }
  if (block.type === 'image') {
    return <figure className="pd-content-image is-full"><DetailImage image={images[0]} preserveRatio />{copy.caption && <figcaption>{copy.caption}</figcaption>}</figure>
  }
  return <div className="pd-content-image-grid">
    {images.map((image) => <figure key={image.id}><DetailImage image={image} />{copy.caption && <figcaption>{copy.caption}</figcaption>}</figure>)}
  </div>
}

function DetailBlock({ block, blockCopy, editor, galleryImages, noImageCopy, specificationTitle, specifications }) {
  if (block.type === 'divider') return <hr className="pd-content-divider" />
  if (block.type === 'heading') return <header className="pd-content-heading"><h2>{blockCopy.title || (editor ? '제목 입력' : '')}</h2>{blockCopy.body && <p>{blockCopy.body}</p>}</header>
  if (block.type === 'text') return <article className="pd-content-copy">{blockCopy.title && <h2>{blockCopy.title}</h2>}{blockCopy.body && <p>{blockCopy.body}</p>}{blockCopy.bullets?.some(Boolean) && <ul>{blockCopy.bullets.filter(Boolean).map((item, index) => <li key={`${block.id}-bullet-${index}`}>{item}</li>)}</ul>}</article>
  if (block.type === 'notice') return <aside className="pd-content-notice">{blockCopy.title && <strong>{blockCopy.title}</strong>}{blockCopy.body && <p>{blockCopy.body}</p>}{blockCopy.bullets?.some(Boolean) && <ul>{blockCopy.bullets.filter(Boolean).map((item, index) => <li key={`${block.id}-notice-${index}`}>{item}</li>)}</ul>}</aside>
  if (block.type === 'specTable') {
    const rows = block.specKeys.length
      ? specifications.filter((item) => block.specKeys.includes(item.key))
      : specifications
    if (!rows.length && !editor) return null
    return <section className="pd-content-spec"><h2>{blockCopy.title || specificationTitle}</h2><dl>{rows.map((item) => <div key={item.key}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>
  }
  if (block.type === 'imageText') return <section className={`pd-content-image-text is-${block.layout}`}>
    <BlockImages block={block} copy={{ ...blockCopy, noImage: noImageCopy }} editor={editor} galleryImages={galleryImages} />
    <div>{blockCopy.title && <h2>{blockCopy.title}</h2>}{blockCopy.body && <p>{blockCopy.body}</p>}{blockCopy.bullets?.some(Boolean) && <ul>{blockCopy.bullets.filter(Boolean).map((item, index) => <li key={`${block.id}-image-text-${index}`}>{item}</li>)}</ul>}</div>
  </section>
  if (block.type === 'image' || block.type === 'imageGrid') return <BlockImages block={block} copy={{ ...blockCopy, noImage: noImageCopy }} editor={editor} galleryImages={galleryImages} />
  return null
}

function LegacyDetailContent({ description, headline, legacyOverviewImage, noImageCopy, onLegacyOverviewImageError }) {
  return <div className="pd-content-blocks is-legacy">
    {legacyOverviewImage
      ? <section className="pd-content-image-text is-imageLeft is-legacy-story">
        <figure className="pd-content-image"><DetailImage image={legacyOverviewImage} onError={onLegacyOverviewImageError} preserveRatio /></figure>
        <div><span aria-hidden="true" className="pd-story-ornament" />{headline && <h2>{headline}</h2>}{description && <p>{description}</p>}</div>
      </section>
      : (headline || description) && <header className="pd-content-heading"><h2>{headline}</h2>{description && <p>{description}</p>}</header>}
    {!headline && !description && !legacyOverviewImage && <div className="pd-image-placeholder"><Images size={28} /><span>{noImageCopy}</span></div>}
  </div>
}

export function ProductDetailBlocks({
  blocks,
  description = '',
  editor = null,
  galleryImages = [],
  headline = '',
  legacyOverviewImage = null,
  locale = 'kr',
  noImageCopy = 'No image',
  onLegacyOverviewImageError,
  specificationTitle = 'Specification',
  specifications = [],
}) {
  const visibleBlocks = normalizeProductDetailBlocks(blocks).filter((block) => block.visible)
  if (!visibleBlocks.length) {
    return <LegacyDetailContent
      description={description}
      headline={headline}
      legacyOverviewImage={legacyOverviewImage}
      noImageCopy={noImageCopy}
      onLegacyOverviewImageError={onLegacyOverviewImageError}
    />
  }

  return <div className="pd-content-blocks">
    {visibleBlocks.map((block) => <DetailBlock
      block={block}
      blockCopy={getLocalizedDetailBlockCopy(block, locale, !editor)}
      editor={editor}
      galleryImages={galleryImages}
      key={block.id}
      noImageCopy={noImageCopy}
      specificationTitle={specificationTitle}
      specifications={specifications}
    />)}
  </div>
}
