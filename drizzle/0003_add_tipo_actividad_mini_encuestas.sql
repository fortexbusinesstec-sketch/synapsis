-- Add tipo_actividad and numero_actividad to sesiones
ALTER TABLE sesiones ADD COLUMN tipo_actividad TEXT CHECK(tipo_actividad IN ('sesion', 'individual'));
ALTER TABLE sesiones ADD COLUMN numero_actividad INTEGER;

-- Create mini_encuestas table
CREATE TABLE mini_encuestas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sesion_id INTEGER NOT NULL,
    utilidad INTEGER NOT NULL CHECK(utilidad >= 1 AND utilidad <= 5),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
);

-- Add evaluaciones_actividades to encuestas_fase1
ALTER TABLE encuestas_fase1 ADD COLUMN evaluaciones_actividades TEXT;

-- Add evaluaciones_actividades to encuestas_fase2
ALTER TABLE encuestas_fase2 ADD COLUMN evaluaciones_actividades TEXT;
