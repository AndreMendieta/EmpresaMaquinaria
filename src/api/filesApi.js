import client from './client';

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
};

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
};

// Garantiza que el nombre tenga extensión, que el servidor exige para validar el tipo
export function ensureFileName(name, type) {
  const clean = (name || '').trim() || 'archivo';
  if (/\.[A-Za-z0-9]{2,5}$/.test(clean)) return clean;
  return `${clean}.${EXTENSION_BY_MIME[type] || 'jpg'}`;
}

export function guessMimeType(name, fallback = 'application/octet-stream') {
  const extension = (name || '').split('.').pop().toLowerCase();
  return MIME_BY_EXTENSION[extension] || fallback;
}

export async function uploadFile({ uri, name, type }) {
  const mime = type || guessMimeType(name);
  const form = new FormData();
  form.append('archivo', { uri, name: ensureFileName(name, mime), type: mime });
  const res = await client.upload('/files', form, { timeout: 120000 });
  return res.archivo;
}
