# HydroTech — Plataforma de Gestión de Maquinaria

Aplicación móvil desarrollada en React Native y backend en Node.js con base de datos relacional PostgreSQL, orientada a la administración de maquinaria industrial, repuestos hidráulicos (mangueras, racores, acoples, piezas metalmecánicas) y control de personal bajo un esquema multi-empresa (*multi-tenant*).

Repositorio: https://github.com/AndreMendieta/EmpresaMaquinaria

---

## 1. Arquitectura del Sistema

El sistema implementa una arquitectura desacoplada basada en servicios REST y una base de datos relacional estricta:

- **Frontend Móvil:** React Native 0.86.2 (JavaScript estándar), `react-native-safe-area-context`.
- **Backend API:** Node.js, Express, `pg` (PostgreSQL Client), `bcryptjs`, `jsonwebtoken` (JWT), `cors`, `dotenv`.
- **Base de Datos:** PostgreSQL con restricciones de integridad referencial (`FOREIGN KEY ... ON DELETE CASCADE`), claves únicas compuestas (`UNIQUE (empresa_id, email)`) y restricciones de verificación de roles (`CHECK`).
- **Visor Web de Pruebas:** Simulador web interactivo (`preview.html`) para validación rápida de interfaces y flujos sin necesidad de emulador móvil.

### Justificación de Base de Datos Relacional (PostgreSQL)
El proyecto requiere una estructura de datos relacional por exigencia técnica y académica:
- **Aislamiento Multi-inquilino:** Separación estricta por `empresa_id` con validación en cada consulta SQL mediante sentencias parametrizadas (`$1`, `$2`), previniendo inyección SQL.
- **Integridad de Datos:** Garantía ACID en operaciones críticas mediante transacciones atómicas (`BEGIN ... COMMIT / ROLLBACK`), como el registro conjunto de una empresa y su administrador inicial.

---

## 2. Roles del Sistema y Permisos

La plataforma gestiona tres roles definidos mediante restricción a nivel de base de datos (`CHECK (rol IN ('admin', 'supervisor', 'tecnico'))`):

| Rol | Alcance y Permisos |
|---|---|
| **Administrador (`admin`)** | Control total de la empresa. Puede registrar la organización, dar de alta nuevos usuarios con cualquier rol (`admin`, `supervisor`, `tecnico`), listar al personal y modificar el estado de cuentas (activar/desactivar). |
| **Supervisor (`supervisor`)** | Monitoreo de maquinaria y asignación operativa. Acceso a la visualización del personal de su empresa sin privilegios de creación o desactivación de cuentas. |
| **Técnico (`tecnico`)** | Personal operativo en campo. Registro de órdenes de mantenimiento, inspección de circuitos hidráulicos y solicitud de repuestos. Asignado por defecto en el auto-registro. |

---

## 3. Flujos de Autenticación y Registro

El módulo de autenticación implementa tres flujos según el caso de uso del usuario:

1. **Registro de Nueva Empresa (`POST /api/auth/register-company`):**
   - Registro público para dar de alta una nueva organización (`codigo`, `nombre`).
   - Crea en una sola transacción atómica al usuario inicial con rol `admin`.
   - Devuelve el token JWT y el perfil de la empresa y usuario.

2. **Auto-registro de Técnico (`POST /api/auth/register-user`):**
   - Un usuario se une a una empresa existente utilizando el código único de la misma.
   - El sistema valida la existencia de la empresa y que el correo no esté duplicado internamente.
   - Asigna por defecto el rol `tecnico`.

3. **Gestión Administrativa de Usuarios (`POST /api/users`):**
   - Exclusivo para usuarios autenticados con rol `admin`.
   - Permite dar de alta personal interno seleccionando explícitamente el rol deseado (`admin`, `supervisor`, `tecnico`).

4. **Inicio de Sesión (`POST /api/auth/login`):**
   - Requiere código de empresa, correo electrónico y contraseña.
   - Valida la coincidencia de credenciales con `bcrypt.compare` y el estado activo del usuario.
   - Genera un token JWT con vigencia de 8 horas conteniendo `userId`, `empresaId` y `rol`.

---

## 4. Identidad Visual (Guía de Marca HydroTech)

La interfaz de usuario adopta el sistema de diseño del manual de marca de **HydroTech**, orientado a la estética industrial y técnica de ingeniería de fluidos:

- **Naranja HydroTech (`#FF6A00`):** Color primario de acción, botones destacados, acento en títulos y distinción de rol Administrador.
- **Naranja Secundario (`#C75300`):** Estados activos y pulsados.
- **Negro Base (`#0D0D0D`):** Fondo principal oscuro de alta densidad.
- **Superficie 1 (`#161616`):** Contenedores principales, tarjetas y modales.
- **Superficie 2 (`#1E1E1E`):** Entradas de texto (*inputs*) y pestañas de selección.
- **Plata Técnica (`#C0C0C0`):** Marcadores visuales de ingeniería (*eyebrow bars*) y etiquetas técnicas.
- **Borde de Precisión (`rgba(192, 192, 192, 0.16)` / `#262626`):** Líneas divisorias de contraste fino.
- **Tipografía:** Texto principal en `#F3F2EF` (*ink*) y secundario en `#A9A9A6` (*ink-muted*).

---

## 5. Estructura del Repositorio

```
EmpresaMaquinaria/
├── android/                   # Proyecto nativo Android (Gradle, SDK)
├── ios/                       # Proyecto nativo iOS (CocoaPods)
├── backend/                   # API REST en Node.js + Express
│   ├── src/
│   │   ├── db/                # pool.js (conexión pg), schema.sql, seed.js
│   │   ├── middlewares/       # auth.middleware.js (verifyToken, requireRoles)
│   │   ├── routes/            # auth.routes.js, user.routes.js
│   │   └── server.js          # Punto de entrada del servidor Express
│   ├── test-suite.js          # Suite de pruebas automatizadas de integración
│   ├── package.json
│   └── .env                   # Variables de entorno (DATABASE_URL, JWT_SECRET)
├── src/                       # Código fuente de la app React Native
│   ├── components/            # CustomInput.js, PrimaryButton.js
│   ├── constants/             # colors.js (tokens oficiales HydroTech)
│   ├── navigation/            # AppNavigator.js (enrutamiento y control de sesión)
│   ├── screens/               # LoginScreen.js, RegisterScreen.js, DashboardScreen.js
│   ├── services/              # api.js, authService.js, userService.js
│   └── utils/
├── App.js                     # Componente raíz
├── preview.html               # Visor interactivo web para pruebas en navegador
└── package.json               # Dependencias de la app móvil
```

---

## 6. Guía de Instalación y Ejecución

### Requisitos Previos
- Node.js versión 20 o superior.
- PostgreSQL local o proveedor en la nube (Neon, Render, Supabase).
- Entorno Android configurado (Android Studio, JDK 17, Android SDK) si se compila la versión móvil nativa.

### Configuración del Backend

1. Acceder al directorio `backend`:
   ```bash
   cd backend
   npm install
   ```

2. Configurar el archivo `.env` tomando como base `.env.example`:
   ```env
   DATABASE_URL=postgresql://usuario:password@host:5432/nombre_bd
   JWT_SECRET=clave_secreta_para_firmar_tokens
   PORT=3000
   ```

3. Aplicar el esquema de base de datos:
   ```bash
   npm run migrate
   ```

4. Poblar datos iniciales de prueba:
   ```bash
   npm run seed
   ```

5. Iniciar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```
   El servidor responderá en `http://localhost:3000`.

6. Ejecutar la suite de pruebas automatizadas:
   ```bash
   npm test
   ```
   Verifica los 8 casos de integración: registro de empresa, auto-registro, inicio de sesión, creación de usuario por admin, listado, restricción por roles (403 Forbidden), desactivación y bloqueo de usuarios inactivos.

---

### Cuentas Iniciales para Pruebas (Empresa DEMO01)

| Rol | Empresa | Correo Electrónico | Contraseña |
|---|---|---|---|
| **Admin** | `DEMO01` | `admin@demo.com` | `Admin123!` |
| **Supervisor** | `DEMO01` | `supervisor@demo.com` | `Supervisor123!` |
| **Técnico** | `DEMO01` | `tecnico@demo.com` | `Tecnico123!` |

---

### Opciones de Visualización y Pruebas

#### Opción A: Visor Web Interactivo (Sin emulador)
Para validar la interfaz y los flujos inmediatamente sin consumir recursos en emulación:
1. Asegurarse de que el backend esté corriendo (`npm run dev` en `backend/`).
2. Abrir el archivo `preview.html` en cualquier navegador (Chrome, Edge, Firefox).
3. Utilizar los accesos directos laterales para iniciar sesión con un solo clic o probar el formulario de registro.

#### Opción B: Dispositivo Android Físico (USB)
1. Conectar el dispositivo con depuración USB habilitada.
2. Verificar la conexión con `adb devices`.
3. Redireccionar puertos de red:
   ```bash
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   ```
4. Ejecutar:
   ```bash
   npx react-native run-android
   ```

#### Opción C: Emulador de Android Studio
1. Iniciar Metro Bundler en una terminal:
   ```bash
   npx react-native start
   ```
2. En otra terminal, compilar y desplegar en el emulador:
   ```bash
   npx react-native run-android
   ```

---

## 7. Notas Técnicas y Resolución de Problemas

- **Conexión al backend desde el emulador Android:** En el emulador, la dirección `localhost` apunta al entorno virtual interno del teléfono. Para comunicar el emulador con el host local se debe utilizar `http://10.0.2.2:3000` (ya configurado en `src/services/api.js`).
- **Conexión SSL en PostgreSQL:** En entornos de nube (Neon/Render), el controlador de conexión en `backend/src/db/pool.js` tiene habilitado `ssl: { rejectUnauthorized: false }`.
- **Compatibilidad de SafeAreaView:** En React Native 0.86, el componente `SafeAreaView` se gestiona a través de la librería `react-native-safe-area-context` para evitar inconsistencias en dispositivos modernos.
