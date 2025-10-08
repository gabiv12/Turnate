import os

# Ruta principal del proyecto
base_path = r"C:\Users\.lllllll\Desktop\turnate"

# Carpetas a incluir
carpetas_objetivo = ["backend", "frontend"]

# Carpetas a excluir dentro de cada proyecto
excluir = {"node_modules", ".venv", "venv", "__pycache__", ".git", ".idea", "dist", "build"}

# Función para dibujar árbol
def listar_con_sangria(ruta, prefijo=""):
    elementos = [e for e in os.listdir(ruta) if e not in excluir]
    elementos.sort()
    total = len(elementos)
    
    for i, nombre in enumerate(elementos):
        ruta_completa = os.path.join(ruta, nombre)
        es_ultimo = (i == total - 1)
        conector = "└── " if es_ultimo else "├── "
        print(prefijo + conector + nombre)
        if os.path.isdir(ruta_completa):
            nuevo_prefijo = prefijo + ("    " if es_ultimo else "│   ")
            listar_con_sangria(ruta_completa, nuevo_prefijo)

# Ejecutar para cada carpeta objetivo
for carpeta in carpetas_objetivo:
    ruta_completa = os.path.join(base_path, carpeta)
    if os.path.isdir(ruta_completa):
        print(carpeta)
        listar_con_sangria(ruta_completa, "│   ")
