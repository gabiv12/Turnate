# app/utils/migrate.py
"""
Auto-migraciones mínimas para SQLite en desarrollo.
- Agrega columnas faltantes detectando con PRAGMA table_info.
- Seguro de correr múltiples veces (idempotente).

⚠️ Solo para DEV. En producción usar Alembic.
"""
from sqlalchemy import text


def _column_exists(conn, table: str, column: str) -> bool:
    rows = conn.exec_driver_sql(f"PRAGMA table_info({table});").fetchall()
    cols = [r[1] for r in rows]  # 0=cid, 1=name
    return column in cols


def auto_migrate_sqlite(engine) -> None:
    """
    Ejecuta migraciones "add column" si faltan campos en tablas conocidas.
    """
    with engine.begin() as conn:
        # --- usuarios ---
        if not _column_exists(conn, "usuarios", "password_hash"):
            conn.exec_driver_sql(
                "ALTER TABLE usuarios ADD COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT ''"
            )
            print("[MIGRATE] Added usuarios.password_hash")

        if not _column_exists(conn, "usuarios", "avatar_url"):
            conn.exec_driver_sql(
                "ALTER TABLE usuarios ADD COLUMN avatar_url VARCHAR(255)"
            )
            print("[MIGRATE] Added usuarios.avatar_url")

        if not _column_exists(conn, "usuarios", "brand_logo_url"):
            conn.exec_driver_sql(
                "ALTER TABLE usuarios ADD COLUMN brand_logo_url VARCHAR(255)"
            )
            print("[MIGRATE] Added usuarios.brand_logo_url")

        if not _column_exists(conn, "usuarios", "rol"):
            conn.exec_driver_sql(
                "ALTER TABLE usuarios ADD COLUMN rol VARCHAR(50) NOT NULL DEFAULT 'cliente'"
            )
            print("[MIGRATE] Added usuarios.rol")

        # --- emprendedores ---
        # aseguramos columnas básicas por si venís de un esquema viejo
        for col_def, col_name in [
            ("usuario_id INTEGER NOT NULL DEFAULT 1", "usuario_id"),
            ("nombre_negocio VARCHAR(255)", "nombre_negocio"),
            ("descripcion TEXT", "descripcion"),
            ("instagram VARCHAR(255)", "instagram"),
            ("facebook VARCHAR(255)", "facebook"),
            ("whatsapp VARCHAR(50)", "whatsapp"),
        ]:
            if not _column_exists(conn, "emprendedores", col_name):
                conn.exec_driver_sql(
                    f"ALTER TABLE emprendedores ADD COLUMN {col_def}"
                )
                print(f"[MIGRATE] Added emprendedores.{col_name}")

        # --- servicios ---
        for col_def, col_name in [
            ("emprendedor_id INTEGER NOT NULL DEFAULT 1", "emprendedor_id"),
            ("nombre VARCHAR(255) NOT NULL DEFAULT ''", "nombre"),
            ("duracion_minutos INTEGER NOT NULL DEFAULT 30", "duracion_minutos"),
            ("precio NUMERIC(10,2) NOT NULL DEFAULT 0", "precio"),
            ("activo BOOLEAN NOT NULL DEFAULT 1", "activo"),
        ]:
            if not _column_exists(conn, "servicios", col_name):
                conn.exec_driver_sql(
                    f"ALTER TABLE servicios ADD COLUMN {col_def}"
                )
                print(f"[MIGRATE] Added servicios.{col_name}")

        # --- horarios ---
        for col_def, col_name in [
            ("emprendedor_id INTEGER NOT NULL DEFAULT 1", "emprendedor_id"),
            ("dia_semana INTEGER NOT NULL DEFAULT 1", "dia_semana"),
            ("hora_inicio TEXT NOT NULL DEFAULT '09:00:00'", "hora_inicio"),
            ("hora_fin TEXT NOT NULL DEFAULT '18:00:00'", "hora_fin"),
            ("activo BOOLEAN NOT NULL DEFAULT 1", "activo"),
        ]:
            if not _column_exists(conn, "horarios", col_name):
                conn.exec_driver_sql(
                    f"ALTER TABLE horarios ADD COLUMN {col_def}"
                )
                print(f"[MIGRATE] Added horarios.{col_name}")

        # --- turnos ---
        for col_def, col_name in [
            ("usuario_id INTEGER NOT NULL DEFAULT 1", "usuario_id"),
            ("emprendedor_id INTEGER NOT NULL DEFAULT 1", "emprendedor_id"),
            ("servicio_id INTEGER", "servicio_id"),
            ("fecha TEXT NOT NULL DEFAULT '2000-01-01'", "fecha"),
            ("hora TEXT NOT NULL DEFAULT '09:00:00'", "hora"),
            ("estado VARCHAR(50) NOT NULL DEFAULT 'pendiente'", "estado"),
        ]:
            if not _column_exists(conn, "turnos", col_name):
                conn.exec_driver_sql(
                    f"ALTER TABLE turnos ADD COLUMN {col_def}"
                )
                print(f"[MIGRATE] Added turnos.{col_name}")
