-- Esquema de base de datos para EmpresaMaquinaria
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

  -- Un mismo correo puede repetirse en distintas empresas,
  -- pero no dos veces dentro de la MISMA empresa.
  CONSTRAINT uq_usuario_por_empresa UNIQUE (empresa_id, email)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- Si la tabla ya existía de antes sin el constraint de roles, lo actualizamos:
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

-- Datos de ejemplo para pruebas (la contraseña real se inserta
-- hasheada desde seed.js, esto es solo referencia de la empresa demo)
INSERT INTO empresas (codigo, nombre)
VALUES ('DEMO01', 'Empresa Demo S.A.S')
ON CONFLICT (codigo) DO NOTHING;
