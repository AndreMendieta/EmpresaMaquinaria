# Historial de modificaciones de HydroTech

## Introducción

HydroTech es una aplicación móvil para apoyar la gestión de maquinaria, repuestos hidráulicos y órdenes de servicio. El proyecto comenzó como una aplicación React Native y fue creciendo hasta convertirse en una plataforma cliente-servidor con una API en Node.js y una base de datos PostgreSQL. Este documento resume su evolución según el historial del repositorio, desde agosto hasta octubre de 2026.

## Evolución del programa

### 1. Inicio del proyecto: aplicación móvil y acceso

En agosto de 2026 se creó la base del proyecto React Native para Android y se organizaron sus archivos principales. Después se incorporó la primera pantalla de inicio de sesión y se preparó la integración inicial con los servicios de backend y Firebase.

### 2. Registro y primeras funciones de gestión

En septiembre se añadieron el registro de usuarios y las primeras mejoras visuales al inicio de sesión y al panel principal. La aplicación comenzó a incluir funciones para consultar maquinaria y administrar piezas, junto con una bandeja de notificaciones para los procesos de revisión y aprobación.

También se incorporaron rutas del backend y estructuras de base de datos para guardar esos datos. Se añadieron funciones de auditoría y de asistencia, además de pantallas para consultar máquinas, piezas y notificaciones.

### 3. Separación por empresas y control de acceso

El proyecto evolucionó a un modelo multiempresa. Se creó un esquema de PostgreSQL para separar empresas prestadoras, empresas clientes, usuarios, maquinaria, piezas y órdenes de servicio. Se agregaron identificadores y relaciones para que los datos de cada empresa se mantengan dentro de su ámbito.

Luego se desarrolló la API REST `/api/v2`, con autenticación mediante tokens JWT y controles de acceso por rol y empresa. Los roles principales son administrador, supervisor y técnico. La API aplica permisos a las operaciones y evita que un usuario consulte o modifique información de otra empresa sin autorización.

### 4. Módulos operativos y órdenes de trabajo

Se ampliaron las funciones para administrar empresas clientes y sus equipos, registrar piezas y revisar notificaciones. Las piezas contemplan distintos tipos de componentes, como mangueras, piezas de torno y cilindros.

Se implementó el ciclo de órdenes de trabajo: creación, asignación de técnicos, consulta del detalle, actualización de estados y registro del trabajo realizado. El módulo incluye prioridades, vínculos con clientes y maquinaria, y notificaciones asociadas a cambios relevantes.

### 5. Cuenta, verificación y recuperación

En octubre se agregaron flujos para verificar el correo electrónico y recuperar o restablecer la contraseña. Se crearon las pantallas correspondientes y se integró el envío de correos desde el backend. También se mejoraron el inicio de sesión y el registro para trabajar con el código de empresa.

### 6. Archivos, fotos e informes

Se añadió la carga y consulta de archivos, con soporte para adjuntos de piezas y órdenes, como fotografías, planos y evidencias del trabajo. También se incorporaron opciones para editar piezas y datos de empresas.

El perfil permite actualizar la foto del usuario y, para el administrador, el logo de la empresa. Se mejoraron los detalles técnicos de las piezas y se rediseñó la generación de informes PDF para incluir la identidad de la empresa.

### 7. Despliegue, rendimiento y seguridad

Se configuró la aplicación móvil para comunicarse con el backend publicado en Render mediante HTTPS. Se ajustaron los tiempos de espera de la API y del envío de correo para manejar conexiones lentas y el arranque en frío del servicio. El despliegue ejecuta las migraciones de base de datos al iniciar el backend.

También se actualizaron dependencias del backend para corregir vulnerabilidades detectadas por `npm audit`. Las pruebas automatizadas se ejecutan mediante GitHub Actions; se agregó control de concurrencia para evitar que dos ejecuciones simultáneas interfieran con la base de datos de pruebas.

### 8. Interfaz visual y limpieza

Se realizaron varias mejoras en la navegación, los iconos y la presentación de los formularios y módulos. En octubre se adoptó un estilo industrial con tonos grafito y acero, acentos naranjas, tarjetas y controles más sobrios, tanto en la aplicación móvil como en el visor web de prueba.

Como parte del mantenimiento, se quitaron funciones e importaciones del frontend que no tenían uso y se revisaron los archivos, recursos y dependencias del proyecto. Se conservaron las rutas antiguas del backend porque aún forman parte de las pruebas y del arranque existente.

### 9. Pruebas y compilación Android

El proyecto incorporó pruebas automatizadas para la aplicación y el backend, además de documentación para ejecutarlas. Se generó un APK de Android para instalar y probar la aplicación en un dispositivo. Las pruebas y la compilación se ejecutan localmente o mediante las herramientas configuradas en el repositorio.

### 10. Pruebas de usabilidad

Además de verificar que las funciones respondan correctamente, se documentaron recorridos manuales para probar la aplicación desde la perspectiva de sus usuarios. Estos recorridos pueden realizarse en el visor web y en un dispositivo Android, con cuentas de distintos roles.

| Usuario o perfil | Tarea de usabilidad | Aspectos que se deben observar |
|---|---|---|
| Administrador | Registrarse, verificar el correo e iniciar sesión con el código de empresa | Claridad de las instrucciones, facilidad para encontrar los campos y comprensión de los mensajes |
| Administrador o supervisor | Crear una máquina y registrar una pieza | Facilidad para localizar los módulos, completar los formularios y entender el resultado al guardar |
| Supervisor | Revisar, aprobar o rechazar una pieza | Visibilidad del estado y claridad de las acciones disponibles |
| Técnico | Consultar maquinaria, atender una orden y adjuntar evidencias | Facilidad de uso en móvil, comprensión de la información y sencillez para completar la tarea |
| Administrador | Consultar reportes y actualizar el perfil o el logo de la empresa | Facilidad para encontrar estas opciones y confirmar que los cambios se guardaron |

Durante estas pruebas se recomienda anotar si la persona completa cada tarea sin ayuda, en qué paso duda o se equivoca, qué mensajes no entiende y cuánto tarda. También se deben revisar la legibilidad en pantalla pequeña, el tamaño de los controles y la claridad de las confirmaciones y errores.

**Alcance de la evidencia:** el repositorio contiene estos casos de prueba manuales y pruebas automatizadas funcionales. No registra resultados de sesiones formales con usuarios —por ejemplo, participantes, tiempos, tasas de éxito o encuestas—, por lo que no se afirma que esas mediciones se hayan realizado. Para completar una evaluación de usabilidad, deben ejecutarse los recorridos con usuarios representativos y registrar sus observaciones.

## Estado resumido

Al cierre del historial revisado, HydroTech cuenta con una aplicación móvil Android, un backend Node.js/Express, una base de datos PostgreSQL multiempresa, autenticación y permisos por rol, módulos de maquinaria, piezas, clientes y órdenes, carga de archivos, informes PDF, recuperación de cuenta, un visor web y pruebas automatizadas.

El desarrollo continúa sujeto a validación en dispositivos y al despliegue de los cambios en el servicio remoto. La generación de un APK permite probar una compilación, pero no equivale por sí sola a publicar la aplicación en Google Play.
