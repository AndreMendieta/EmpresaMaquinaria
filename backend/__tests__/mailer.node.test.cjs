const test = require('node:test');
const assert = require('node:assert/strict');

delete process.env.SMTP_HOST;
delete process.env.SMTP_PORT;
delete process.env.SMTP_SECURE;
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;
delete process.env.SMTP_FROM;
process.env.NODE_ENV = 'test';

const {enviarCodigoVerificacion} = require('../src/v2/utils/mailer');

test('reports that verification email was not sent when SMTP is missing', async () => {
  const result = await enviarCodigoVerificacion({
    correo: 'test@example.com',
    nombre: 'Prueba',
    codigo: '123456',
    nombreEmpresa: 'HydroTech',
  });

  assert.equal(result.sent, false);
  assert.equal(result.devMode, true);
  assert.equal(result.devCode, '123456');
  assert.match(result.message, /No se envió un correo real/);
});

test('does not expose a development code in production when SMTP is missing', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    const result = await enviarCodigoVerificacion({
      correo: 'test@example.com',
      nombre: 'Prueba',
      codigo: '654321',
      nombreEmpresa: 'HydroTech',
    });

    assert.equal(result.sent, false);
    assert.equal(result.devMode, false);
    assert.equal(result.devCode, undefined);
    assert.equal(result.error, 'SMTP_NOT_CONFIGURED');
    assert.match(result.message, /SMTP no está configurado/);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});
