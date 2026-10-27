export function isImageItem(item) {
  return typeof item?.type === 'string' && item.type.startsWith('image/');
}

// Las fotos se guardan como lista de URLs (columna TEXT[])
export function photosToItems(urls) {
  return (Array.isArray(urls) ? urls : [])
    .filter(Boolean)
    .map((url, index) => ({ url, name: `Foto ${index + 1}`, type: 'image/jpeg' }));
}

export function itemsToPhotos(items) {
  return (items || []).map((item) => item.url);
}

// Planos y evidencias se guardan como JSON en una columna TEXT
export function serializeAttachments(items) {
  if (!items || items.length === 0) return '';
  return JSON.stringify(items.map(({ url, name, type }) => ({ url, name, type })));
}

export function parseAttachments(value) {
  if (!value || typeof value !== 'string') return [];
  const text = value.trim();
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.filter((item) => item && item.url);
    } catch (error) {
      return [{ url: text, name: text, type: 'application/octet-stream' }];
    }
  }
  // Valores antiguos escritos como URL o referencia de texto
  return [{ url: text, name: text, type: 'application/octet-stream' }];
}
