#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# The PDF has blocks where:
# Line with "Materia" header
# Next line(s) with material names (uppercase, repeated for columns)
# Line with "Nombre" header
# Next line with teacher names

# Let's find these blocks and extract the pairs
lines = content.split('\n')
teachers = {}

i = 0
while i < len(lines):
    line = lines[i].strip()

    # Look for "Materia" header
    if line == "Materia":
        i += 1
        # Collect materials from next line(s)
        materials = []
        while i < len(lines):
            material_line = lines[i].strip()
            # Skip empty lines or headers
            if not material_line or material_line in ["Clave", "Grupo", "Nombre", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Salón"]:
                i += 1
                continue
            # Stop if we hit a time pattern or just numbers
            if re.match(r'^\d{2}:\d{2}', material_line) or re.match(r'^\d+$', material_line):
                break
            # Stop if we hit "Nombre"
            if material_line == "Nombre":
                break
            # If it looks like materials (uppercase words)
            if re.search(r'[A-Z]{3,}', material_line):
                # Split by spaces - materials are in columns
                parts = material_line.split()
                # Each column is a material
                materials.extend(parts)
                i += 1
            else:
                break

        # Now look for "Nombre" header
        while i < len(lines) and lines[i].strip() != "Nombre":
            i += 1

        if i < len(lines) and lines[i].strip() == "Nombre":
            i += 1
            # Get the names line
            if i < len(lines):
                names_line = lines[i].strip()
                # Skip if empty or contains "MAESTRO POR ASIGNAR"
                if names_line and "MAESTRO POR ASIGNAR" not in names_line.upper():
                    # Split names - they're in the same column order as materials
                    # Names are typically: APELLIDO1 NOMBRE1 APELLIDO2 NOMBRE2 ...
                    parts = names_line.split()

                    # Try to parse names by looking for uppercase sequences
                    names = []
                    current = []
                    for part in parts:
                        # Skip numeric codes
                        if re.match(r'^\d+$', part):
                            if current:
                                names.append(" ".join(current))
                                current = []
                            continue
                        # Skip very short words (likely not part of name)
                        if len(part) < 3:
                            if current:
                                names.append(" ".join(current))
                                current = []
                            continue
                        current.append(part)
                    if current:
                        names.append(" ".join(current))

                    # Match names with materials
                    for j, name in enumerate(names):
                        if j < len(materials):
                            mat = materials[j]
                            if name and len(name) > 3:
                                if name not in teachers:
                                    teachers[name] = set()
                                teachers[name].add(mat)

    i += 1

# Output
print("TEACHERS AND SUBJECTS:")
print("=" * 60)
for name, subjects in sorted(teachers.items()):
    if subjects:
        print(f"\n{name}:")
        for subject in sorted(subjects):
            print(f"  - {subject}")

print(f"\n\nTotal unique teachers: {len(teachers)}")
