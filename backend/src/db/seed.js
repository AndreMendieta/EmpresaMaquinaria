require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

/**
 * Crea una empresa demo y un usuario de prueba para poder
 * verificar el login desde la app.
 *
 * Uso: node src/db/seed.js
 */
async function seed() {
  const codigoEmpresa = 'DEMO01';
  const nombreEmpresa = 'Empresa Demo S.A.S';
  const emailUsuario = 'admin@demo.com';
  const passwordPlano = 'Admin123!'; // solo para pruebas, cámbiala en producción
  const nombreUsuario = 'Administrador Demo';

  try {
    const empresaResult = await pool.query(
      `INSERT INTO empresas (codigo, nombre)
       VALUES ($1, $2)
       ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id`,
      [codigoEmpresa, nombreEmpresa],
    );
    const empresaId = empresaResult.rows[0].id;

    const passwordHash = await bcrypt.hash(passwordPlano, 10);

    await pool.query(
      `INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (empresa_id, email)
       DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [empresaId, nombreUsuario, emailUsuario, passwordHash],
    );

    console.log('Usuario de prueba creado con éxito:');
    console.log('  Código de empresa:', codigoEmpresa);
    console.log('  Email:', emailUsuario);
    console.log('  Password:', passwordPlano);
  } catch (error) {
    console.error('Error al crear el seed:', error);
  } finally {
    await pool.end();
  }
}

seed();
