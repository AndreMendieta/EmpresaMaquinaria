require('dotenv').config();
const pool = require('./pool');

const normalizePartType = (type) => {
  const value = String(type || '').toLowerCase();
  if (value.includes('torno')) return 'torno';
  if (value.includes('cilindro')) return 'cilindro';
  return 'manguera';
};

const value = (measures, ...keys) => {
  for (const key of keys) {
    if (measures && measures[key] !== undefined && measures[key] !== null) return String(measures[key]);
  }
  return null;
};

async function migrate() {
  const client = await pool.connect();
  const companyMap = new Map();
  const userMap = new Map();
  const machineMap = new Map();
  const partMap = new Map();

  try {
    await client.query('BEGIN');

    const companies = await client.query('SELECT id, codigo, nombre FROM empresas ORDER BY id');
    for (const company of companies.rows) {
      const result = await client.query(
        `INSERT INTO empresas_prestadoras (razon_social, nombre_comercial, legacy_empresa_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (legacy_empresa_id) DO UPDATE
         SET razon_social = EXCLUDED.razon_social,
             nombre_comercial = EXCLUDED.nombre_comercial,
             actualizado_en = NOW()
         RETURNING id`,
        [company.nombre, company.codigo, company.id]
      );
      companyMap.set(company.id, result.rows[0].id);
    }

    const users = await client.query(
      `SELECT id, empresa_id, nombre, email, password_hash, rol, activo
       FROM usuarios ORDER BY id`
    );
    for (const user of users.rows) {
      const serviceCompanyId = companyMap.get(user.empresa_id);
      if (!serviceCompanyId) continue;
      const result = await client.query(
        `INSERT INTO usuarios_multiempresa
          (empresa_prestadora_id, nombre_completo, correo, clave_hash, rol, activo, legacy_usuario_id)
         VALUES ($1, $2, LOWER($3), $4, $5, $6, $7)
         ON CONFLICT (empresa_prestadora_id, correo) DO UPDATE
         SET nombre_completo = EXCLUDED.nombre_completo,
             clave_hash = EXCLUDED.clave_hash,
             rol = EXCLUDED.rol,
             activo = EXCLUDED.activo,
             legacy_usuario_id = EXCLUDED.legacy_usuario_id,
             actualizado_en = NOW()
         RETURNING id`,
        [serviceCompanyId, user.nombre, user.email, user.password_hash, user.rol, user.activo, user.id]
      );
      userMap.set(user.id, result.rows[0].id);
    }

    const machines = await client.query(
      `SELECT id, empresa_id, codigo, nombre, tipo, manual_url, descripcion, estado, creado_por
       FROM maquinarias ORDER BY id`
    );
    for (const machine of machines.rows) {
      const serviceCompanyId = companyMap.get(machine.empresa_id);
      if (!serviceCompanyId) continue;
      const result = await client.query(
        `INSERT INTO maquinarias_multiempresa
          (empresa_prestadora_id, codigo, nombre, tipo, url_manual, descripcion, estado, creado_por, legacy_maquina_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (empresa_prestadora_id, codigo) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             tipo = EXCLUDED.tipo,
             url_manual = EXCLUDED.url_manual,
             descripcion = EXCLUDED.descripcion,
             estado = EXCLUDED.estado,
             creado_por = EXCLUDED.creado_por,
             legacy_maquina_id = EXCLUDED.legacy_maquina_id,
             actualizado_en = NOW()
         RETURNING id`,
        [
          serviceCompanyId,
          machine.codigo,
          machine.nombre,
          machine.tipo,
          machine.manual_url,
          machine.descripcion,
          machine.estado === 'inactiva' ? 'inactiva' : 'activa',
          userMap.get(machine.creado_por) || null,
          machine.id,
        ]
      );
      machineMap.set(machine.id, result.rows[0].id);
    }

    const parts = await client.query(
      `SELECT id, empresa_id, maquina_id, codigo, nombre, tipo, medidas, descripcion, fotos,
              estado_validacion, creado_por
       FROM piezas ORDER BY id`
    );
    for (const part of parts.rows) {
      const serviceCompanyId = companyMap.get(part.empresa_id);
      const machineId = machineMap.get(part.maquina_id);
      if (!serviceCompanyId || !machineId) continue;

      const partType = normalizePartType(part.tipo);
      const result = await client.query(
        `INSERT INTO piezas_multiempresa
          (empresa_prestadora_id, maquinaria_id, codigo, nombre, tipo, descripcion, fotos,
           estado_validacion, creado_por, legacy_pieza_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (maquinaria_id, codigo) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             tipo = EXCLUDED.tipo,
             descripcion = EXCLUDED.descripcion,
             fotos = EXCLUDED.fotos,
             estado_validacion = EXCLUDED.estado_validacion,
             creado_por = EXCLUDED.creado_por,
             legacy_pieza_id = EXCLUDED.legacy_pieza_id,
             actualizado_en = NOW()
         RETURNING id`,
        [
          serviceCompanyId,
          machineId,
          part.codigo,
          part.nombre,
          partType,
          part.descripcion,
          Array.isArray(part.fotos) ? part.fotos : [],
          part.estado_validacion === 'validada' ? 'validada' : part.estado_validacion === 'rechazada' ? 'rechazada' : 'pendiente',
          userMap.get(part.creado_por) || null,
          part.id,
        ]
      );
      const partId = result.rows[0].id;
      partMap.set(part.id, partId);
      const measures = part.medidas || {};

      if (partType === 'manguera') {
        await client.query(
          `INSERT INTO piezas_manguera
            (pieza_id, empresa_prestadora_id, diametro, longitud, presion, terminales, evidencia, adicionales)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (pieza_id) DO UPDATE SET
             diametro = EXCLUDED.diametro, longitud = EXCLUDED.longitud,
             presion = EXCLUDED.presion, terminales = EXCLUDED.terminales,
             evidencia = EXCLUDED.evidencia, adicionales = EXCLUDED.adicionales`,
          [partId, serviceCompanyId, value(measures, 'diametro', 'diametro_int', 'diametro_interior'), value(measures, 'longitud'), value(measures, 'presion', 'presion_psi', 'presion_trabajo'), value(measures, 'terminales', 'terminal'), value(measures, 'evidencia'), value(measures, 'adicionales')]
        );
      } else if (partType === 'torno') {
        await client.query(
          `INSERT INTO piezas_torno
            (pieza_id, empresa_prestadora_id, diametro, longitud, rosca, material, planos, evidencia, adicionales)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (pieza_id) DO UPDATE SET
             diametro = EXCLUDED.diametro, longitud = EXCLUDED.longitud,
             rosca = EXCLUDED.rosca, material = EXCLUDED.material,
             planos = EXCLUDED.planos, evidencia = EXCLUDED.evidencia,
             adicionales = EXCLUDED.adicionales`,
          [partId, serviceCompanyId, value(measures, 'diametro'), value(measures, 'longitud'), value(measures, 'rosca'), value(measures, 'material'), value(measures, 'planos'), value(measures, 'evidencia'), value(measures, 'adicionales')]
        );
      } else {
        await client.query(
          `INSERT INTO piezas_cilindro
            (pieza_id, empresa_prestadora_id, camisa, vastago, medida_tapa, medida_piston,
             empaques, ojo, pasadores, recorrido_salida, racores_llenado, presion_trabajo, adicionales)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (pieza_id) DO UPDATE SET
             camisa = EXCLUDED.camisa, vastago = EXCLUDED.vastago,
             medida_tapa = EXCLUDED.medida_tapa, medida_piston = EXCLUDED.medida_piston,
             empaques = EXCLUDED.empaques, ojo = EXCLUDED.ojo, pasadores = EXCLUDED.pasadores,
             recorrido_salida = EXCLUDED.recorrido_salida, racores_llenado = EXCLUDED.racores_llenado,
             presion_trabajo = EXCLUDED.presion_trabajo, adicionales = EXCLUDED.adicionales`,
          [partId, serviceCompanyId, value(measures, 'camisa', 'diametro_camisa'), value(measures, 'vastago', 'diametro_vastago'), value(measures, 'tapa', 'medida_tapa'), value(measures, 'piston', 'medida_piston'), value(measures, 'empaques', 'tipo_sello'), value(measures, 'ojo'), value(measures, 'pasadores'), value(measures, 'recorrido_salida', 'carrera'), value(measures, 'racores_llenado'), value(measures, 'presion_trabajo', 'presion', 'presion_psi'), value(measures, 'adicionales')]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`Migración completada: ${companyMap.size} empresas, ${userMap.size} usuarios, ${machineMap.size} máquinas y ${partMap.size} piezas.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('No se pudo migrar legacy a v2:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
