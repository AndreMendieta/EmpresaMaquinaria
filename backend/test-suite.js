require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const pool = require('./src/db/pool');
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

async function runTests() {
  const server = http.createServer(app);
  const PORT = 3001;
  await new Promise((resolve) => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}/api`;

  const request = async (path, opts = {}) => {
    const { headers = {}, ...restOpts } = opts;
    const res = await fetch(`${baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      ...restOpts,
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  };

  const TEST_COMPANY_CODE = 'TEST_REG_01';

  try {
    console.log('--- Iniciando suite de pruebas de autenticación y roles ---');

    // 0. Limpieza previa si existía
    await pool.query('DELETE FROM empresas WHERE codigo = $1', [TEST_COMPANY_CODE]);

    // Test 1: Registro de Empresa + Admin
    console.log('1. Probando POST /auth/register-company...');
    const regCompanyRes = await request('/auth/register-company', {
      method: 'POST',
      body: JSON.stringify({
        companyCode: TEST_COMPANY_CODE,
        companyName: 'Maquinaria de Prueba S.A.S.',
        userName: 'Admin Prueba',
        email: 'admin@prueba.com',
        password: 'Password123!',
      }),
    });

    if (regCompanyRes.status !== 201 || !regCompanyRes.body.token || regCompanyRes.body.usuario?.rol !== 'admin') {
      throw new Error(`Fallo en Test 1: ${JSON.stringify(regCompanyRes)}`);
    }
    const adminToken = regCompanyRes.body.token;
    console.log('   ✅ Empresa y Administrador creados con éxito. Rol: admin');

    // Test 2: Auto-registro de Colaborador (Técnico)
    console.log('2. Probando POST /auth/register-user (Auto-registro de Técnico)...');
    const regUserRes = await request('/auth/register-user', {
      method: 'POST',
      body: JSON.stringify({
        companyCode: TEST_COMPANY_CODE,
        userName: 'Técnico Prueba',
        email: 'tecnico@prueba.com',
        password: 'Password123!',
      }),
    });

    if (regUserRes.status !== 201 || !regUserRes.body.token || regUserRes.body.usuario?.rol !== 'tecnico') {
      throw new Error(`Fallo en Test 2: ${JSON.stringify(regUserRes)}`);
    }
    const tecnicoToken = regUserRes.body.token;
    const tecnicoId = regUserRes.body.usuario.id;
    console.log('   ✅ Colaborador registrado con éxito. Rol asignado por defecto: tecnico');

    // Test 3: Iniciar Sesión con el Administrador
    console.log('3. Probando POST /auth/login...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        companyCode: TEST_COMPANY_CODE,
        email: 'admin@prueba.com',
        password: 'Password123!',
      }),
    });

    if (loginRes.status !== 200 || !loginRes.body.token || loginRes.body.usuario?.rol !== 'admin') {
      throw new Error(`Fallo en Test 3: ${JSON.stringify(loginRes)}`);
    }
    console.log('   ✅ Login exitoso para Administrador');

    // Test 4: Creación de usuario por parte del Administrador (Crear Supervisor)
    console.log('4. Probando POST /users (Admin crea un Supervisor)...');
    const createSupervisorRes = await request('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        nombre: 'Supervisor Prueba',
        email: 'supervisor@prueba.com',
        password: 'Password123!',
        rol: 'supervisor',
      }),
    });

    if (createSupervisorRes.status !== 201 || createSupervisorRes.body.usuario?.rol !== 'supervisor') {
      throw new Error(`Fallo en Test 4: ${JSON.stringify(createSupervisorRes)}`);
    }
    console.log('   ✅ Supervisor creado por el Administrador con rol "supervisor"');

    // Test 5: Listar usuarios de la empresa
    console.log('5. Probando GET /users (Listar usuarios de la empresa)...');
    const listRes = await request('/users', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (listRes.status !== 200 || !Array.isArray(listRes.body.usuarios) || listRes.body.usuarios.length !== 3) {
      throw new Error(`Fallo en Test 5: Se esperaban 3 usuarios, se obtuvieron: ${JSON.stringify(listRes.body)}`);
    }
    console.log(`   ✅ Lista de usuarios correcta (${listRes.body.usuarios.length} miembros encontrados)`);

    // Test 6: Control de acceso (Técnico intentando crear usuarios)
    console.log('6. Probando restricción de rol (Técnico intentando crear un usuario)...');
    const unauthorizedRes = await request('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tecnicoToken}` },
      body: JSON.stringify({
        nombre: 'Infiltrado',
        email: 'infiltrado@prueba.com',
        password: 'Password123!',
        rol: 'admin',
      }),
    });

    if (unauthorizedRes.status !== 403) {
      throw new Error(`Fallo en Test 6: Se esperaba código 403, se obtuvo: ${unauthorizedRes.status}`);
    }
    console.log('   ✅ Bloqueo de seguridad correcto: 403 Forbidden para rol técnico');

    // Test 7: Actualización de usuario (Admin desactiva cuenta)
    console.log('7. Probando PATCH /users/:id (Admin desactiva cuenta de técnico)...');
    const patchRes = await request(`/users/${tecnicoId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ activo: false }),
    });

    if (patchRes.status !== 200 || patchRes.body.usuario?.activo !== false) {
      throw new Error(`Fallo en Test 7: ${JSON.stringify(patchRes)}`);
    }
    console.log('   ✅ Estado de usuario actualizado a inactivo');

    // Test 8: Login con usuario inactivo bloqueado
    console.log('8. Probando login con usuario inactivo...');
    const loginInactiveRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        companyCode: TEST_COMPANY_CODE,
        email: 'tecnico@prueba.com',
        password: 'Password123!',
      }),
    });

    if (loginInactiveRes.status !== 403) {
      throw new Error(`Fallo en Test 8: Se esperaba 403, se obtuvo: ${loginInactiveRes.status}`);
    }
    console.log('   ✅ Login denegado correctamente para usuario inactivo (403)');

    // Limpieza de datos de prueba
    await pool.query('DELETE FROM empresas WHERE codigo = $1', [TEST_COMPANY_CODE]);
    console.log('   ✅ Datos de prueba limpiados exitosamente');

    console.log('\n========================================');
    console.log('🎉 TODOS LOS TESTS (1 al 8) PASARON EXITOSAMENTE 🎉');
    console.log('========================================');
  } catch (err) {
    console.error('❌ Error en las pruebas:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runTests();
