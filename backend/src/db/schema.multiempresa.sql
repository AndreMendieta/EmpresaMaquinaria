-- Esquema multiempresa en español. Convive con schema.sql.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS empresas_prestadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(180) NOT NULL,
  nombre_comercial VARCHAR(180),
  identificacion_fiscal VARCHAR(60) UNIQUE,
  correo VARCHAR(180), telefono VARCHAR(40), direccion TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  razon_social VARCHAR(180) NOT NULL,
  nombre_comercial VARCHAR(180), identificacion_fiscal VARCHAR(60),
  correo VARCHAR(180), telefono VARCHAR(40), direccion TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_empresa_cliente_id UNIQUE (empresa_prestadora_id, id),
  CONSTRAINT uq_empresa_cliente_identificacion UNIQUE (empresa_prestadora_id, identificacion_fiscal)
);

CREATE TABLE IF NOT EXISTS usuarios_multiempresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  empresa_cliente_id UUID,
  nombre_completo VARCHAR(180) NOT NULL,
  correo VARCHAR(180) NOT NULL,
  clave_hash TEXT NOT NULL,
  rol VARCHAR(20) NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('admin','supervisor','tecnico')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  intentos_fallidos INTEGER NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
  bloqueado_hasta TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_usuario_id UNIQUE (empresa_prestadora_id, id),
  CONSTRAINT uq_usuario_correo UNIQUE (empresa_prestadora_id, correo),
  CONSTRAINT fk_usuario_cliente FOREIGN KEY (empresa_prestadora_id, empresa_cliente_id)
    REFERENCES empresas_clientes (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS maquinarias_multiempresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  empresa_cliente_id UUID,
  codigo VARCHAR(80) NOT NULL, nombre VARCHAR(180) NOT NULL, tipo VARCHAR(100) NOT NULL,
  numero_serie VARCHAR(120), url_manual TEXT, descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','inactiva')),
  creado_por UUID, creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_maquinaria_id UNIQUE (empresa_prestadora_id, id),
  CONSTRAINT uq_maquinaria_codigo UNIQUE (empresa_prestadora_id, codigo),
  CONSTRAINT fk_maquinaria_cliente FOREIGN KEY (empresa_prestadora_id, empresa_cliente_id)
    REFERENCES empresas_clientes (empresa_prestadora_id, id),
  CONSTRAINT fk_maquinaria_usuario FOREIGN KEY (empresa_prestadora_id, creado_por)
    REFERENCES usuarios_multiempresa (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS piezas_multiempresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  maquinaria_id UUID NOT NULL,
  codigo VARCHAR(80) NOT NULL, nombre VARCHAR(180) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('manguera','torno','cilindro')),
  descripcion TEXT, fotos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  estado_validacion VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado_validacion IN ('pendiente','validada','rechazada')),
  creado_por UUID, creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pieza_id UNIQUE (empresa_prestadora_id, id),
  CONSTRAINT uq_pieza_codigo UNIQUE (maquinaria_id, codigo),
  CONSTRAINT fk_pieza_maquinaria FOREIGN KEY (empresa_prestadora_id, maquinaria_id)
    REFERENCES maquinarias_multiempresa (empresa_prestadora_id, id),
  CONSTRAINT fk_pieza_usuario FOREIGN KEY (empresa_prestadora_id, creado_por)
    REFERENCES usuarios_multiempresa (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS piezas_manguera (
  pieza_id UUID PRIMARY KEY REFERENCES piezas_multiempresa(id) ON DELETE CASCADE,
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  diametro_interior VARCHAR(80), diametro_exterior VARCHAR(80), longitud VARCHAR(80),
  presion_trabajo VARCHAR(80), tipo_conexion VARCHAR(120), material VARCHAR(120),
  CONSTRAINT fk_manguera_pieza FOREIGN KEY (empresa_prestadora_id, pieza_id)
    REFERENCES piezas_multiempresa (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS piezas_torno (
  pieza_id UUID PRIMARY KEY REFERENCES piezas_multiempresa(id) ON DELETE CASCADE,
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  diametro VARCHAR(80), longitud VARCHAR(80), rosca VARCHAR(120), material VARCHAR(120), tolerancia VARCHAR(80),
  CONSTRAINT fk_torno_pieza FOREIGN KEY (empresa_prestadora_id, pieza_id)
    REFERENCES piezas_multiempresa (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS piezas_cilindro (
  pieza_id UUID PRIMARY KEY REFERENCES piezas_multiempresa(id) ON DELETE CASCADE,
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  diametro_camisa VARCHAR(80), diametro_vastago VARCHAR(80), carrera VARCHAR(80),
  presion_trabajo VARCHAR(80), tipo_sello VARCHAR(120),
  CONSTRAINT fk_cilindro_pieza FOREIGN KEY (empresa_prestadora_id, pieza_id)
    REFERENCES piezas_multiempresa (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS ordenes_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  empresa_cliente_id UUID, maquinaria_id UUID, solicitada_por UUID, asignada_a UUID,
  numero_orden VARCHAR(80) NOT NULL, titulo VARCHAR(180) NOT NULL, descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','en_progreso','completada','cancelada')),
  prioridad VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (prioridad IN ('baja','normal','alta','urgente')),
  programada_en TIMESTAMPTZ, completada_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(), actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_orden_id UNIQUE (empresa_prestadora_id, id),
  CONSTRAINT uq_numero_orden UNIQUE (empresa_prestadora_id, numero_orden),
  CONSTRAINT fk_orden_cliente FOREIGN KEY (empresa_prestadora_id, empresa_cliente_id)
    REFERENCES empresas_clientes (empresa_prestadora_id, id),
  CONSTRAINT fk_orden_maquinaria FOREIGN KEY (empresa_prestadora_id, maquinaria_id)
    REFERENCES maquinarias_multiempresa (empresa_prestadora_id, id),
  CONSTRAINT fk_orden_solicitante FOREIGN KEY (empresa_prestadora_id, solicitada_por)
    REFERENCES usuarios_multiempresa (empresa_prestadora_id, id),
  CONSTRAINT fk_orden_asignado FOREIGN KEY (empresa_prestadora_id, asignada_a)
    REFERENCES usuarios_multiempresa (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS notificaciones_multiempresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  usuario_id UUID, orden_id UUID, pieza_id UUID,
  titulo VARCHAR(180) NOT NULL, mensaje TEXT NOT NULL, leida_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (empresa_prestadora_id, usuario_id)
    REFERENCES usuarios_multiempresa (empresa_prestadora_id, id),
  CONSTRAINT fk_notificacion_orden FOREIGN KEY (empresa_prestadora_id, orden_id)
    REFERENCES ordenes_servicio (empresa_prestadora_id, id),
  CONSTRAINT fk_notificacion_pieza FOREIGN KEY (empresa_prestadora_id, pieza_id)
    REFERENCES piezas_multiempresa (empresa_prestadora_id, id)
);

CREATE TABLE IF NOT EXISTS registros_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_prestadora_id UUID NOT NULL REFERENCES empresas_prestadoras(id) ON DELETE CASCADE,
  usuario_id UUID,
  accion VARCHAR(20) NOT NULL CHECK (accion IN ('crear','modificar','eliminar','inicio_sesion','cierre_sesion')),
  entidad VARCHAR(80) NOT NULL, entidad_id UUID, detalle JSONB, direccion_ip INET,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (empresa_prestadora_id, usuario_id)
    REFERENCES usuarios_multiempresa (empresa_prestadora_id, id)
);

CREATE INDEX IF NOT EXISTS idx_clientes_prestadora ON empresas_clientes (empresa_prestadora_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_prestadora ON usuarios_multiempresa (empresa_prestadora_id);
CREATE INDEX IF NOT EXISTS idx_maquinarias_prestadora ON maquinarias_multiempresa (empresa_prestadora_id);
CREATE INDEX IF NOT EXISTS idx_maquinarias_estado ON maquinarias_multiempresa (empresa_prestadora_id, estado);
CREATE INDEX IF NOT EXISTS idx_piezas_prestadora ON piezas_multiempresa (empresa_prestadora_id);
CREATE INDEX IF NOT EXISTS idx_piezas_maquinaria ON piezas_multiempresa (maquinaria_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_prestadora ON ordenes_servicio (empresa_prestadora_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_servicio (empresa_prestadora_id, estado);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones_multiempresa (usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_prestadora ON registros_auditoria (empresa_prestadora_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON registros_auditoria (empresa_prestadora_id, creado_en DESC);

COMMIT;
