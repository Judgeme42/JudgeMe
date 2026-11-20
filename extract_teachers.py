#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re
import sys

# Read the PDF text content (pdftotext output)
with open(r"C:\Users\krisa\OneDrive\Escritorio\Grupo_Reingreso_PRESENCIAL_A-D-26.pdf", "rb") as f:
    # This is a PDF file, need to use a different approach
    pass

# Instead, let's read the overflow file that was created
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

try:
    with open(overflow_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
except:
    print("Could not read overflow file")
    sys.exit(1)

# Pattern to find lines that look like teacher + subject pairs
# The PDF has sections where it shows:
# Materia (repeated for each column)
# Nombre (teacher names in same columns)
# We need to extract these pairs

# Looking for patterns where a line contains uppercase material names
# and the next line contains teacher names
teachers_dict = {}
current_materials = []
in_material_section = False
in_name_section = False

for i, line in enumerate(lines):
    line = line.strip()
    if not line:
        current_materials = []
        in_material_section = False
        in_name_section = False
        continue

    # Check if this is a "Materia" header line
    if line.startswith("Materia"):
        in_material_section = True
        in_name_section = False
        current_materials = []
        continue

    # Check if this is a "Nombre" header line
    if line.startswith("Nombre"):
        in_name_section = True
        in_material_section = False
        continue

    # Skip "MAESTRO POR ASIGNAR" and similar
    if "MAESTRO POR ASIGNAR" in line.upper():
        continue

    # Skip other header lines
    if line in ["Clave", "Grupo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Salón"]:
        continue

    # Skip lines that are just time slots
    if re.match(r'^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}', line):
        continue

    # Skip lines that are just room numbers
    if re.match(r'^\d+$', line):
        continue

    # Skip lines that look like dates or page numbers
    if re.match(r'^\d+\s*/\s*\d+$', line):
        continue

    # Skip lines with only special characters
    if re.match(r'^[^\wáéíóúñÁÉÍÓÚÑ]+$', line):
        continue

    # In material section, collect materials
    if in_material_section and not in_name_section:
        # Skip short lines (likely not materials)
        if len(line) > 3 and not re.match(r'^[A-Z0-9]+$', line):
            # This looks like a material name (usually uppercase)
            current_materials.append(line)
        elif len(current_materials) > 0:
            # End of material section
            in_material_section = False

    # In name section, match with materials
    if in_name_section and current_materials:
        # Split by spaces to get individual names
        # Names are in the same order as materials
        parts = line.split()
        if len(parts) >= 2:  # At least first + last name
            # Try to extract names - they're separated by spaces but names have multiple words
            # This is tricky because the PDF has names in columns
            # Let's use a different approach: look for patterns like "APELLIDO NOMBRE" repeated
            names = []
            current_name = []
            for part in parts:
                if len(part) <= 3 and part.isupper() and not current_name:
                    # Likely an abbreviation like "MTRO" or "DRA"
                    current_name.append(part)
                elif part.isupper() or (part[0].isupper() and len(part) > 2):
                    current_name.append(part)
                else:
                    if current_name:
                        names.append(" ".join(current_name))
                        current_name = []
                    current_name.append(part)
            if current_name:
                names.append(" ".join(current_name))

            # Match names with materials
            for j, name in enumerate(names):
                if j < len(current_materials):
                    material = current_materials[j]
                    if "MAESTRO POR ASIGNAR" not in name.upper():
                        if name not in teachers_dict:
                            teachers_dict[name] = set()
                        teachers_dict[name].add(material)

# Output the results
print("TEACHERS AND SUBJECTS:")
print("=" * 60)
for name, subjects in sorted(teachers_dict.items()):
    print(f"\n{name}:")
    for subject in sorted(subjects):
        print(f"  - {subject}")

print(f"\n\nTotal unique teachers: {len(teachers_dict)}")
