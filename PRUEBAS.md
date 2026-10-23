# Pruebas de Software - HydroTech

Guía de pruebas de HydroTech: app móvil React Native (Android), backend Node/Express con PostgreSQL y preview web.

---

## 1. Resumen

| Nivel | Herramienta | Alcance | Ubicación |
|---|---|---|---|
| Estático | ESLint | Calidad y estilo del código | `npm run lint` |
| Unitarias (app) | Jest + React Test Renderer | Render y sesión persistida | `__tests__/App.test.tsx` |
| Unitarias (backend) | Jest | Middleware de autenticación y roles | `backend/__tests__/auth.middleware.test.js` |
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
npm test -- --runInBand       # Jest: app + middleware de autenticación

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

---

## 5. Pruebas manuales (preview web)

Iniciar servicios:

```bash
cd backend && node src/server.js      # API en el puerto 3000
npm run preview                       # http://127.0.0.1:4173/preview.html
```

| # | Flujo | Pasos | Resultado esperado |
|---|---|---|---|
| M1 | Login por rol | Acceso rápido Admin, Supervisor y Técnico | Cada rol ve solo sus módulos |
| M2 | Registro y verificación | Registrar cuenta, ingresar código de 6 dígitos | Cuenta activada; si no hay SMTP, el mensaje lo indica |
| M3 | Recuperar clave / empresa | Pestañas de contraseña y de ID de empresa | Mensaje de envío honesto |
| M4 | Maquinaria | Crear máquina; repetir el mismo código | Detecta duplicado y pide confirmación |
| M5 | Piezas | Crear manguera, torno o cilindro; revisar como supervisor | Aprobar o rechazar actualiza el estado |
| M6 | Órdenes | Crear orden, agregar evidencias, completar | Estado y evidencias reflejados |
| M7 | Reportes | Exportar PDF de máquinas, piezas y órdenes | Descarga un PDF con datos de la empresa |
| M8 | Aislamiento multiempresa | Ingresar con otra empresa | No se ven datos de la primera |

---

## 6. Criterios de aceptación

- `npm run lint` sin errores.
- Todas las pruebas automatizadas en verde.
- `assembleDebug` termina con `BUILD SUCCESSFUL`.
- Flujos manuales M1 a M8 sin errores bloqueantes.
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

