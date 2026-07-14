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
          zoom: slide.imageSet?.zoom || ""
        }
      }));
    }
  };
}
