# HydroTech — Plataforma Multiempresa de Gestión de Maquinaria y Servicios Técnicos

Plataforma web y móvil (React Native / React Native Web) con backend (Node.js + PostgreSQL) para administrar maquinaria, repuestos hidráulicos y órdenes de trabajo bajo una arquitectura multiempresa con aislamiento por empresa prestadora.

- **Repositorio:** [https://github.com/AndreMendieta/EmpresaMaquinaria](https://github.com/AndreMendieta/EmpresaMaquinaria)
- **Diseño de Arquitectura:** Basado en el **Modelo C4** (Contexto, Contenedores y Componentes, diagramados en `docs/diagrams/`).
- **Manuales:** [Manual de usuario](docs/MANUAL_USUARIO.md) y [Manual técnico](docs/MANUAL_TECNICO.md), con imágenes y diagramas integrados en cada documento.
- **Historial:** [Cambios y evolución del proyecto](docs/HISTORIAL_MODIFICACIONES.md).

## Contenido

1. [Resumen y arquitectura](#1-resumen-ejecutivo-y-arquitectura-técnica)
2. [Evolución del proyecto](#2-evolución-del-proyecto-fases-1-a-4)
3. [Roles y permisos](#3-matriz-de-roles-y-control-de-acceso-rbac)
4. [Órdenes de trabajo](#4-formularios-y-gestión-de-órdenes-de-trabajo)
5. [Limpieza de código](#5-depuración-y-eliminación-de-código-muerto-code-cleanup)
6. [Soluciones técnicas](#6-dificultades-técnicas-encontradas-y-soluciones-de-ingeniería)
7. [Pantallas móviles](#7-catálogo-de-pantallas-de-la-fase-4-srcscreens)
8. [Estructura](#8-estructura-del-repositorio)
9. [Instalación, pruebas y despliegue](#9-guía-de-instalación-pruebas-y-despliegue)

Para instrucciones operativas y de desarrollo detalladas, consulta el [manual de usuario](docs/MANUAL_USUARIO.md), el [manual técnico](docs/MANUAL_TECNICO.md) y el [historial de modificaciones](docs/HISTORIAL_MODIFICACIONES.md).

---

## 1. Resumen Ejecutivo y Arquitectura Técnica

El sistema implementa una arquitectura desacoplada cliente-servidor con seguridad multicapa:

```
┌─────────────────────────────────────────────────────────────┐
│       HydroTech Web y Mobile (React Native / RN Web)         │
│   src/auth/ · src/api/ · src/navigation/ · src/screens/     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / REST (JWT Bearer)
┌──────────────────────────────▼──────────────────────────────┐
│                    API Backend (Node.js / Express)          │
│   /api/v2: Auth · Clientes · Usuarios · Máquinas · Piezas   │
│            Órdenes de Trabajo · Notificaciones · Reportes   │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Parametrizado (Pool / SSL)
┌──────────────────────────────▼──────────────────────────────┐
│             Base de Datos Relacional (PostgreSQL / Neon)    │
│   Multi-tenant por UUID · Integridad Referencial · JSONB   │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend Web y móvil:** React Native 0.86.2 y React Native Web; ambas plataformas comparten autenticación, pantallas y cliente API.
- **Backend API:** Node.js, Express, `pg` (PostgreSQL Pool), `bcryptjs`, `jsonwebtoken` (JWT), `cors`, `dotenv`.
- **Base de Datos:** PostgreSQL con extensiones criptográficas (`pgcrypto`), claves foráneas en cascada, índices compuestos por empresa prestadora (`empresa_prestadora_id`), columnas `JSONB` para subtipos técnicos y evidencias fotográficas, y restricciones `CHECK` para integridad estricta de estados y roles.
- **Aplicación Web:** Compilación con Vite servida por el backend. Comparte las pantallas, roles, cuentas y API v2 con la APK.

---

## 2. Evolución del Proyecto (Fases 1 a 4)

El desarrollo del proyecto se consolidó de manera incremental siguiendo especificaciones de ingeniería:

### Fase 1: Prototipo Inicial e Historias de Usuario HU-014 y HU-015
- Implementación de flujos base de registro y consulta de maquinaria.
- Creación de fichas técnicas para componentes de campo con carga fotográfica.
- Bandeja de supervisión para aprobación y validación de repuestos.

### Fase 2: Modelo de Datos Multiempresa (*Multi-tenant Database*)
- Transición a claves primarias tipo UUID (`gen_random_uuid()`).
- Creación del esquema `schema.multiempresa.sql`:
  - `empresas_prestadoras`: Empresas contratistas de servicio técnico y taller.
  - `empresas_clientes`: Empresas dueñas de maquinaria y contratantes de servicios.
  - `usuarios_multiempresa`: Personal técnico y administrativo con scope empresarial.
  - Subtipos estructurados de repuestos: `piezas_manguera`, `piezas_torno`, `piezas_cilindro`.
  - `ordenes_servicio`: Control operativo de órdenes de trabajo.
  - `registros_auditoria`: Trazabilidad inmutable de altas, bajas y modificaciones.

### Fase 3: API REST v2 y Seguridad por Ámbito Empresarial
- Implementación de rutas `/api/v2` con validación estricta de empresa prestadora (`req.user.service_company_id`).
- Middlewares de seguridad:
  - `auth`: Decodificación y verificación del token JWT.
  - `requireRole`: Control de acceso basado en roles (RBAC).
  - `requireCompanyScope`: Bloqueo de acceso cruzado entre empresas inquilinas (*cross-tenant leakage*).
- Prevención de auto-aprobación en piezas: un usuario no puede validar sus propias piezas (`creado_por <> $4`).

### Fase 4: Aplicación compartida React Native (Carpeta `src/`)
- Reorganización total de la arquitectura frontend:
  - `src/auth/`: Contexto de autenticación (`AuthContext.js`, `useAuth.js`) y persistencia local (`session.js`).
  - `src/api/`: Cliente HTTP centralizado (`client.js`) con interceptores para JWT, timeout de 15s con `AbortController` y detección de errores `401` y `403`.
  - `src/navigation/`: Navegador tipo pila con histórico (`AppNavigator.js`), condicionado al rol activo (`admin`, `supervisor`, `tecnico`).
  - `src/components/`: Componentes UI reutilizables con la guía de marca oficial HydroTech (`HeaderBar`, `Badge`, `ForbiddenNotice`, `CustomInput`, formularios de subtipos).
  - `src/screens/`: 24 pantallas implementadas para cubrir todo el ciclo operativo.

---

## 3. Matriz de Roles y Control de Acceso (RBAC)

La plataforma aplica permisos tanto a nivel de API como en interfaz móvil:

| Módulo / Acción | Administrador (`admin`) | Supervisor (`supervisor`) | Técnico (`tecnico`) |
|---|:---:|:---:|:---:|
| **Empresas Clientes** | Crear, Consultar, Modificar | Consultar | Consultar |
| **Flota de Maquinaria** | Crear, Consultar, Editar | Crear, Consultar, Editar | Solo Consulta y Guía Técnica |
| **Manuales de Fabricante** | Enlazar y Consultar | Enlazar y Consultar | Consultar en línea |
| **Fichas de Piezas (Borrador)** | Crear y Consultar | Crear y Consultar | Crear y Enviar a Revisión |
| **Aprobación de Calidad** | Aprobar / Rechazar | Aprobar / Rechazar | ❌ Bloqueado |
| **Órdenes de Trabajo** | Crear, Asignar, Gestionar | Crear, Asignar, Gestionar | Atender y Cerrar Asignadas |
| **Evidencias Técnicas** | Registrar y Consultar | Registrar y Consultar | Registrar (Antes / Durante / Después) |
| **Gestión de Personal** | Crear usuarios, Activar/Desactivar | Consultar técnicos | ❌ Bloqueado |
| **Reportes y Métricas** | Métricas Globales de Taller | Métricas Globales de Taller | Solo tareas y piezas propias |

> **Seguridad defensiva en frontend:** Las pantallas muestran un aviso de acceso denegado cuando la API responde `403 Forbidden`; consulta [ForbiddenNotice.js](src/components/ForbiddenNotice.js).

---

## 4. Formularios y Gestión de Órdenes de Trabajo

El módulo de órdenes de trabajo permite coordinar las actividades de taller y campo cubriendo los siguientes datos clave:

1. **Empresa Cliente:** Selección interactiva del cliente contratante (`empresa_cliente_id`).
2. **Máquina Asociada:** Equipo intervenido (`maquinaria_id`), con filtrado por cliente.
3. **Descripción del Trabajo:** Detalle técnico de averías, síntomas o requerimientos operativos.
4. **Prioridad:** Clasificación visual por urgencia (`baja`, `normal`, `alta`, `urgente`).
5. **Técnico Asignado:** Especialista responsable (`asignada_a`). Asignable al crear o reasignable en cualquier etapa por supervisores/administradores con emisión de notificación automática.
6. **Estado de la Orden:** Ciclo de vida controlado: `abierta` ➔ `en_progreso` ➔ `completada` (o `cancelada`). Al completarse, se registra la marca de tiempo `completada_en = NOW()`.
7. **Evidencias del Trabajo Realizado:** Registro fotográfico y notas técnicas almacenadas en columna `evidencias JSONB`, clasificadas en tres etapas de intervención:
   - 🟡 **Antes / Diagnóstico:** Estado del equipo o pieza al ser recibido (fugas, desgaste, roturas).
   - 🔵 **Durante / Intervención:** Avance del maquinado, prensado de mangueras o armado de sellos.
   - 🟢 **Después / Finalizado:** Prueba de presión hidrostática superada y equipo entregado operativo.

---

## 5. Depuración y Eliminación de Código Muerto (*Code Cleanup*)

Durante la consolidación de la Fase 4, se realizó una auditoría y saneamiento técnico integral para eliminar código heredado (*legacy*) que introducía duplicidad y confusión arquitectónica:

### Archivos Eliminados del Frontend

| Archivo / Carpeta Eliminada | Motivo de Depuración | Sustituto Oficial Fase 4 |
|---|---|---|
| `src/screens/MaquinariaListScreen.js` | Pantalla v1 obsoleta, endpoints legacy `/api/maquinas`. | [MachinesScreen.js](src/screens/MachinesScreen.js) |
| `src/screens/MaquinariaDetailScreen.js` | Detalle v1 sin soporte para subtipos de ingeniería. | [MachineDetailScreen.js](src/screens/MachineDetailScreen.js) |
| `src/screens/PiezaFormScreen.js` | Formulario genérico v1 sin campos específicos por familia. | Formularios especializados: [CreateHoseScreen.js](src/screens/CreateHoseScreen.js), [CreateLathePartScreen.js](src/screens/CreateLathePartScreen.js) y [CreateCylinderScreen.js](src/screens/CreateCylinderScreen.js) |
| `src/screens/NotificacionesScreen.js` | Bandeja v1 sin distinción de órdenes ni scope UUID. | [NotificationsScreen.js](src/screens/NotificationsScreen.js) |
| `src/services/` *(carpeta completa)* | Capa de servicios legacy v1 con URLs cableadas (`api.js`, `authService.js`, `maquinaService.js`, `piezaService.js`, `session.js`, `userService.js`). | Capa centralizada modular: [src/api/](src/api/) y [src/auth/](src/auth/) |

### Resultados del Saneamiento
- **ESLint:** El comando de validación es `npm run lint` desde la raíz.
- **Desacoplamiento total:** Ningún componente activo referencia módulos heredados.
- **Reducción de tamaño del paquete:** Eliminadas más de 1,200 líneas de código muerto.

---

## 6. Dificultades Técnicas Encontradas y Soluciones de Ingeniería

Durante el desarrollo e integración se superaron diversos desafíos técnicos relevantes:

### 1. Incompatibilidad de Tipos en PostgreSQL (`Error 42P08: inconsistent types deduced`)
- **Problema:** En la sentencia de actualización de órdenes:
  ```sql
  UPDATE ordenes_servicio SET estado = $1, completada_en = CASE WHEN $1 = 'completada' THEN NOW() ...
  ```
  PostgreSQL deducía que `$1` era `VARCHAR(20)` para la asignación de columna, pero deducía `TEXT` en la expresión condicional del `CASE WHEN`, arrojando un error `500` interno.
- **Solución  :** Se aplicó casting explícito de parámetros:
  ```sql
  UPDATE ordenes_servicio
  SET estado = $1::varchar,
      completada_en = CASE WHEN $1::text = 'completada' THEN NOW() ELSE completada_en END,
      actualizado_en = NOW()
  WHERE id = $2 AND empresa_prestadora_id = $3
  ```

### 2. Discrepancia en Nombres de Columnas Relacionales (`JOINs` Multi-tenant)
- **Problema:** La consulta de órdenes intentaba proyectar `ec.nombre AS cliente_nombre`, pero la tabla `empresas_clientes` almacena la razón social y nombre comercial bajo `razon_social` y `nombre_comercial`.
- **Solución:** Se estandarizó la consulta base con resolución en cascada:
  ```sql
  COALESCE(ec.razon_social, ec.nombre_comercial) AS cliente_nombre
  ```

### 3. Procesos Residuales y Conflicto de Puertos en Windows (`EADDRINUSE :::3000`)
- **Problema:** Al reiniciar servidores de desarrollo bajo Windows, procesos secundarios de Node.js quedaban en segundo plano manteniendo abierto el puerto TCP 3000.
- **Solución:** Implementación de scripts de inspección vía PowerShell (`Get-NetTCPConnection -LocalPort 3000`) para identificar el PID del proceso huérfano y terminarlo limpiamente antes de reiniciar el entorno de desarrollo.

### 4. Navegación Dinámica por Roles sin Fallas Nativas
- **Problema:** El uso de librerías nativas complejas de navegación en entornos híbridos Windows / Android suele presentar conflictos de enlace nativo (*native linking*) con versiones recientes de React Native (0.86+).
- **Solución:** Se diseñó un enrutador por estado reactivo tipo pila (`navStack`) dentro de [AppNavigator.js](src/navigation/AppNavigator.js), que gestiona transiciones, paso de parámetros entre pantallas y botón de retroceso (`goBack`), integrado con `useAuth()`.

### 5. Control Estricto de Calidad (Anti Auto-aprobación)
- **Problema:** Riesgo de fraude o negligencia técnica si un usuario aprueba sus propias reparaciones.
- **Solución:** Restricción a nivel de consulta SQL en `backend/src/v2/routes/parts.routes.js`:
  ```sql
  UPDATE piezas_multiempresa
  SET estado_validacion = 'validada', validado_por = $2, validado_en = NOW()
  WHERE id = $1 AND empresa_prestadora_id = $3 AND creado_por <> $4
  ```
  Si el autor intenta validarla, la base de datos no actualiza ningún registro y el backend retorna `403 Forbidden`.

---

## 7. Catálogo de Pantallas de la Fase 4 (`src/screens/`)

La aplicación móvil cuenta con 24 pantallas:

1. [LoginScreen.js](src/screens/LoginScreen.js): Inicio de sesión con empresa, correo y contraseña.
2. [RegisterScreen.js](src/screens/RegisterScreen.js): Registro de colaboradores.
3. [VerifyEmailScreen.js](src/screens/VerifyEmailScreen.js): Verificación de correo.
4. [ForgotPasswordScreen.js](src/screens/ForgotPasswordScreen.js): Recuperación de acceso.
5. [DashboardScreen.js](src/screens/DashboardScreen.js): Panel principal condicionado al rol.
6. [ClientCompaniesScreen.js](src/screens/ClientCompaniesScreen.js): Catálogo de empresas clientes.
7. [ClientCompanyDetailScreen.js](src/screens/ClientCompanyDetailScreen.js): Ficha del cliente y su flota.
8. [MachinesScreen.js](src/screens/MachinesScreen.js): Listado de maquinaria.
9. [MachineDetailScreen.js](src/screens/MachineDetailScreen.js): Ficha del equipo y manual enlazado.
10. [CreateMachineScreen.js](src/screens/CreateMachineScreen.js): Alta de maquinaria.
11. [PartsScreen.js](src/screens/PartsScreen.js): Catálogo de piezas y estados.
12. [PartDetailScreen.js](src/screens/PartDetailScreen.js): Ficha técnica y evidencias de la pieza.
13. [EditPartScreen.js](src/screens/EditPartScreen.js): Edición de una pieza.
14. [PartReviewScreen.js](src/screens/PartReviewScreen.js): Revisión y validación de piezas.
15. [CreateHoseScreen.js](src/screens/CreateHoseScreen.js): Formulario técnico de mangueras.
16. [CreateLathePartScreen.js](src/screens/CreateLathePartScreen.js): Formulario técnico de piezas de torno.
17. [CreateCylinderScreen.js](src/screens/CreateCylinderScreen.js): Formulario técnico de cilindros.
18. [OrdersScreen.js](src/screens/OrdersScreen.js): Listado de órdenes de trabajo.
19. [CreateOrderScreen.js](src/screens/CreateOrderScreen.js): Creación de órdenes.
20. [OrderDetailScreen.js](src/screens/OrderDetailScreen.js): Seguimiento y gestión de una orden.
21. [NotificationsScreen.js](src/screens/NotificationsScreen.js): Alertas operativas.
22. [ReportsScreen.js](src/screens/ReportsScreen.js): Métricas e informes.
23. [UsersScreen.js](src/screens/UsersScreen.js): Administración de colaboradores.
24. [ProfileScreen.js](src/screens/ProfileScreen.js): Perfil y preferencias de cuenta.

---

## 8. Estructura del Repositorio

```
EmpresaMaquinaria/
├── android/                         # Proyecto nativo Android
├── backend/                         # Servidor Node.js Express + PostgreSQL
│   ├── src/
│   │   ├── db/                      # pool.js, schema.multiempresa.sql, seed.js
│   │   ├── middlewares/             # auth.middleware.js (v1 legacy)
│   │   ├── routes/                  # Rutas Fase 1 (usadas por test-suite.js)
│   │   ├── v2/                      # API REST Multiempresa Oficial
│   │   │   ├── middlewares/         # auth.js, requireRole.js, requireCompanyScope.js
│   │   │   ├── routes/              # auth, clientCompanies, users, machines, parts, orders, notifications, reports
│   │   │   ├── utils/               # audit.js, notifications.js
│   │   │   ├── app.js               # Enrutador central v2
│   │   └── server.js                # Servidor principal (puerto 3000)
│   ├── test-suite.js                # Pruebas automatizadas de integración
│   └── package.json
├── docs/
│   ├── diagrams/                    # Modelos C4 en PlantUML (Nivel 1, 2 y 3)
│   ├── images/                      # Capturas usadas por la documentación
│   ├── MANUAL_USUARIO.md
│   ├── MANUAL_TECNICO.md
│   └── HISTORIAL_MODIFICACIONES.md
├── src/                             # Pantallas y lógica compartidas por web y Android
│   ├── api/                         # Cliente HTTP y llamadas a la API v2
│   ├── auth/                        # Contexto de sesión, persistencia y hooks
│   ├── components/                  # Componentes reutilizables y formularios
│   ├── constants/                   # colors.js (paleta oficial HydroTech)
│   ├── navigation/                  # AppNavigator.js con stack por roles
│   └── screens/                     # 24 pantallas de la aplicación
├── App.js                           # Punto de entrada envuelto en AuthProvider
├── index.web.js                     # Entrada web de las pantallas compartidas
├── vite.config.js                   # Compilación web
├── 404.html                         # Página de error para rutas inexistentes
├── package.json                     # Configuración del frontend
└── README.md                        # Documentación técnica del proyecto
```

---

## 9. Guía de Instalación, Pruebas y Despliegue

### Requisitos
- Node.js versión 22.11 o superior.
- Base de datos PostgreSQL en la nube (Neon / Render) o local.

### 1. Puesta en Marcha del Backend
```bash
# 1. Instalar dependencias
cd backend
npm install

# 2. Configurar variables de entorno (.env)
# DATABASE_URL=postgresql://usuario:clave@host/db?sslmode=require
# JWT_SECRET=clave_secreta_jwt_hydrotech
# PORT=3000

# 3. Aplicar esquema multiempresa
npm run migrate:multitenant

# 4. Iniciar servidor de desarrollo
npm run dev
```

### 2. Ejecución de Pruebas Automatizadas
```bash
# Ejecutar suite de pruebas de integración del backend (17 casos de prueba)
npm test

# Ejecutar verificación de estilo y calidad de código
npx eslint .
```

### 3. Cuentas de prueba

Usa cuentas creadas para un entorno local o de pruebas. No publiques contraseñas ni tokens; crea las cuentas desde el flujo de registro o solicita las credenciales de prueba por un canal privado.

#### Códigos de prueba y demostración

Estos códigos son datos de ejemplo para pruebas locales; no son credenciales ni deben usarse como datos de producción.

| Código | Uso |
|---|---|
| `TEST_REG_01` | Código temporal de empresa que crea la suite de integración del backend. La suite elimina sus datos al terminar. |
| `MAQ01` | Código utilizado en las pruebas de registro e inicio de sesión por código de empresa. El registro normaliza `maq01` a `MAQ01`. |
| `DEMO01` | Código de la empresa de demostración creada por `npm run seed` desde `backend/`. |
| `CAT-320` | Código de maquinaria utilizado por la suite de integración. |
| `CAT-320-OTRA` | Código de maquinaria utilizado para probar la detección de duplicados por nombre. |
| `MAQ-PROHIBIDA` | Código usado para comprobar que se rechazan operaciones no autorizadas sobre maquinaria. |
| `MAQ-BAJA` | Código usado para probar la baja lógica y la consulta de maquinaria inactiva. |
| `CAT-320D` | Maquinaria incluida en los datos de demostración creados por `npm run seed`. |
| `MANG-4SP-01` | Pieza de demostración y de integración asociada a una máquina. Se usa para probar registro y detección de duplicados. |

Para más detalle sobre comandos y resultados esperados, consulta la [guía de pruebas](PRUEBAS.md). Incluye recorridos manuales para la aplicación web y la APK.

### 4. Métodos para Probar la Interfaz
1. **Aplicación Web:** Inicia el backend en el puerto 3000 en una terminal y, desde la raíz, ejecuta `npm run preview` en otra; abre `http://127.0.0.1:4173`.
2. **Dispositivo Físico o Emulador Android:**
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   npx react-native run-android
   ```

### 5. Despliegue de prueba en Render

El archivo `render.yaml` configura el backend Node.js y una base PostgreSQL para pruebas.

1. Sube el proyecto a GitHub y, en Render, crea un **Blueprint** conectado a ese repositorio. Render detectará `render.yaml` y mostrará los servicios que va a crear.
2. Espera a que el backend y PostgreSQL estén disponibles. La URL pública configurada actualmente es `https://hydrotech-api-c2bs.onrender.com`; comprueba que `https://<tu-url>/health` responda con `ok: true`.
3. Inicializa las tablas desde PowerShell en tu computadora. En Render, abre la base PostgreSQL, copia su **External Database URL** y úsala localmente; no la compartas ni la guardes en el repositorio:

   ```powershell
   Set-Location .\backend
   $env:DATABASE_URL = Read-Host "Pega la External Database URL de Render"
   npm run migrate
   if ($LASTEXITCODE -eq 0) { npm run migrate:multitenant }
   $migrationExitCode = $LASTEXITCODE
   Remove-Item Env:DATABASE_URL
   if ($migrationExitCode -ne 0) { throw "Falló la inicialización de la base de datos." }
   ```

   Ejecuta esta inicialización una sola vez sobre una base vacía. Si falla, revisa el error antes de volver a intentarlo.
4. Para que el registro y la recuperación de contraseña envíen códigos, configura en el servicio de Render las variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y `SMTP_PASS`. Sin SMTP, esos correos no se envían en producción.
5. La aplicación web usa `/api/v2` en el mismo origen. La APK ya está configurada para la API publicada; genera una nueva APK solo si cambias la URL del backend.
6. El sitio público incluye título y descripción para buscadores, además de `https://<tu-url>/robots.txt` y `https://<tu-url>/sitemap.xml`. Después de desplegar cambios, comprueba los endpoints y vuelve a ejecutar el analizador; el puntaje también depende de sus criterios y de la indexación del sitio.

**Importante:** esta configuración usa recursos gratuitos solo para pruebas. Render indica que las bases gratuitas vencen a los 30 días; los servicios gratuitos pueden dormir por inactividad, y los archivos subidos al disco local (como fotos) no son persistentes. No la uses para datos reales ni para operación de negocio; antes necesitarás planes con persistencia y copias de seguridad, además de almacenamiento duradero para fotos. Revisa los [límites de Render gratuito](https://render.com/docs/free) antes de crear los recursos.

### 6. Sitio web

La aplicación publicada en [https://hydrotech-api-c2bs.onrender.com](https://hydrotech-api-c2bs.onrender.com) comparte la API v2 y los datos con la APK. El backend sirve la compilación web, la página 404 y los endpoints `robots.txt` y `sitemap.xml`.

El puntaje SEO depende de la herramienta de análisis, el contenido indexable, el rendimiento y la disponibilidad del sitio; estos cambios no garantizan un porcentaje específico. Vuelve a analizar el sitio después del despliegue y atiende las advertencias restantes.

No se incluye Google Analytics porque requiere un identificador de medición y una decisión sobre consentimiento y privacidad.

### 7. Accesibilidad

Las pantallas web comparten componentes accesibles con React Native. Complementa las auditorías automáticas con pruebas manuales de teclado y lector de pantalla; los resultados automatizados no sustituyen una evaluación completa.
