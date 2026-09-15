# HydroTech — Plataforma de Gestión de Maquinaria

Aplicación móvil desarrollada en React Native y backend en Node.js con base de datos relacional PostgreSQL, orientada a la administración de maquinaria industrial, repuestos hidráulicos (mangueras, racores, acoples, piezas metalmecánicas) y control operativo bajo un esquema multi-empresa (*multi-tenant*).

Repositorio: https://github.com/AndreMendieta/EmpresaMaquinaria

---

## 1. Arquitectura del Sistema

El sistema implementa una arquitectura desacoplada basada en servicios REST y una base de datos relacional con integridad estricta:

- **Frontend Móvil:** React Native 0.86.2 (JavaScript estándar), `react-native-safe-area-context`.
- **Backend API:** Node.js, Express, `pg` (PostgreSQL Client), `bcryptjs`, `jsonwebtoken` (JWT), `cors`, `dotenv`.
- **Base de Datos:** PostgreSQL con restricciones de integridad referencial (`FOREIGN KEY ... ON DELETE CASCADE`), claves únicas compuestas (`UNIQUE (empresa_id, codigo)`, `UNIQUE (maquina_id, codigo)`) y restricciones de verificación de estado y roles (`CHECK`).
- **Visor Web de Pruebas:** Simulador web interactivo (`preview.html`) para validación rápida de interfaces y flujos de usuario sin necesidad de emulador móvil.

### Justificación de Base de Datos Relacional (PostgreSQL)
El proyecto requiere una estructura de datos relacional por exigencia técnica y de negocio:
- **Aislamiento Multi-inquilino:** Separación estricta por `empresa_id` con validación en cada consulta SQL mediante sentencias parametrizadas (`$1`, `$2`), previniendo inyección SQL.
- **Integridad de Datos:** Garantía ACID en operaciones críticas mediante transacciones atómicas (`BEGIN ... COMMIT / ROLLBACK`), como el alta conjunta de una empresa y su administrador inicial.
- **Trazabilidad y Relaciones Técnicas:** Vínculos de llave foránea entre empresas, colaboradores, maquinaria autorizada, fichas de piezas y notificaciones de supervisión.

---

## 2. Roles del Sistema y Permisos

La plataforma gestiona tres roles definidos mediante restricción a nivel de base de datos (`CHECK (rol IN ('admin', 'supervisor', 'tecnico'))`):

| Rol | Alcance y Permisos |
|---|---|
| **Administrador (`admin`)** | Control total de la empresa. Da de alta nuevos usuarios con cualquier rol (`admin`, `supervisor`, `tecnico`), activa/desactiva colaboradores, registra maquinaria y puede supervisar y validar piezas. |
| **Supervisor (`supervisor`)** | Gestión de flota y control de calidad. Registra maquinaria autorizada, enlaza manuales técnicos de fabricante, revisa la bandeja de notificaciones operativas y valida/aprueba fichas de piezas registradas por técnicos. Visualiza el personal sin permisos de creación de cuentas. |
| **Técnico (`tecnico`)** | Operador en campo. Consulta maquinaria autorizada (sin permisos de creación), accede a los manuales técnicos en línea como guía, busca fichas de piezas existentes para evitar duplicados y registra nuevas piezas con medidas técnicas y fotos. Cada nueva pieza notifica automáticamente al supervisor. |

---

## 3. Módulos Funcionales e Historias de Usuario

### HU-014: Registro y Consulta de Piezas con Guía Técnica (Técnico)
Orientado a optimizar el trabajo del operador en campo y prevenir registros duplicados o incorrectos:

1. **Búsqueda de Maquinaria Autorizada (Solo Consulta):**
   - El técnico busca por nombre o código el equipo con el que va a interactuar.
   - Si la máquina no está en el sistema, la creación está bloqueada (`403 Forbidden` a nivel de API) y la interfaz presenta un aviso indicando que debe solicitar el alta previa al supervisor.
2. **Guía Técnica y Manual en Línea:**
   - La ficha del equipo seleccionado incluye acceso directo al manual técnico oficial del fabricante mediante enlace web.
3. **Búsqueda y Consulta de Piezas Existentes:**
   - El técnico busca si la pieza requerida ya fue documentada en esa máquina.
   - Al encontrarla, accede a la ficha técnica completa (medidas, fotografías, estado de validación) sin duplicar trabajo.
   - Si el técnico intenta registrar un código existente en la misma máquina, el sistema bloquea el duplicado (`409 Conflict`) y redirige a la ficha técnica original.
4. **Registro de Nueva Pieza Técnica:**
   - Si la pieza no existe, registra su código, nombre, tipo (`Manguera`, `Racor`, `Acople`, `Válvula`), medidas técnicas estructuradas (`longitud`, `diametro`, `presion_psi`, `rosca`), fotografías de evidencia y observaciones.
   - La pieza queda asociada a la máquina con estado `pendiente`.
5. **Alerta Automática al Supervisor:**
   - Al crearse la pieza, el sistema genera automáticamente una notificación en la bandeja de supervisión para su revisión.

### HU-015: Registro de Maquinaria y Supervisión (Supervisor)
Permite mantener el control de qué equipos existen en la empresa y garantizar la calidad técnica:

1. **Alta de Maquinaria:**
   - Registro de equipos con código interno, nombre descriptivo, tipo de máquina, URL del manual técnico del fabricante y especificaciones del circuito hidráulico.
2. **Detección de Duplicados:**
   - Si se intenta registrar un equipo con un nombre similar o idéntico al de otra máquina existente en la empresa, el backend retorna una advertencia (`409 Conflict`) solicitando confirmación explícita para evitar registros redundantes.
3. **Bandeja de Validación de Piezas:**
   - Monitoreo en tiempo real de las piezas dadas de alta por técnicos.
   - Acción directa para validar y certificar la pieza técnica (`PATCH /api/piezas/:id/validar`).

---

## 4. Endpoints de la API REST

### Autenticación y Cuentas (`/api/auth`)
- `POST /api/auth/register-company`: Registro de nueva empresa y su primer usuario Administrador.
- `POST /api/auth/register-user`: Auto-registro de técnicos asociados a una empresa existente por código.
- `POST /api/auth/login`: Autenticación multi-empresa. Retorna token JWT (vigencia 8 horas).

### Gestión de Personal (`/api/users` - Requiere JWT)
- `GET /api/users`: Lista colaboradores de la empresa (Admin y Supervisor).
- `POST /api/users`: Creación de colaborador con rol asignado (`admin`, `supervisor`, `tecnico`) — Solo Admin.
- `PATCH /api/users/:id`: Activar o desactivar cuenta — Solo Admin.

### Maquinaria (`/api/maquinas` - Requiere JWT)
- `GET /api/maquinas?query=...`: Listado de maquinaria con filtro de búsqueda por código o nombre (Todos los roles).
- `GET /api/maquinas/:id`: Detalle de máquina específica (Todos los roles).
- `POST /api/maquinas`: Registro de nuevo equipo con control de duplicados (Supervisor y Admin).

### Piezas Técnicas (`/api/piezas` - Requiere JWT)
- `GET /api/piezas?maquinaId=X&query=...`: Listado de componentes de una máquina específica (Todos los roles).
- `GET /api/piezas/:id`: Ficha técnica completa de componente con medidas y fotos (Todos los roles).
- `POST /api/piezas`: Registro de ficha técnica y emisión de alerta al supervisor (Todos los roles). Bloquea código duplicado en la misma máquina.
- `PATCH /api/piezas/:id/validar`: Aprobación y validación de pieza (Supervisor y Admin).

### Notificaciones de Supervisión (`/api/notificaciones` - Requiere JWT)
- `GET /api/notificaciones`: Bandeja de alertas de piezas pendientes de revisión (Supervisor y Admin).
- `PATCH /api/notificaciones/:id/leida`: Marcar notificación como revisada.

---

## 5. Esquema de Base de Datos

```sql
-- Empresas registradas
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Colaboradores
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('admin', 'supervisor', 'tecnico')),
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_empresa_email UNIQUE (empresa_id, email)
);

-- Maquinaria autorizada (HU-015)
CREATE TABLE maquinarias (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    manual_url TEXT,
    descripcion TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_maquina_codigo_empresa UNIQUE (empresa_id, codigo)
);

-- Componentes y piezas técnicas (HU-014)
CREATE TABLE piezas (
    id SERIAL PRIMARY KEY,
    maquina_id INTEGER NOT NULL REFERENCES maquinarias(id) ON DELETE CASCADE,
    creado_por_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    codigo VARCHAR(50) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    medidas JSONB DEFAULT '{}'::jsonb,
    descripcion TEXT,
    fotos TEXT[] DEFAULT '{}',
    estado_validacion VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_validacion IN ('pendiente', 'validada', 'rechazada')),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pieza_codigo_maquina UNIQUE (maquina_id, codigo)
);

-- Bandeja de alertas para supervisión
CREATE TABLE notificaciones_supervisor (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    maquina_id INTEGER REFERENCES maquinarias(id) ON DELETE CASCADE,
    pieza_id INTEGER REFERENCES piezas(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT false,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Identidad Visual (Guía de Marca HydroTech)

La interfaz de usuario implementa el manual de marca oficial de **HydroTech**, enfocado en ingeniería de fluidos, circuitos de alta presión y maquinaria pesada:

- **Naranja HydroTech (`#FF6A00`):** Color primario de acción, botones destacados, acento en títulos y distinción del rol Administrador.
- **Naranja Secundario (`#C75300`):** Estados pulsados e interacción activa.
- **Negro Base (`#0D0D0D`):** Fondo principal oscuro de alta densidad.
- **Superficie 1 (`#161616`):** Contenedores principales, tarjetas y modales técnicos.
- **Superficie 2 (`#1E1E1E`):** Entradas de texto (*inputs*) y pestañas de selección de rol/tipo.
- **Plata Técnica (`#C0C0C0`):** Marcadores visuales de ingeniería (*eyebrow bars*) y bordes de precisión.
- **Borde de Precisión (`rgba(192, 192, 192, 0.16)`):** Separación visual nítida en temas oscuros.
- **Tipografía:** Montserrat para encabezados y Roboto para cuerpos de datos técnicos.

---

## 7. Estructura del Repositorio

```
EmpresaMaquinaria/
├── android/                   # Proyecto nativo Android (Gradle, SDK)
├── ios/                       # Proyecto nativo iOS (CocoaPods)
├── backend/                   # API REST en Node.js + Express
│   ├── src/
│   │   ├── db/                # pool.js, schema.sql, seed.js
│   │   ├── middlewares/       # auth.middleware.js (verifyToken, requireRoles)
│   │   ├── routes/            # auth, user, maquinas, piezas, notificaciones
│   │   └── server.js          # Servidor Express
│   ├── test-suite.js          # Suite de pruebas automatizadas (12 casos de prueba)
│   ├── package.json
│   └── .env                   # Variables de entorno (DATABASE_URL, JWT_SECRET, PORT)
├── src/                       # Aplicación React Native
│   ├── components/            # CustomInput.js, PrimaryButton.js
│   ├── constants/             # colors.js (tokens oficiales HydroTech)
│   ├── navigation/            # AppNavigator.js
│   ├── screens/               # LoginScreen.js, RegisterScreen.js, DashboardScreen.js
│   ├── services/              # api.js, authService.js, userService.js, maquinaService.js, piezaService.js
│   └── utils/
├── App.js                     # Componente raíz
├── preview.html               # Simulador interactivo web para pruebas completas
└── package.json               # Dependencias del cliente móvil
```

---

## 8. Guía de Instalación y Pruebas

### Requisitos Previos
- Node.js versión 20 o superior.
- Instancia de PostgreSQL (local o nube: Neon, Render, Supabase).
- Navegador web moderno o Android Studio si se compila para móvil.

### Configuración del Backend

1. Instalar dependencias del backend:
   ```bash
   cd backend
   npm install
   ```

2. Configurar variables de entorno (`backend/.env`):
   ```env
   DATABASE_URL=postgresql://usuario:password@host:5432/nombre_bd
   JWT_SECRET=clave_secreta_jwt_hydrotech
   PORT=3000
   ```

3. Ejecutar migraciones del esquema:
   ```bash
   npm run migrate
   ```

4. Poblar datos iniciales de prueba (maquinaria, piezas y usuarios demo):
   ```bash
   npm run seed
   ```

5. Iniciar servidor:
   ```bash
   npm run dev
   ```
   Servidor activo en `http://localhost:3000`.

6. Ejecutar pruebas automatizadas:
   ```bash
   npm test
   ```
   Ejecuta los 12 casos de integración que cubren autenticación, roles, HU-014 (técnico, manuales, fichas, duplicados) y HU-015 (supervisor, validaciones, detección de nombres duplicados).

---

### Credenciales de Prueba (Empresa DEMO01)

| Rol | Empresa | Correo Electrónico | Contraseña |
|---|---|---|---|
| **Admin** | `DEMO01` | `admin@demo.com` | `Admin123!` |
| **Supervisor** | `DEMO01` | `supervisor@demo.com` | `Supervisor123!` |
| **Técnico** | `DEMO01` | `tecnico@demo.com` | `Tecnico123!` |

---

### Métodos de Ejecución de la Interfaz

#### 1. Visor Web Interactivo (`preview.html`) — Recomendado para Pruebas Inmediatas
Permite validar toda la experiencia sin consumo de recursos en emulador:
1. Mantener el backend corriendo (`npm run dev` en `backend/`).
2. Abrir `preview.html` en el navegador.
3. Utilizar los accesos directos laterales para ingresar como Técnico, Supervisor o Administrador.
4. Interactuar con los flujos de búsqueda de maquinaria, manual en línea, fichas de piezas, registro con medidas estructuradas y validación en bandeja de supervisión.

#### 2. Dispositivo Físico Android (USB)
1. Conectar dispositivo con depuración USB activa (`adb devices`).
2. Redireccionar puertos:
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   ```
3. Ejecutar:
   ```bash
   npx react-native run-android
   ```

#### 3. Emulador de Android Studio
1. Iniciar Metro Bundler: `npx react-native start`
2. En otra terminal: `npx react-native run-android`
