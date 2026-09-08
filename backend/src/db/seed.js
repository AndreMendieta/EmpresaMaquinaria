require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

/**
 * Crea una empresa demo y 3 usuarios de prueba con los roles (admin, supervisor, tecnico)
 * para poder probar los distintos accesos y la navegación en la app.
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
    const empresaResult = await pool.query(
      `INSERT INTO empresas (codigo, nombre)
       VALUES ($1, $2)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [codigoEmpresa, nombreEmpresa],
    );
    const empresaId = empresaResult.rows[0].id;

    console.log(`Empresa "${nombreEmpresa}" (${codigoEmpresa}) asegurada.`);

    for (const u of usuariosDemo) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await pool.query(
        `INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (empresa_id, email)
         DO UPDATE SET password_hash = EXCLUDED.password_hash, rol = EXCLUDED.rol`,
        [empresaId, u.nombre, u.email, passwordHash, u.rol],
      );
      console.log(`  - Rol: ${u.rol.toUpperCase().padEnd(11)} | Correo: ${u.email.padEnd(22)} | Clave: ${u.password}`);
    }

    console.log('\nUsuarios demo inicializados exitosamente.');
  } catch (error) {
    console.error('Error al crear el seed:', error);
  } finally {
    await pool.end();
  }
}

seed();
