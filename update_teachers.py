import pandas as pd
import subprocess
import json
import os
from pathlib import Path

# Leer el archivo Excel
excel_path = Path(r"C:\Users\krisa\OneDrive\Escritorio\Profes.xlsx")
df = pd.read_excel(excel_path)

# Eliminar duplicados manteniendo el primero
df_unique = df.drop_duplicates(subset=['Nombre', 'Materia'], keep='first')

print(f"Total registros originales: {len(df)}")
print(f"Registros únicos: {len(df_unique)}")

# Guardar en formato JSON para el script de Node
output_path = Path(r"C:\Users\krisa\OneDrive\Escritorio\Ecuela\Seminario de programacion\Judgeme 0.1\teachers_update.json")

df_unique.to_json(output_path, orient='records', force_ascii=False, indent=2)

print(f"Datos guardados en: {output_path}")
