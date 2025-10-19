# backend/fill_client_names.py
import random, sqlite3, os
from pathlib import Path

DB_PATH = Path(__file__).parent / "app" / "database.db"

NOMBRES = [
    "Sofía M.", "Juan P.", "Martina R.", "Lucas G.", "Valentina D.",
    "Thiago A.", "Lautaro C.", "Micaela S.", "Agustina V.", "Nicolás F.",
    "Camila T.", "Bruno L.", "Lucía K.", "Franco B.", "Julián Z.",
]
CELUS = [
    "+54 9 11 6" + f"{random.randint(1000000,9999999)}",
    "+54 9 351 " + f"{random.randint(4000000,4999999)}",
    "+54 9 261 " + f"{random.randint(4000000,4999999)}",
    "+54 9 341 " + f"{random.randint(5000000,5999999)}",
]

def main():
    if not DB_PATH.exists():
        print(f"DB no encontrada en: {DB_PATH}")
        return

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    cur.execute("""
        SELECT id FROM turnos
        WHERE (cliente_nombre IS NULL OR cliente_nombre='')
    """)
    ids = [r[0] for r in cur.fetchall()]
    if not ids:
        print("No hay turnos vacíos para completar.")
        return

    for tid in ids:
        nombre = random.choice(NOMBRES)
        tel = random.choice(CELUS)
        cur.execute("""
            UPDATE turnos
            SET cliente_nombre=?, cliente_contacto=?
            WHERE id=?
        """, (nombre, tel, tid))

    conn.commit()
    print(f"Actualizados {len(ids)} turnos con nombre/contacto demo.")
    conn.close()

if __name__ == "__main__":
    main()
