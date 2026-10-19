const nodemailer = require('nodemailer');

// Configuración opcional por variables de entorno
const {
  SMTP_HOST,
  SMTP_PORT = 587,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = '"HydroTech Seguridad" <no-reply@hydrotech.com>',
  SMTP_SECURE = 'false',
} = process.env;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

function generarPlantillaBase({ titulo, subtitulo, contenidoHtml, avisoPie }) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titulo}</title>
    <style>
      body {
        margin: 0; padding: 0; background-color: #0D0D0D; color: #F3F2EF;
        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
      .container {
        max-width: 580px; margin: 30px auto; background-color: #161616;
        border: 1px solid rgba(192, 192, 192, 0.2); border-radius: 12px; overflow: hidden;
      }
      .header {
        background-color: #0D0D0D; padding: 24px; text-align: center;
        border-bottom: 2px solid #FF6A00;
      }
      .logo {
        font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;
      }
      .logo-accent { color: #FF6A00; }
      .header-sub {
        font-size: 11px; font-weight: 700; color: #C0C0C0; letter-spacing: 1px;
        text-transform: uppercase; margin-top: 4px;
      }
      .body-content { padding: 32px 28px; }
      .title { font-size: 20px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px; }
      .subtitle { font-size: 14px; color: #A9A9A6; line-height: 1.5; margin-bottom: 24px; }
      .code-box {
        background-color: #0D0D0D; border: 2px dashed #FF6A00; border-radius: 8px;
        padding: 20px; text-align: center; margin: 24px 0;
      }
      .code-value {
        font-family: 'Consolas', 'Courier New', monospace; font-size: 34px;
        font-weight: 800; letter-spacing: 8px; color: #FF6A00;
      }
      .code-hint { font-size: 11px; color: #A9A9A6; margin-top: 8px; }
      .info-card {
        background-color: rgba(255, 106, 0, 0.06); border: 1px solid rgba(255, 106, 0, 0.3);
        border-radius: 8px; padding: 14px; margin: 18px 0; font-size: 13px; color: #E5E5E5;
      }
      .footer {
        padding: 20px; text-align: center; font-size: 11px; color: #737373;
        border-top: 1px solid rgba(192, 192, 192, 0.1); background-color: #121212;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Hydro<span class="logo-accent">Tech</span></div>
        <div class="header-sub">Sistemas Hidráulicos & Gestión de Maquinaria</div>
      </div>
      <div class="body-content">
        <div class="title">${titulo}</div>
        <div class="subtitle">${subtitulo}</div>
        ${contenidoHtml}
      </div>
      <div class="footer">
        ${avisoPie || 'Este correo es generado automáticamente por la plataforma HydroTech. Si no solicitaste esta acción, puedes ignorarlo con total seguridad.'}
      </div>
    </div>
  </body>
  </html>
  `;
}

async function dispatchEmail({ to, subject, html, text, devCode = null }) {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html,
        text: text || subject,
      });
      console.log(`[MAILER] Correo enviado a ${to} (MessageId: ${info.messageId})`);
      return { ok: true, sent: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[MAILER ERROR] Falló envío a ${to}:`, err.message);
      // Fallback a log para no romper la experiencia en caso de fallo SMTP
    }
  }

  // Fallback simulado para desarrollo local / testing
  console.log('\n======================================================');
  console.log(`📨 [MAILER DEV SIMULATOR] Correo para: ${to}`);
  console.log(`📋 Asunto: ${subject}`);
  if (devCode) {
    console.log(`🔑 CÓDIGO GENERADO: >>> [ ${devCode} ] <<<`);
  }
  console.log('======================================================\n');

  return { ok: true, devMode: true, devCode };
}

/**
 * Envía el código de 6 dígitos para verificar la cuenta al registrarse
 */
async function enviarCodigoVerificacion({ correo, nombre, codigo, nombreEmpresa }) {
  const subject = `${codigo} es tu código de verificación de cuenta HydroTech`;
  const html = generarPlantillaBase({
    titulo: `¡Hola, ${nombre || 'Usuario'}!`,
    subtitulo: `Gracias por registrarte en HydroTech para la empresa <strong>${nombreEmpresa || 'HydroTech'}</strong>. Para activar tu cuenta, ingresa el siguiente código de confirmación en la app:`,
    contenidoHtml: `
      <div class="code-box">
        <div class="code-value">${codigo}</div>
        <div class="code-hint">Válido por 24 horas a partir de su emisión</div>
      </div>
      <div class="info-card">
        🛡️ <strong>Tu seguridad es primero:</strong> La verificación de correo garantiza que solo tú puedas gestionar tus órdenes y componentes autorizados.
      </div>
    `,
  });

  return dispatchEmail({ to: correo, subject, html, devCode: codigo });
}

/**
 * Envía el código de 6 dígitos para recuperar la contraseña y recuerda datos de usuario y empresa
 */
async function enviarCodigoRecuperacion({ correo, nombre, codigo, nombreEmpresa, serviceCompanyId }) {
  const subject = `${codigo} es tu código para restablecer tu contraseña`;
  const html = generarPlantillaBase({
    titulo: 'Restablecimiento de Contraseña y Acceso',
    subtitulo: `Hemos recibido una solicitud para restablecer la contraseña de tu cuenta asociada a <strong>${correo}</strong>.`,
    contenidoHtml: `
      <div class="code-box">
        <div class="code-value">${codigo}</div>
        <div class="code-hint">Este código expira en 15 minutos</div>
      </div>

      <div class="info-card">
        <strong>📋 Información de Acceso y Empresa:</strong><br>
        • <strong>Nombre registrado:</strong> ${nombre || 'Usuario'}<br>
        • <strong>Empresa Prestadora:</strong> ${nombreEmpresa || 'HydroTech S.A.S.'}<br>
        • <strong>ID de Empresa (para inicio de sesión):</strong> <code style="color: #FF6A00;">${serviceCompanyId}</code>
      </div>
      <p style="font-size: 13px; color: #A9A9A6; line-height: 1.5;">
        Si tú no solicitaste este cambio, puedes ignorar este mensaje; tu contraseña actual continuará siendo segura.
      </p>
    `,
  });

  return dispatchEmail({ to: correo, subject, html, devCode: codigo });
}

/**
 * Envía un recordatorio de las cuentas y empresas a las que pertenece un correo
 */
async function enviarRecordatorioCuentas({ correo, cuentas }) {
  const subject = 'HydroTech — Recordatorio de tus Cuentas y Empresas';
  const cuentasHtml = cuentas
    .map(
      (c) => `
      <div style="background: #0D0D0D; border: 1px solid rgba(192, 192, 192, 0.2); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
        <div style="color: #FF6A00; font-weight: 700; font-size: 14px;">🏢 ${c.nombre_empresa || c.razon_social}</div>
        <div style="font-size: 12px; color: #C0C0C0; margin-top: 4px;">ID Empresa: <code style="color: #38BDF8;">${c.empresa_prestadora_id}</code></div>
        <div style="font-size: 12px; color: #A9A9A6;">Rol: <strong>${(c.rol || 'tecnico').toUpperCase()}</strong> · Usuario: ${c.nombre_completo}</div>
      </div>
    `
    )
    .join('');

  const html = generarPlantillaBase({
    titulo: 'Recordatorio de Credenciales y Empresas',
    subtitulo: `Encontramos las siguientes cuentas vinculadas a tu dirección de correo <strong>${correo}</strong>:`,
    contenidoHtml: `
      <div style="margin: 16px 0;">
        ${cuentasHtml}
      </div>
      <div class="info-card">
        💡 <strong>¿Cómo iniciar sesión?</strong> En la pantalla de login, ingresa el <em>ID de Empresa</em> correspondiente, tu correo y tu contraseña.
      </div>
    `,
  });

  return dispatchEmail({ to: correo, subject, html });
}

function generarCodigo6Digitos() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  enviarCodigoVerificacion,
  enviarCodigoRecuperacion,
  enviarRecordatorioCuentas,
  generarCodigo6Digitos,
};
