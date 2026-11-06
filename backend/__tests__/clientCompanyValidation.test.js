const {validateClientCompanyFields} = require('../src/v2/utils/clientCompanyValidation');

describe('validateClientCompanyFields', () => {
  it('acepta datos válidos y campos vacíos', () => {
    expect(validateClientCompanyFields({telefono: '3001234567', correo: 'a@b.co', identificacionFiscal: '900.123.456-7'})).toBeNull();
    expect(validateClientCompanyFields({})).toBeNull();
  });

  it('rechaza teléfonos con signos, letras o longitud inválida', () => {
    expect(validateClientCompanyFields({telefono: '+57 300 123'})).not.toBeNull();
    expect(validateClientCompanyFields({telefono: '123456'})).not.toBeNull();
    expect(validateClientCompanyFields({telefono: '12345678901'})).not.toBeNull();
  });

  it('rechaza correo, NIT y textos demasiado largos', () => {
    expect(validateClientCompanyFields({correo: 'sin-arroba'})).not.toBeNull();
    expect(validateClientCompanyFields({identificacionFiscal: 'ABC'})).not.toBeNull();
    expect(validateClientCompanyFields({razonSocial: 'x'.repeat(121)})).not.toBeNull();
  });
});
