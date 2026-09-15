require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const pool = require('./src/db/pool');
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const maquinasRoutes = require('./src/routes/maquinas.routes');
const piezasRoutes = require('./src/routes/piezas.routes');
const notificacionesRoutes = require('./src/routes/notificaciones.routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/maquinas', maquinasRoutes);
app.use('/api/piezas', piezasRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

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
    console.log('--- Iniciando suite de pruebas de autenticación, roles, HU-014 y HU-015 ---');

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
    console.log('   ✅ Colaborador registrado con éxito. Rol asignado por defecto: tecnico');

    // Test 3: Admin crea un Supervisor
    console.log('3. Probando POST /users (Admin crea un Supervisor)...');
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
      throw new Error(`Fallo en Test 3: ${JSON.stringify(createSupervisorRes)}`);
    }
    console.log('   ✅ Supervisor creado por el Administrador');

    // Login del supervisor para obtener su token
    const supLoginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        companyCode: TEST_COMPANY_CODE,
        email: 'supervisor@prueba.com',
        password: 'Password123!',
      }),
    });
    const supervisorToken = supLoginRes.body.token;

    // Test 4: HU-015 Supervisor registra maquinaria
    console.log('4. Probando POST /maquinas (HU-015 - Supervisor registra maquinaria)...');
    const maqRes = await request('/maquinas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({
        codigo: 'CAT-320',
        nombre: 'Excavadora Hidráulica CAT 320D',
        tipo: 'Excavadora',
        manualUrl: 'https://manuales.hydrotech.com/cat-320.pdf',
        descripcion: 'Sistema hidráulico de 350 bar',
      }),
    });

    if (maqRes.status !== 201 || !maqRes.body.maquina?.id) {
      throw new Error(`Fallo en Test 4: ${JSON.stringify(maqRes)}`);
    }
    const maquinaId = maqRes.body.maquina.id;
    console.log(`   ✅ Maquinaria registrada con éxito (ID: ${maquinaId})`);

    // Test 5: HU-015 Criterio 2: Máquina duplicada emite advertencia
    console.log('5. Probando POST /maquinas (HU-015 Criterio 2 - Detección de duplicado por nombre)...');
    const dupMaqRes = await request('/maquinas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({
        codigo: 'CAT-320-OTRA',
        nombre: 'Excavadora Hidráulica CAT 320D',
        tipo: 'Excavadora',
      }),
    });

    if (dupMaqRes.status !== 409 || !dupMaqRes.body.advertenciaDuplicado) {
      throw new Error(`Fallo en Test 5: Se esperaba 409 con advertenciaDuplicado, obtenido: ${JSON.stringify(dupMaqRes)}`);
    }
    console.log('   ✅ Detección de nombre duplicado funciona correctamente (409)');

    // Test 6: Restricción de seguridad: Técnico no puede registrar maquinaria
    console.log('6. Probando restricción de rol (Técnico intenta registrar maquinaria)...');
    const tecMaqRes = await request('/maquinas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tecnicoToken}` },
      body: JSON.stringify({
        codigo: 'MAQ-PROHIBIDA',
        nombre: 'Máquina Prohibida',
        tipo: 'Torno',
      }),
    });

    if (tecMaqRes.status !== 403) {
      throw new Error(`Fallo en Test 6: Se esperaba 403 Forbidden, obtenido: ${tecMaqRes.status}`);
    }
    console.log('   ✅ Seguridad correcta: Técnico no puede crear maquinaria (403)');

    // Test 7: HU-014 Técnico busca y consulta la máquina registrada
    console.log('7. Probando GET /maquinas (HU-014 - Técnico busca y consulta la máquina)...');
    const searchMaqRes = await request('/maquinas?query=Excavadora', {
      method: 'GET',
      headers: { Authorization: `Bearer ${tecnicoToken}` },
    });

    if (searchMaqRes.status !== 200 || searchMaqRes.body.maquinas.length === 0) {
      throw new Error(`Fallo en Test 7: ${JSON.stringify(searchMaqRes)}`);
    }
    console.log(`   ✅ Técnico encontró la máquina: [${searchMaqRes.body.maquinas[0].codigo}] ${searchMaqRes.body.maquinas[0].nombre}`);

    // Test 8: HU-014 Técnico registra ficha de pieza con medidas y fotos
    console.log('8. Probando POST /piezas (HU-014 - Técnico registra pieza sobre máquina)...');
    const piezaRes = await request('/piezas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tecnicoToken}` },
      body: JSON.stringify({
        maquinaId,
        codigo: 'MANG-4SP-01',
        nombre: 'Manguera Hidráulica 4 Mallas 3/4"',
        tipo: 'Manguera',
        medidas: {
          longitud: '120 cm',
          diametro_int: '3/4 pulg',
          presion_psi: '5000 PSI',
          rosca: 'JIC 1-1/16-12',
        },
        descripcion: 'Línea de retorno para cilindro de pluma',
        fotos: ['https://evidencias.hydrotech.com/foto1.jpg'],
      }),
    });

    if (piezaRes.status !== 201 || !piezaRes.body.pieza?.id) {
      throw new Error(`Fallo en Test 8: ${JSON.stringify(piezaRes)}`);
    }
    const piezaId = piezaRes.body.pieza.id;
    console.log(`   ✅ Ficha de pieza registrada con éxito (ID: ${piezaId}, Estado: ${piezaRes.body.pieza.estado_validacion})`);

    // Test 9: Notificación automática al supervisor
    console.log('9. Probando GET /notificaciones (Supervisor revisa alerta de pieza nueva)...');
    const notifRes = await request('/notificaciones', {
      method: 'GET',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    if (notifRes.status !== 200 || notifRes.body.notificaciones.length === 0) {
      throw new Error(`Fallo en Test 9: Se esperaba al menos 1 notificación, obtenido: ${JSON.stringify(notifRes)}`);
    }
    console.log(`   ✅ Notificación recibida por Supervisor: "${notifRes.body.notificaciones[0].mensaje}"`);

    // Test 10: Supervisor valida la pieza técnica
    console.log('10. Probando PATCH /piezas/:id/validar (Supervisor aprueba y valida la pieza)...');
    const validarRes = await request(`/piezas/${piezaId}/validar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${supervisorToken}` },
      body: JSON.stringify({ estado: 'validada' }),
    });

    if (validarRes.status !== 200 || validarRes.body.pieza?.estado_validacion !== 'validada') {
      throw new Error(`Fallo en Test 10: ${JSON.stringify(validarRes)}`);
    }
    console.log('   ✅ Pieza validada y aprobada por el Supervisor');

    // Test 11: HU-014 Criterio 3: Intento de registro duplicado de pieza es bloqueado
    console.log('11. Probando POST /piezas (HU-014 Criterio 3 - Bloqueo de pieza duplicada)...');
    const dupPiezaRes = await request('/piezas', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tecnicoToken}` },
      body: JSON.stringify({
        maquinaId,
        codigo: 'MANG-4SP-01',
        nombre: 'Manguera Hidráulica Duplicada',
        tipo: 'Manguera',
      }),
    });

    if (dupPiezaRes.status !== 409 || !dupPiezaRes.body.piezaExistenteId) {
      throw new Error(`Fallo en Test 11: Se esperaba 409 con piezaExistenteId, obtenido: ${JSON.stringify(dupPiezaRes)}`);
    }
    console.log(`   ✅ Bloqueo de pieza duplicada exitoso: remite a la ficha existente ID ${dupPiezaRes.body.piezaExistenteId}`);

    // Test 12: Consulta de ficha completa de la pieza
    console.log('12. Probando GET /piezas/:id (Consulta de ficha completa)...');
    const getPiezaRes = await request(`/piezas/${piezaId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tecnicoToken}` },
    });

    if (getPiezaRes.status !== 200 || getPiezaRes.body.pieza?.codigo !== 'MANG-4SP-01') {
      throw new Error(`Fallo en Test 12: ${JSON.stringify(getPiezaRes)}`);
    }
    console.log('   ✅ Ficha técnica completa consultada con éxito');

    // Limpieza de datos de prueba
    await pool.query('DELETE FROM empresas WHERE codigo = $1', [TEST_COMPANY_CODE]);
    console.log('   ✅ Datos de prueba limpiados exitosamente');

    console.log('\n======================================================');
    console.log('🎉 TODOS LOS TESTS (1 al 12) PASARON EXITOSAMENTE 🎉');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Error en las pruebas:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    await pool.end();
  }
}

runTests();
