# Pruebas de Software - HydroTech

Guía de pruebas de HydroTech: app móvil React Native (Android), backend Node/Express con PostgreSQL y preview web.

---

## 1. Resumen

| Nivel | Herramienta | Alcance | Ubicación |
|---|---|---|---|
| Estático | ESLint | Calidad y estilo del código | `npm run lint` |
| Unitarias (app) | Jest + React Test Renderer | Render y sesión persistida | `__tests__/App.test.tsx` |
| Unitarias (backend) | Jest | Middleware de autenticación y roles | `backend/__tests__/auth.middleware.test.js` |
| Unitarias (backend) | Jest | Registro/login con código de empresa | `backend/__tests__/auth.companyCode.test.js` |
| Unitarias (app) | Jest | API de maquinaria (lista y creación) | `__tests__/machinesApi.test.js` |
| Unitarias (backend) | Jest | Subida y descarga de archivos | `backend/__tests__/files.routes.test.js` |
| Unitarias (backend) | `node:test` | Mailer y reporte PDF | `backend/__tests__/*.node.test.cjs` |
| Compilación | Gradle | Build Android Debug | `android/gradlew :app:assembleDebug` |
| Manuales | Preview web + dispositivo | Flujos por rol | Sección 5 |

---

## 2. Requisitos previos

- Node.js 22.11 o superior.
- Dependencias instaladas: `npm install` en la raíz y en `backend/`.
- Para pruebas manuales: backend en marcha y base de datos con datos demo (`npm run seed` en `backend/`).
- Para compilar Android: JDK y Android SDK configurados.

---

## 3. Cómo ejecutar las pruebas

```bash
# Raíz del proyecto
npm run lint                  # análisis estático
npm test -- --runInBand       # Jest: app, API de maquinaria, autenticación y código de empresa

# Pruebas del backend con node:test
node --test backend/__tests__/mailer.node.test.cjs backend/__tests__/companyReportPdf.node.test.cjs

# Compilación Android
cd android
./gradlew :app:assembleDebug  # en Windows: .\gradlew.bat :app:assembleDebug
```

---

## 4. Casos automatizados

| # | Archivo | Caso | Resultado esperado |
|---|---|---|---|
| 1 | `App.test.tsx` | La app se renderiza | Sin errores de render |
| 2 | `App.test.tsx` | Persiste y restaura la sesión | La sesión guardada se recupera |
| 3 | `App.test.tsx` | Restaura sesión válida refrescando el usuario | Se llama a `getMe` y se actualiza el usuario |
| 4 | `auth.middleware.test.js` | Token válido | Inyecta `req.user` y continúa |
| 5 | `auth.middleware.test.js` | Token inválido | Responde rechazo |
| 6 | `auth.middleware.test.js` | Token expirado | Responde rechazo |
| 7 | `auth.middleware.test.js` | `requireRoles` | Permite o bloquea según el rol |
| 8 | `mailer.node.test.cjs` | SMTP ausente | Informa que el correo **no** se envió |
| 9 | `mailer.node.test.cjs` | SMTP ausente en producción | No expone el código de verificación |
| 10 | `companyReportPdf.node.test.cjs` | Generación de PDF | PDF válido con máquinas, piezas y órdenes agrupadas |
| 11 | `auth.companyCode.test.js` | Registro con código de formato inválido | 400 con mensaje de código de empresa |
| 12 | `auth.companyCode.test.js` | Registro con código ya existente | 409 y no crea la empresa |
| 13 | `auth.companyCode.test.js` | Registro con código válido (`maq01`) | Se guarda como `MAQ01` y se devuelve en `companyCode` |
| 14 | `auth.companyCode.test.js` | Login con código corto | El código se convierte al UUID de la empresa |
| 15 | `auth.companyCode.test.js` | Login con código inexistente | 401, no coincide con ninguna empresa |
| 16 | `auth.companyCode.test.js` | Login con UUID | Se usa tal cual, sin buscar por código |
| 17 | `machinesApi.test.js` | Lista de máquinas | El backend envía `maquinarias`; la app lo expone como `maquinas` |
| 18 | `machinesApi.test.js` | Lista de máquinas sin datos | Devuelve lista vacía |
| 19 | `machinesApi.test.js` | Crear máquina | Código en mayúsculas y campos vacíos como `null` |
| 20 | `files.routes.test.js` | Subir foto | 201 y URL `/api/v2/files/<id>` |
| 21 | `files.routes.test.js` | Subir `.exe` | 415 y no se guarda nada |
| 22 | `files.routes.test.js` | Subir sin archivo | 400 |
| 23 | `files.routes.test.js` | Descargar imagen | Tipo `image/jpeg` y `inline` |
| 24 | `files.routes.test.js` | Descargar inexistente | 404 |

---

## 5. Pruebas manuales (preview web)

Iniciar servicios:

```bash
cd backend && node src/server.js      # API en el puerto 3000
npm run preview                       # http://127.0.0.1:4173/preview.html
```

| # | Flujo | Pasos | Resultado esperado |
|---|---|---|---|
| M1 | Login por rol | Iniciar sesión con cada usuario (admin, supervisor, técnico) | Cada rol ve solo sus módulos |
| M2 | Registro y verificación | Registrar cuenta, ingresar código de 6 dígitos | Cuenta activada; si no hay SMTP, el mensaje lo indica |
| M3 | Recuperar clave / empresa | Pestañas de contraseña y de ID de empresa | Mensaje de envío honesto |
| M4 | Maquinaria | Crear máquina; repetir el mismo código | Detecta duplicado y pide confirmación |
| M5 | Piezas | Crear manguera, torno o cilindro; revisar como supervisor | Aprobar o rechazar actualiza el estado |
| M6 | Órdenes | Crear orden, agregar evidencias, completar | Estado y evidencias reflejados |
| M7 | Reportes | Exportar PDF de máquinas, piezas y órdenes | Descarga un PDF con datos de la empresa |
| M8 | Aislamiento multiempresa | Ingresar con otra empresa | No se ven datos de la primera |

### Pruebas manuales en el APK (backend en Render)

La primera petición puede tardar hasta 1 minuto (la instancia gratuita se duerme).

| # | Flujo | Pasos | Resultado esperado |
|---|---|---|---|
| A1 | Registro con código | Crear cuenta con código `MAQ01`, empresa, nombre, correo y contraseña | Pasa a la pantalla de verificación; llega el correo con el código |
| A2 | Contraseña visible | Pulsar Mostrar/Ocultar en los campos de contraseña | Alterna entre texto y puntos |
| A3 | Verificar correo | Ingresar el código de 6 dígitos | Va al login con correo y código de empresa rellenados |
| A4 | Login con código | Entrar con `MAQ01`, correo y contraseña | Ingresa al sistema |
| A5 | Sin accesos demo | Abrir el login | No aparece "Acceso rápido por rol (demo)" |
| A6 | Código duplicado | Registrar otra empresa con `MAQ01` | Mensaje "Ese código de empresa ya existe" |
| A7 | Crear máquina | Maquinaria > Crear Máquina, completar y guardar | Vuelve a la lista y la máquina aparece |
| A8 | Crear pieza | Piezas > crear manguera/torno/cilindro y guardar | Queda en borrador y aparece en la lista |
| A9 | Tomar foto | En una pieza, "📷 Tomar foto" y aceptar la cámara | Aparece la miniatura; al guardar se ve en el detalle |
| A10 | Subir plano | En pieza de torno, "📎 Archivo" y elegir PDF/DWG | Aparece el archivo; en el detalle se puede abrir |
| A11 | Evidencia de orden | Orden > Adjuntar Evidencia con foto y descripción | La evidencia muestra la imagen |
| A12 | Editar empresa | Empresa cliente > "Editar datos" (admin), cambiar y guardar | Los datos nuevos se ven al instante |
| A13 | Menú | Abrir el panel principal | Tarjetas en 2 columnas con iconos y texto legible |

---

## 6. Criterios de aceptación

- `npm run lint` sin errores.
- Todas las pruebas automatizadas en verde.
- `assembleDebug` termina con `BUILD SUCCESSFUL`.
- Flujos manuales M1 a M8 y A1 a A13 sin errores bloqueantes.
- No se versionan archivos `.env` ni credenciales.

---

## 7. Monitoreo y métricas (Looker Studio)

**Looker Studio** es la herramienta gratuita de Google para crear dashboards visuales conectando fuentes como GA4, Google Ads, Sheets o HubSpot.

### Boceto del dashboard

```
┌──────────────────────────────────────────────┐
│  DASHBOARD STARTUP        [Fecha: Últ. 30d]  │
├──────────┬──────────┬──────────┬─────────────┤
│ Usuarios │ CTR      │ Conv. %  │ Churn %     │
│  12.4K   │  3.2%    │  4.5%    │  5%         │
├──────────┴──────────┼──────────┴─────────────┤
│ Tráfico por canal   │ Embudo                  │
│ (gráfico de barras) │ Visita > Lead > Compra  │
├─────────────────────┼─────────────────────────┤
│ LTV / CAC (línea)   │ Tendencia mensual       │
└─────────────────────┴─────────────────────────┘
```

### Métricas para ver la salud de una startup en una sola pantalla

| Fuente | Métricas |
|---|---|
| **GA4** | Usuarios, fuentes de tráfico, tasa de conversión, eventos clave |
| **HubSpot** | Leads, oportunidades, clientes, CAC, ciclo de ventas, ingresos |
| **VWO** | Resultados de tests A/B, mapas de calor, conversión por variante |

