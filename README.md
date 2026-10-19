# HydroTech — Plataforma Multiempresa de Gestión de Maquinaria y Servicios Técnicos

Plataforma integral móvil (React Native) y backend (Node.js + PostgreSQL) orientada a la administración de maquinaria pesada, componentes y repuestos hidráulicos (mangueras, racores, torneado, cilindros) y órdenes de trabajo bajo una arquitectura multi-inquilino (*multi-tenant*) con aislamiento estricto por empresa prestadora.

- **Repositorio:** [https://github.com/AndreMendieta/EmpresaMaquinaria](https://github.com/AndreMendieta/EmpresaMaquinaria)
- **Diseño de Arquitectura:** Basado en el **Modelo C4** (Contexto, Contenedores y Componentes, diagramados en `docs/diagrams/`).

---

## 1. Resumen Ejecutivo y Arquitectura Técnica

El sistema implementa una arquitectura desacoplada cliente-servidor con seguridad multicapa:

```
┌─────────────────────────────────────────────────────────────┐
│                 HydroTech Mobile (React Native)             │
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

- **Frontend Móvil:** React Native 0.86.2, `react-native-safe-area-context`, `@react-native-async-storage/async-storage`.
- **Backend API:** Node.js, Express, `pg` (PostgreSQL Pool), `bcryptjs`, `jsonwebtoken` (JWT), `cors`, `dotenv`.
- **Base de Datos:** PostgreSQL con extensiones criptográficas (`pgcrypto`), claves foráneas en cascada, índices compuestos por empresa prestadora (`empresa_prestadora_id`), columnas `JSONB` para subtipos técnicos y evidencias fotográficas, y restricciones `CHECK` para integridad estricta de estados y roles.
- **Visor Web de Validación:** Simulador web interactivo (`preview.html`) con endpoints de compatibilidad (`/api/preview`) para pruebas ágiles de diseño y flujos de usuario en escritorio.

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

### Fase 4: Frontend Móvil React Native (Carpeta `src/`)
- Reorganización total de la arquitectura frontend:
  - `src/auth/`: Contexto de autenticación (`AuthContext.js`, `useAuth.js`) y persistencia local (`session.js`).
  - `src/api/`: Cliente HTTP centralizado (`client.js`) con interceptores para JWT, timeout de 15s con `AbortController` y detección de errores `401` y `403`.
  - `src/navigation/`: Navegador tipo pila con histórico (`AppNavigator.js`), condicionado al rol activo (`admin`, `supervisor`, `tecnico`).
  - `src/components/`: Componentes UI reutilizables con la guía de marca oficial HydroTech (`HeaderBar`, `Badge`, `ForbiddenNotice`, `CustomInput`, formularios de subtipos).
  - `src/screens/`: 20 pantallas oficiales implementadas para cubrir todo el ciclo operativo.

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

> **Seguridad Defensiva en Frontend:** Cada pantalla que consume rutas restringidas captura automáticamente el código `403 Forbidden` (`err.isForbidden`) y renderiza el componente [ForbiddenNotice.js](file:///c:/dev/EmpresaMaquinaria/src/components/ForbiddenNotice.js), impidiendo que la aplicación sufra cierres forzados (*crashes*).

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
| `src/screens/MaquinariaListScreen.js` | Pantalla v1 obsoleta, endpoints legacy `/api/maquinas`. | [MachinesScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/MachinesScreen.js) |
| `src/screens/MaquinariaDetailScreen.js` | Detalle v1 sin soporte para subtipos de ingeniería. | [MachineDetailScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/MachineDetailScreen.js) |
| `src/screens/PiezaFormScreen.js` | Formulario genérico v1 sin campos específicos por familia. | [CreateHoseScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateHoseScreen.js), [CreateLathePartScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateLathePartScreen.js), [CreateCylinderScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateCylinderScreen.js) |
| `src/screens/NotificacionesScreen.js` | Bandeja v1 sin distinción de órdenes ni scope UUID. | [NotificationsScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/NotificationsScreen.js) |
| `src/services/` *(carpeta completa)* | Capa de servicios legacy v1 con URLs cableadas (`api.js`, `authService.js`, `maquinaService.js`, `piezaService.js`, `session.js`, `userService.js`). | Capa centralizada modular: [src/api/](file:///c:/dev/EmpresaMaquinaria/src/api/) y [src/auth/](file:///c:/dev/EmpresaMaquinaria/src/auth/) |

### Resultados del Saneamiento
- **0 advertencias en ESLint:** Verificado con `npx eslint .` en todo el proyecto.
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
- **Solución:** Se diseñó un enrutador por estado reactivo tipo pila (`navStack`) dentro de [AppNavigator.js](file:///c:/dev/EmpresaMaquinaria/src/navigation/AppNavigator.js), que gestiona transiciones, paso de parámetros entre pantallas y botón de retroceso (`goBack`), integrado transparentemente con `useAuth()`.

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

La aplicación móvil cuenta con 21 pantallas optimizadas:

1. [LoginScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/LoginScreen.js): Autenticación con ID de empresa prestadora (UUID), correo y contraseña.
2. [RegisterScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/RegisterScreen.js): Registro de colaboradores con validaciones de contraseña.
3. [DashboardScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/DashboardScreen.js): Panel principal con accesos rápidos condicionados al rol.
4. [ClientCompaniesScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/ClientCompaniesScreen.js): Catálogo de clientes contratantes.
5. [ClientCompanyDetailScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/ClientCompanyDetailScreen.js): Ficha del cliente y flota asociada.
6. [MachinesScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/MachinesScreen.js): Listado de maquinaria con buscador y filtro.
7. [MachineDetailScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/MachineDetailScreen.js): Ficha de equipo, manual oficial enlazado y despiece.
8. [CreateMachineScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateMachineScreen.js): Alta de maquinaria autorizada (Supervisor/Admin).
9. [PartsScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/PartsScreen.js): Catálogo de repuestos con chips de estado (`borrador`, `pendiente`, `validada`, `rechazada`).
10. [PartDetailScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/PartDetailScreen.js): Ficha técnica de pieza, galería fotográfica y botón para enviar a revisión.
11. [PartReviewScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/PartReviewScreen.js): Panel de control de calidad para validación/rechazo de piezas.
12. [CreateHoseScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateHoseScreen.js): Formulario técnico de mangueras (diámetros, presión, conexiones).
13. [CreateLathePartScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateLathePartScreen.js): Formulario técnico de piezas de torno (tolerancias, roscas, material).
14. [CreateCylinderScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateCylinderScreen.js): Formulario técnico de cilindros (camisa, vástago, carrera, sellos).
15. [OrdersScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/OrdersScreen.js): Listado de órdenes con filtros de estado y resumen de evidencias.
16. [CreateOrderScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/CreateOrderScreen.js): Formulario de orden con cliente, máquina, técnico, prioridad y evidencias iniciales.
17. [OrderDetailScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/OrderDetailScreen.js): Gestión completa de la orden, avance de estado, reasignación y modal de evidencias.
18. [NotificationsScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/NotificationsScreen.js): Centro de alertas operativas con marcado de lectura.
19. [ReportsScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/ReportsScreen.js): Tablero analítico con métricas consolidadas de órdenes, piezas y maquinaria.
20. [UsersScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/UsersScreen.js): Panel de administración de colaboradores y activación de cuentas.
21. [ProfileScreen.js](file:///c:/dev/EmpresaMaquinaria/src/screens/ProfileScreen.js): Datos del usuario, sincronización de credenciales y cierre de sesión seguro.

---

## 8. Estructura del Repositorio

```
EmpresaMaquinaria/
├── android/                         # Proyecto nativo Android
├── ios/                             # Proyecto nativo iOS
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
│   │   │   └── previewCompat.js     # Endpoints de compatibilidad para preview.html
│   │   └── server.js                # Servidor principal (puerto 3000)
│   ├── test-suite.js                # Pruebas automatizadas de integración
│   └── package.json
├── docs/
│   └── diagrams/                    # Modelos C4 en PlantUML (Nivel 1, 2 y 3)
├── src/                             # Código fuente móvil React Native
│   ├── api/                         # Cliente HTTP y llamadas a la API v2
│   ├── auth/                        # Contexto de sesión, persistencia y hooks
│   ├── components/                  # Componentes reutilizables y formularios
│   ├── constants/                   # colors.js (paleta oficial HydroTech)
│   ├── navigation/                  # AppNavigator.js con stack por roles
│   └── screens/                     # 21 pantallas de la aplicación
├── App.js                           # Punto de entrada envuelto en AuthProvider
├── preview.html                     # Visor web interactivo para pruebas rápidas
├── package.json                     # Configuración del frontend
└── README.md                        # Documentación técnica del proyecto
```

---

## 9. Guía de Instalación, Pruebas y Despliegue

### Requisitos
- Node.js versión 20 o superior.
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

# Ejecutar verificación de estilo y calidad de código (0 warnings)
npx eslint .
```

### 3. Credenciales de Prueba (HydroTech S.A.S.)
- **ID Empresa Prestadora:** `16818a8e-7f9f-4456-92b1-ba15aeb882e3` (o código `DEMO01` en el preview)

| Rol | Correo Electrónico | Contraseña |
|---|---|---|
| **Administrador** | `admin@demo.com` | `Admin123!` |
| **Supervisor** | `supervisor@demo.com` | `Supervisor123!` |
| **Técnico** | `tecnico@demo.com` | `Tecnico123!` |

### 4. Métodos para Probar la Interfaz
1. **Visor Web Interactivo (`preview.html`):** Mantén corriendo el backend y abre `preview.html` en el navegador para validar la interacción visual inmediata de todos los roles.
2. **Dispositivo Físico o Emulador Android:**
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   npx react-native run-android
   ```
