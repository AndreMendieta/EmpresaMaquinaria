-- Esquema de base de datos para HydroTech / EmpresaMaquinaria
-- Motor: PostgreSQL

CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  password_hash TEXT NOT NULL,
  rol VARCHAR(30) NOT NULL DEFAULT 'tecnico' CHECK (rol IN ('admin', 'supervisor', 'tecnico')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un mismo correo puede repetirse en distintas empresas, pero no dentro de la misma
  CONSTRAINT uq_usuario_por_empresa UNIQUE (empresa_id, email)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- Tabla de Maquinarias (Registradas por Supervisor / Admin - HU-015)
CREATE TABLE IF NOT EXISTS maquinarias (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(80) NOT NULL,
  manual_url TEXT,
  descripcion TEXT,
  creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_maquina_codigo_empresa UNIQUE (empresa_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_maquinarias_empresa ON maquinarias (empresa_id);

-- Tabla de Piezas / Componentes Técnicos (Registradas sobre una máquina - HU-014)
CREATE TABLE IF NOT EXISTS piezas (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  maquina_id INTEGER NOT NULL REFERENCES maquinarias(id) ON DELETE CASCADE,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  medidas JSONB NOT NULL DEFAULT '{}'::jsonb,
  descripcion TEXT,
  fotos TEXT[] DEFAULT ARRAY[]::TEXT[],
  estado_validacion VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (estado_validacion IN ('pendiente', 'validada', 'rechazada')),
  creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_pieza_codigo_maquina UNIQUE (maquina_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_piezas_maquina ON piezas (maquina_id);
CREATE INDEX IF NOT EXISTS idx_piezas_empresa ON piezas (empresa_id);

-- Tabla de Notificaciones al Supervisor para Validación de Piezas
CREATE TABLE IF NOT EXISTS notificaciones_supervisor (
  id SERIAL PRIMARY KEY,
  empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  pieza_id INTEGER NOT NULL REFERENCES piezas(id) ON DELETE CASCADE,
  tecnico_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_empresa ON notificaciones_supervisor (empresa_id);

-- Compatibilidad retroactiva de constraint de roles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usuarios') THEN
    ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'tecnico';
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'chk_usuarios_rol' AND table_name = 'usuarios'
    ) THEN
      ALTER TABLE usuarios ADD CONSTRAINT chk_usuarios_rol CHECK (rol IN ('admin', 'supervisor', 'tecnico'));
    END IF;
  END IF;
END $$;

-- Datos de ejemplo iniciales
INSERT INTO empresas (codigo, nombre)
VALUES ('DEMO01', 'HydroTech S.A.S.')
ON CONFLICT (codigo) DO NOTHING;
