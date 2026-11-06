const PHONE_REGEX = /^\d{7,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAX_ID_REGEX = /^[0-9.-]{1,20}$/;

const MAX_LENGTHS = {
  razonSocial: 120,
  nombreComercial: 120,
  correo: 120,
  direccion: 200,
};

// Devuelve un mensaje de error o null si los campos presentes son válidos.
function validateClientCompanyFields(body) {
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const value = body[field];
    if (value !== undefined && value !== null && String(value).length > max) {
      return `${field} no puede superar ${max} caracteres.`;
    }
  }
  const {telefono, correo, identificacionFiscal} = body;
  if (telefono && !PHONE_REGEX.test(String(telefono))) {
    return 'El teléfono debe contener solo números (7 a 10 dígitos).';
  }
  if (correo && !EMAIL_REGEX.test(String(correo).trim())) {
    return 'El correo no es válido.';
  }
  if (identificacionFiscal && !TAX_ID_REGEX.test(String(identificacionFiscal))) {
    return 'La identificación fiscal solo admite números, puntos y guion (máx. 20).';
  }
  return null;
}

module.exports = {validateClientCompanyFields};
