-- Recreate encuestas_fase3 with new schema for Evaluación Comercial v2
-- Old columns: p1-p5 + comentario_adicional
-- New columns: p1-p7 + p2_mercado_objetivo + p3_modelo_cobro + p4_falta_para_vender

DROP TABLE IF EXISTS encuestas_fase3;

CREATE TABLE encuestas_fase3 (
    sesion_id INTEGER PRIMARY KEY,
    p1_comprende_producto TEXT,
    p2_mercado_objetivo TEXT,
    p3_modelo_cobro TEXT,
    p4_falta_para_vender TEXT,
    p5_compraria INTEGER CHECK(p5_compraria IN (0, 1, 2)),
    p6_recomendaria INTEGER CHECK(p6_recomendaria IN (0, 1, 2)),
    p7_abre_servicio INTEGER CHECK(p7_abre_servicio IN (0, 1)),
    comentario_adicional TEXT,
    FOREIGN KEY (sesion_id) REFERENCES sesiones(id) ON DELETE CASCADE
);
