# seed_backend.py
# Semilla por HTTP: crea usuarios (mirko y cliente1), activa plan emprendedor de mirko,
# genera código público si existe endpoint, carga servicios, horarios y ~20 turnos (algunos cancelados/pospuestos si tu API lo soporta).
# Requiere: backend levantado. Usa TURNATE_API_URL si está en el entorno.

import requests
from datetime import datetime, timedelta
import random
import sys
import os

BASE_URL = os.environ.get("TURNATE_API_URL", "http://127.0.0.1:8000")

# Credenciales visibles para demo
MIRKO = {
    "username": "mirko",
    "email": "mirko@barber.com",
    "password": "mirko123",
}
CLIENTE = {
    "username": "cliente1",
    "email": "cliente1@test.com",
    "password": "cliente123",
}

# Servicios con precio (usados por Estadísticas)
SERVICIOS = [
    {"nombre": "Corte clásico", "duracion_min": 30, "precio": 5000},
    {"nombre": "Barba", "duracion_min": 20, "precio": 3000},
    {"nombre": "Corte + Barba", "duracion_min": 45, "precio": 7500},
    {"nombre": "Color", "duracion_min": 90, "precio": 15000},
]

# Lunes..Sábado: 09:00-13:00 y 15:00-20:00
HORARIOS = []
for dia in ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]:
    HORARIOS.append({"dia": dia, "desde": "09:00", "hasta": "13:00"})
    HORARIOS.append({"dia": dia, "desde": "15:00", "hasta": "20:00"})

CLIENTES_FICTICIOS = [
    "Agustín R.","Brenda L.","Carlos P.","Delfina S.","Enzo M.","Fiorella G.","Gonzalo T.","Helena V.","Iván D.",
    "Julieta F.","Kevin H.","Lucía Z.","Martín Q.","Nadia B.","Oscar K.","Pamela C.","Quimey A.","Ramiro Y.",
    "Sofía J.","Tomás W.","Uma E.","Valentín N.","Wanda X.","Yago O.","Zoe U."
]
ESTADOS_POSIBLES = ["programado", "cancelado", "pospuesto"]  # patch si tu API lo soporta


# --------------------------
# Helpers HTTP tolerantes
# --------------------------
def post(url, data=None, token=None, allow_error=False):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.post(BASE_URL + url, json=data or {}, headers=headers)
    if not allow_error and not r.ok:
        raise RuntimeError(f"POST {url} -> {r.status_code} {r.text}")
    return r

def patch(url, data=None, token=None, allow_error=False):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.patch(BASE_URL + url, json=data or {}, headers=headers)
    if not allow_error and not r.ok:
        raise RuntimeError(f"PATCH {url} -> {r.status_code} {r.text}")
    return r

def get(url, token=None, allow_error=False, params=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.get(BASE_URL + url, headers=headers, params=params)
    if not allow_error and not r.ok:
        raise RuntimeError(f"GET {url} -> {r.status_code} {r.text}")
    return r

def post_try(paths, data=None, token=None):
    """Prueba POST sobre varias rutas y devuelve la primera ok o la última respuesta/exception."""
    last = None
    for p in paths:
        try:
            r = post(p, data, token=token, allow_error=True)
            if r.ok:
                return r
            last = r
        except Exception as e:
            last = e
    return last  # Response (no ok) o Exception


# --------------------------
# Acciones de seed
# --------------------------
def crear_usuario(username, email, password, rol="cliente"):
    data = {"username": username, "email": email, "password": password, "rol": rol}
    # probamos con y sin barra final
    r = post("/usuarios/", data, allow_error=True)
    if not r.ok:
        r = post("/usuarios", data, allow_error=True)
    if not r.ok and r.status_code != 400:  # 400 si ya existe, lo aceptamos
        raise RuntimeError(f"No se pudo crear usuario {username}: {r.status_code} {r.text}")
    return True

def login(username, password):
    """Prueba variantes comunes del endpoint de login."""
    candidates = [
        ("/usuarios/login", {"username": username, "password": password}),
        ("/usuarios/login", {"identifier": username, "password": password}),
        ("/usuarios/login", {"email": username, "password": password}),
        ("/usuarios/login/", {"username": username, "password": password}),
    ]
    last_error = None
    for path, body in candidates:
        try:
            r = post(path, body, allow_error=True)
            if r.ok:
                data = r.json()
                token = data.get("access_token") or data.get("token") or ""
                user = data.get("user") or {}
                if token:
                    return token, user
        except Exception as e:
            last_error = e
    raise RuntimeError(f"No se pudo iniciar sesión en /usuarios/login. Último error: {last_error}")

def activar_emprendedor(token, user_id=None):
    candidates = [
        "/emprendedores/activar",
        "/usuarios/activar_emprendedor",
    ]
    if user_id:
        candidates.append(f"/usuarios/{user_id}/activar_emprendedor")
    post_try(candidates, {}, token=token)
    return True

def generar_codigo(token):
    candidates = [
        "/emprendedores/generar-codigo",
        "/emprendedores/generar_codigo",
        "/emprendedores/codigo",
    ]
    r = post_try(candidates, {}, token=token)
    if getattr(r, "ok", False):
        try:
            return r.json().get("codigo") or ""
        except Exception:
            return ""
    return ""

def crear_servicios(token):
    ids = []
    for s in SERVICIOS:
        r = post_try(["/servicios", "/servicios/"], s, token=token)
        if getattr(r, "ok", False):
            try:
                ids.append(r.json().get("id"))
            except Exception:
                pass
        else:
            try:
                print("Servicio falló:", getattr(r, "status_code", "?"), getattr(r, "text", r))
            except Exception:
                pass
    return ids

def crear_horarios(token):
    for h in HORARIOS:
        r = post_try(["/horarios", "/horarios/"], h, token=token)
        if not getattr(r, "ok", False):
            try:
                print("Horario falló:", getattr(r, "status_code", "?"), getattr(r, "text", r))
            except Exception:
                pass

def crear_turno(token, servicio_id, start_dt, cliente_nombre, notas=None):
    payload = {
        "servicio_id": servicio_id,
        "datetime": start_dt.isoformat(),
        "cliente_nombre": cliente_nombre,
        "notas": notas or None
    }
    r = post_try(["/turnos", "/turnos/"], payload, token=token)
    if getattr(r, "ok", False):
        try:
            return r.json().get("id")
        except Exception:
            return None
    return None

def patch_estado_turno(token, turno_id, nuevo_estado):
    if not turno_id:
        return
    patch(f"/turnos/{turno_id}", {"estado": nuevo_estado}, token=token, allow_error=True)


# --------------------------
# Main
# --------------------------
def main():
    print("== Seed Turnate ==")
    print(f"Usando API: {BASE_URL}")

    # 1) Crear usuarios (si ya existen, se ignora)
    crear_usuario(MIRKO["username"], MIRKO["email"], MIRKO["password"], rol="cliente")
    crear_usuario(CLIENTE["username"], CLIENTE["email"], CLIENTE["password"], rol="cliente")

    # 2) Login mirko
    mirko_token, mirko_user = login(MIRKO["username"], MIRKO["password"])
    if not mirko_token:
        print("No se pudo loguear a mirko. ¿Backend corriendo?")
        sys.exit(1)
    print(f"Mirko logueado como id={mirko_user.get('id')}")

    # 3) Activar plan emprendedor y generar código
    activar_emprendedor(mirko_token, mirko_user.get("id"))

    # Comprobar rol si tu back expone /usuarios/me
    try:
        me = get("/usuarios/me", token=mirko_token, allow_error=True)
        if getattr(me, "ok", False):
            rol = (me.json().get("rol") or "").lower()
            print("Rol actual de mirko:", rol or "(desconocido)")
    except Exception:
        pass

    code = generar_codigo(mirko_token)
    if code:
        print(f"Código público de Mirko: {code}  -> /reservar/{code}")
    else:
        print("No se pudo obtener código público (seguimos de todos modos).")

    # 4) Servicios y horarios
    servicio_ids = [sid for sid in crear_servicios(mirko_token) if isinstance(sid, int)]
    crear_horarios(mirko_token)
    if not servicio_ids:
        print("No hay servicios creados; no se sembrarán turnos.")
        print("\n=== Listo (parcial) ===")
        print(f"Emprendedor: {MIRKO['username']} / {MIRKO['password']}")
        print(f"Cliente:     {CLIENTE['username']} / {CLIENTE['password']}")
        if code:
            print(f"Link público sugerido (Vite): http://localhost:5173/reservar/{code}")
        print()
        return

    # 5) Turnos (~20)
    now = datetime.now()
    posibles_horas = [9, 10, 11, 12, 15, 16, 17, 18, 19]

    def proximo_habil(d, h):
        return d.replace(hour=h, minute=0, second=0, microsecond=0)

    random.seed(42)

    # Pasados (10)
    for _ in range(10):
        day_off = random.randint(2, 10)
        hora = random.choice(posibles_horas)
        start = proximo_habil(now - timedelta(days=day_off), hora)
        sid = random.choice(servicio_ids)
        cliente = random.choice(CLIENTES_FICTICIOS)
        turno_id = crear_turno(mirko_token, sid, start, cliente)
        if turno_id:
            patch_estado_turno(mirko_token, turno_id, random.choice(ESTADOS_POSIBLES))

    # Próximos (9)
    for _ in range(9):
        day_off = random.randint(1, 10)
        hora = random.choice(posibles_horas)
        start = proximo_habil(now + timedelta(days=day_off), hora)
        sid = random.choice(servicio_ids)
        cliente = random.choice(CLIENTES_FICTICIOS)
        turno_id = crear_turno(mirko_token, sid, start, cliente)
        if turno_id:
            patch_estado_turno(mirko_token, turno_id, random.choice(["programado", "programado", "pospuesto"]))

    # Uno muy próximo (mañana 10:00)
    crear_turno(mirko_token, servicio_ids[0], proximo_habil(now + timedelta(days=1), 10), "Cliente Próximo")

    # 6) Cliente para probar reservas manuales
    cliente_token, cliente_user = login(CLIENTE["username"], CLIENTE["password"])
    if cliente_token:
        print(f"Cliente '{CLIENTE['username']}' ok.")
    else:
        print("No se pudo loguear al cliente (quizá falta endpoint /usuarios/login).")

    print("\n=== Listo ===")
    print(f"Emprendedor: {MIRKO['username']} / {MIRKO['password']}")
    print(f"Cliente:     {CLIENTE['username']} / {CLIENTE['password']}")
    if code:
        print(f"Link público sugerido (Vite): http://localhost:5173/reservar/{code}")
    print()

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR en seed:", repr(e))

        sys.exit(1)
