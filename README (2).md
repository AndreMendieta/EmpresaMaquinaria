# EmpresaMaquinaria

App móvil (React Native) para gestión de maquinaria por empresa: máquinas, repuestos (mangueras, racores, acoples, piezas metalmecánicas) y usuarios con roles (Administrador, Supervisor, Técnico).

Repositorio: `https://github.com/AndreMendieta/EmpresaMaquinaria`

---

## ✅ Estado actual

| Componente | Estado |
|---|---|
| React Native 0.86.2 (JavaScript, sin TypeScript) | ✅ |
| Android Studio + SDK + Pixel 7 (emulador) | ✅ |
| JDK 17 | ✅ |
| ADB | ✅ |
| Git + GitHub | ✅ |
| Metro Bundler | ✅ |
| App corriendo en el emulador | ✅ |
| Firebase conectado al proyecto Android (`google-services.json`, plugin Gradle) | ✅ (reservado para funciones futuras: notificaciones, etc.) |
| `@react-native-firebase/app` instalado | ✅ |
| Pantalla de Login (UI + lógica conectada al backend) | ✅ |
| Backend propio (Node.js + Express) | ✅ |
| Base de datos PostgreSQL (empresas, usuarios) | ✅ |
| Autenticación con `bcrypt` + `JWT` | ✅ |
| Validación empresa + usuario + contraseña | ✅ |
| Despliegue del backend (Render/Neon) | ⏳ pendiente |
| Persistencia de sesión (AsyncStorage) | ⏳ pendiente |
| Redirección según `rol` | ⏳ pendiente |

---

## 🗂️ Estructura del proyecto

```
EmpresaMaquinaria/
├── android/
├── ios/
├── backend/               # API Node.js + Express + PostgreSQL (proyecto aparte)
│   └── src/
│       ├── db/            # pool.js, schema.sql, seed.js
│       ├── routes/        # auth.routes.js
│       └── server.js
├── src/
│   ├── components/        # CustomInput.js, PrimaryButton.js
│   ├── screens/           # LoginScreen.js
│   ├── navigation/        # AppNavigator.js
│   ├── services/          # api.js, authService.js, firebase.js (reservado)
│   ├── constants/
│   └── utils/
├── App.js
└── package.json
```

---

## 🎯 Objetivo funcional (login)

```
App → LoginScreen (código empresa + correo + contraseña)
    → API REST (Express) → PostgreSQL (consulta empresas + usuarios)
    → bcrypt.compare() valida contraseña
    → JWT (empresaId + rol) devuelto a la app
    → Dashboard
```

**Regla clave:** cada empresa solo accede a sus propios datos (multi-tenant por `empresa_id`, reforzado en cada consulta SQL con `JOIN` y filtro por `codigo` de empresa).

**Por qué SQL y no Firestore:** el trabajo de grado exige explícitamente una base de datos relacional. PostgreSQL nos da: relaciones claras entre `empresas` y `usuarios` (llave foránea), restricciones de integridad (`UNIQUE`, `NOT NULL`), y consultas parametrizadas que evitan inyección SQL — todo documentable y evaluable como parte del trabajo.

---

## 🛠️ Entorno de desarrollo

- **SO:** Windows
- **Editor:** Visual Studio Code (con terminal integrada / PowerShell)
- **Node/npm:** gestionados vía terminal en la raíz del proyecto
- **Android SDK:** `C:\Users\Pc\AppData\Local\Android\Sdk`
- **Emulador:** Pixel 7, API 37.1 (AVD desde Android Studio)
- **Package name / applicationId:** `com.empresamaquinaria`

### Comandos básicos del día a día

```bash
# --- App móvil (raíz del proyecto) ---
npm install
npx react-native start          # dejar corriendo en su propia terminal
npx react-native run-android    # en otra terminal
adb devices                     # ver dispositivos/emuladores detectados

# --- Backend (dentro de la carpeta backend/) ---
cd backend
npm install
npm run migrate    # crea las tablas en PostgreSQL
npm run seed        # crea un usuario de prueba
npm run dev          # levanta la API en http://localhost:3000
```

### Backend — archivos clave

- `backend/.env` — variables de entorno (`DATABASE_URL`, `JWT_SECRET`). **Nunca se sube a GitHub.**
- `backend/src/db/schema.sql` — define las tablas `empresas` y `usuarios`.
- `backend/src/db/seed.js` — crea una empresa y usuario de prueba con contraseña hasheada.
- `backend/src/routes/auth.routes.js` — endpoints `POST /api/auth/login` y `GET /api/auth/me`.
- `src/services/api.js` (en la app) — apunta a `http://10.0.2.2:3000/api` en desarrollo local con el emulador de Android (o a la URL de Render en producción).

### Firebase — archivos clave (reservado para uso futuro)

- `android/app/google-services.json` — config del proyecto Firebase (descargado desde la consola).
- `android/build.gradle` — classpath del plugin:
  ```groovy
  classpath("com.google.gms:google-services:4.4.2")
  ```
- `android/app/build.gradle` — al final del archivo:
  ```groovy
  apply plugin: "com.google.gms.google-services"
  ```
- Paquete JS instalado: `@react-native-firebase/app`

> Nota: la consola de Firebase muestra ejemplos en sintaxis **Kotlin DSL** (`id("...")`, `build.gradle.kts`). Este proyecto usa la sintaxis clásica **Groovy** (`build.gradle`, `apply plugin: "..."`) — hay que traducir, no copiar literal.

---

## 🔧 Troubleshooting — problemas que ya resolvimos

### 1. "Could not connect to development server" en el emulador
- Confirmar que Metro esté corriendo (`npx react-native start`).
- Ejecutar `adb reverse tcp:8081 tcp:8081` para mapear el puerto del emulador al de Metro.

### 2. `react-native` no se reconoce como comando
- Causa: `node_modules\.bin` no existía (instalación de npm incompleta).
- Solución: `npm install` de nuevo para regenerar los scripts ejecutables.

### 3. `adb devices` no muestra el emulador / daemon no arranca
- `adb kill-server` + `adb start-server` para reiniciar el daemon.
- Si el puerto 5037 está ocupado por otra instancia de adb (ej. la de Android Studio), cerrar Android Studio por completo y verificar en el Administrador de Tareas que no quede ningún `adb.exe` colgado.
- Diagnóstico fino: `netstat -ano | findstr :5037` para ver qué proceso tiene el puerto.

### 4. Emulador en estado `authorizing` (no `device`)
- Esperar unos segundos; si no se resuelve, cerrar y reabrir el emulador desde Android Studio.

### 5. Error de Gradle con sintaxis Kotlin DSL en archivo Groovy
- Ej: `id("com.google.gms.google-services")` puesto directamente en `build.gradle` (Groovy) revienta el build.
- Solución: usar `apply plugin: "com.google.gms.google-services"` y el `classpath(...)` dentro de `buildscript { dependencies { ... } }`.

### 6. `SafeAreaView` como objeto vacío
- En RN 0.86, `SafeAreaView` ya no viene de `'react-native'` — hay que importarlo de `'react-native-safe-area-context'`.

### 7. "Element type is invalid... expected a string... got: object"
- Causa real en nuestro caso: **archivos `.js` vacíos en disco** (0 bytes), aunque el contenido se veía bien en el editor/chat. Se detecta con:
  ```bash
  type src\screens\LoginScreen.js
  ```
  Si no imprime nada, el archivo está vacío → hay que volver a pegar y **guardar** el contenido.
- Otras causas posibles: import/export mal emparejado (default vs named), o copias duplicadas de `react`/`react-native` (se descarta con `npm ls react-native` y `npm ls react`).

### 8. Timeout instalando el APK en el emulador
- `Connection timed out: connect` al hacer `installDebug`.
- Suele resolverse reiniciando el emulador (Android Studio → Device Manager → Stop → Play de nuevo) y confirmando `adb devices` antes de reintentar `npx react-native run-android`.

### 9. La app no conecta con el backend local desde el emulador
- Causa: usar `http://localhost:3000` desde la app — el emulador tiene su propio "localhost" que no es el de tu PC.
- Solución: usar `http://10.0.2.2:3000` en `src/services/api.js` (10.0.2.2 es el alias que Android Studio expone hacia el host).

### 10. Error `ECONNREFUSED` o de SSL al conectar el backend a PostgreSQL
- Causa típica: falta `DATABASE_URL` en `.env`, o el proveedor (Neon/Render) exige SSL.
- Solución: revisar que `.env` tenga la cadena completa copiada del proveedor, y que `ssl: { rejectUnauthorized: false }` esté activo en `backend/src/db/pool.js` (ya viene configurado así por defecto).

---

## 📋 Próximos pasos

1. Desplegar el backend en Render y la base de datos en Neon (ver `backend/README.md`).
2. Agregar persistencia de sesión en la app con `@react-native-async-storage/async-storage` (guardar el JWT).
3. Redirigir según `rol` (Administrador / Supervisor / Técnico) a un Dashboard.
4. Robustecer el login como en una app de producción real:
   - Manejo de errores de red/servidor con mensajes claros al usuario (ya iniciado en `LoginScreen.js`).
   - Loading state en el botón mientras se autentica (ya implementado, evita doble submit).
   - Validaciones de formulario (campos vacíos, formato de correo) antes de llamar a la API.
   - Flujo de creación de usuarios "bien hecho": quién puede crear usuarios (solo Admin), asignación de `empresa_id` y `rol` al crear, endpoint protegido con verificación de JWT y rol.
   - Opción de recuperación de contraseña (endpoint que genera un token temporal y lo envía por correo).
   - Cerrar sesión (logout) desde el Dashboard — en este esquema basta con borrar el token guardado localmente.
5. Usar `@react-native-firebase/app` más adelante para notificaciones push u otras funciones que no dependan de autenticación.
