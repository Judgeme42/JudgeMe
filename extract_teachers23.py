#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output (using latin-1 encoding)
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="latin-1", errors="ignore") as f:
    content = f.read()

lines = content.split('\n')
teachers = {}

# Simple approach: after "Nombre", look for pairs of (subject, group+name)
i = 0
while i < len(lines):
    line = lines[i].strip()

    if line == "Nombre":
        # Look ahead for subject - group+name pairs
        j = i + 1
        while j < len(lines):
            # Skip empty lines
            while j < len(lines) and not lines[j].strip():
                j += 1

            if j >= len(lines):
                break

            # Check if we hit a major header
            next_line = lines[j].strip()
            if next_line in ["Materia", "Clave", "Grupo", "Salón", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]:
                break

            # This should be a subject
            subject = next_line

            # Skip empty lines
            j += 1
            while j < len(lines) and not lines[j].strip():
                j += 1

            if j >= len(lines):
                break

            # This should be group + name
            group_name_line = lines[j].strip()

            # Check if it matches the pattern "GROUP NAME"
            match = re.match(r'^(\d+[A-Z]\d+[A-Z]?\d*)\s+([A-ZÁÉÍÓÚÑ\s]+)$', group_name_line)
            if match:
                group = match.group(1)
                name = match.group(2).strip()

                # Clean name - remove any numbers
                name = re.sub(r'\d+', '', name).strip()
                name = re.sub(r'\s+', ' ', name)

                # Skip MAESTRO POR ASIGNAR
                if "MAESTRO POR ASIGNAR" not in name.upper():
                    if name and len(name) > 5:
                        print(f"Found: {name} -> {subject}")
                        if name not in teachers:
                            teachers[name] = set()
                        teachers[name].add(subject)

            j += 1

        i = j
    else:
        i += 1

# Output
print("\n\nTEACHERS AND SUBJECTS:")
print("=" * 60)
for name, subjects in sorted(teachers.items()):
    if subjects:
        print(f"\n{name}:")
        for subject in sorted(subjects):
            print(f"  - {subject}")

print(f"\n\nTotal unique teachers: {len(teachers)}")
