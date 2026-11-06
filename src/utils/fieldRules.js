export const PHONE_MAX = 10;
export const PHONE_MIN = 7;

export const LIMITS = {
  razonSocial: 120,
  nombreComercial: 120,
  identificacionFiscal: 20,
  correo: 120,
  direccion: 200,
};

export const sanitizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, PHONE_MAX);

export const sanitizeTaxId = (value) =>
  String(value || '').replace(/[^0-9.-]/g, '').slice(0, LIMITS.identificacionFiscal);

export const validatePhone = (value) => {
  if (!value) return '';
  return value.length >= PHONE_MIN && value.length <= PHONE_MAX
    ? ''
    : `El teléfono debe tener entre ${PHONE_MIN} y ${PHONE_MAX} dígitos.`;
};

export const validateEmail = (value) => {
  if (!value) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : 'El correo no es válido.';
};
