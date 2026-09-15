require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

/**
 * Crea una empresa demo, 3 usuarios de prueba con roles (admin, supervisor, tecnico),
 * maquinaria autorizada y piezas documentadas para pruebas de HU-014 y HU-015.
 *
 * Uso: node src/db/seed.js
 */
async function seed() {
  const codigoEmpresa = 'DEMO01';
  const nombreEmpresa = 'HydroTech S.A.S.';

  const usuariosDemo = [
    {
      nombre: 'Administrador Demo',
      email: 'admin@demo.com',
      password: 'Admin123!',
      rol: 'admin',
    },
    {
      nombre: 'Supervisor Demo',
      email: 'supervisor@demo.com',
      password: 'Supervisor123!',
      rol: 'supervisor',
    },
    {
      nombre: 'Técnico Demo',
      email: 'tecnico@demo.com',
      password: 'Tecnico123!',
      rol: 'tecnico',
    },
  ];

  try {
    // 1. Empresa
    const empresaResult = await pool.query(
      `INSERT INTO empresas (codigo, nombre)
       VALUES ($1, $2)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [codigoEmpresa, nombreEmpresa],
    );
    const empresaId = empresaResult.rows[0].id;

    console.log(`Empresa "${nombreEmpresa}" (${codigoEmpresa}) asegurada.`);

    // 2. Usuarios
    const userIds = {};
    for (const u of usuariosDemo) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      const userRes = await pool.query(
        `INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (empresa_id, email)
         DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol
         RETURNING id`,
        [empresaId, u.nombre, u.email, passwordHash, u.rol],
      );
      userIds[u.rol] = userRes.rows[0].id;
      console.log(`  - Rol: ${u.rol.toUpperCase().padEnd(11)} | Correo: ${u.email.padEnd(22)} | Clave: ${u.password}`);
    }

    // 3. Maquinaria de prueba (HU-015)
    const maquinasDemo = [
      {
        codigo: 'CAT-320D',
        nombre: 'Excavadora Hidráulica CAT 320D',
        tipo: 'Excavadora',
        manual_url: 'https://juliansgarciaa-source.github.io/hydrotech-brandbook/',
        descripcion: 'Excavadora para movimiento de tierras. Sistema hidráulico de alta presión 350 bar.',
      },
      {
        codigo: 'PRE-HID-50T',
        nombre: 'Prensa Hidráulica 50 Toneladas',
        tipo: 'Prensa',
        manual_url: 'https://juliansgarciaa-source.github.io/hydrotech-brandbook/',
        descripcion: 'Prensa de banco para ensamblado de mangueras y terminales prensados.',
      },
    ];

    const maquinaIds = {};
    for (const m of maquinasDemo) {
      const maqRes = await pool.query(
        `INSERT INTO maquinarias (empresa_id, codigo, nombre, tipo, manual_url, descripcion, creado_por)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (empresa_id, codigo)
         DO UPDATE SET nombre = EXCLUDED.nombre, manual_url = EXCLUDED.manual_url, descripcion = EXCLUDED.descripcion
         RETURNING id, codigo`,
        [empresaId, m.codigo, m.nombre, m.tipo, m.manual_url, m.descripcion, userIds.supervisor]
      );
      maquinaIds[m.codigo] = maqRes.rows[0].id;
      console.log(`  - Maquinaria lista: [${m.codigo}] ${m.nombre}`);
    }

    // 4. Pieza de prueba (HU-014)
    await pool.query(
      `INSERT INTO piezas (empresa_id, maquina_id, codigo, nombre, tipo, medidas, descripcion, estado_validacion, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'validada', $8)
       ON CONFLICT (maquina_id, codigo)
       DO UPDATE SET nombre = EXCLUDED.nombre, medidas = EXCLUDED.medidas
       RETURNING id`,
      [
        empresaId,
        maquinaIds['CAT-320D'],
        'MANG-4SP-01',
        'Manguera Hidráulica 4 Mallas 3/4"',
        'Manguera',
        JSON.stringify({
          longitud: '120 cm',
          diametro_int: '3/4 pulgada',
          presion_psi: '5000 PSI',
          rosca: 'JIC Macho 1-1/16-12',
          terminal: 'Recto / 90 grados',
        }),
        'Línea de alta presión que alimenta el cilindro del aguilón.',
        userIds.tecnico,
      ]
    );

    console.log(`  - Pieza técnica documentada: [MANG-4SP-01] en CAT-320D (Validada)`);

    console.log('\nSeed completado exitosamente.');
  } catch (error) {
    console.error('Error al crear el seed:', error);
  } finally {
    await pool.end();
  }
}

seed();
