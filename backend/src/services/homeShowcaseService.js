function normalizeImagePosition(value) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  return [x, y].every((coordinate) => Number.isInteger(coordinate) && coordinate >= 0 && coordinate <= 100)
    ? { x, y }
    : { x: 50, y: 50 };
}

export function createHomeShowcaseService({ queries }) {
  return {
    async listPublicSlides() {
      const slides = await queries.listPublicSlides();
      return slides.map((slide) => ({
        id: slide.id,
        label: slide.label,
        title: slide.title,
        eyebrow: slide.eyebrow,
        description: slide.description,
        targetUrl: slide.targetUrl,
        imageAlt: slide.imageAlt,
        imageSet: {
          thumb: slide.imageSet?.thumb || "",
          card: slide.imageSet?.card || "",
          detail: slide.imageSet?.detail || "",
          zoom: slide.imageSet?.zoom || "",
          position: normalizeImagePosition(slide.imageSet?.position)
        }
      }));
    }
  };
}
