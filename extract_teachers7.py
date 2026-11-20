#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

lines = content.split('\n')
teachers = {}

i = 0
while i < len(lines):
    line = lines[i].strip()

    if not line:
        i += 1
        continue

    # Look for pattern: SUBJECT + GROUP at end of line
    match = re.search(r'([A-ZÁÉÍÓÚÑ\s]+)\s+([A-Z]\d+[A-Z]?\d*)$', line)
    if match:
        subject = match.group(1).strip()
        group = match.group(2).strip()

        # Look ahead for "Nombre" header
        j = i + 1
        while j < len(lines) and lines[j].strip() != "Nombre":
            j += 1

        if j < len(lines) and lines[j].strip() == "Nombre":
            # Look for names after Nombre
            k = j + 1
            while k < len(lines):
                name_line = lines[k].strip()

                # Stop at next major header
                if name_line in ["Materia", "Clave", "Grupo", "Salón"]:
                    break

                # Skip empty lines, times, numbers
                if not name_line or re.match(r'^\d{2}:\d{2}', name_line) or re.match(r'^\d+$', name_line):
                    k += 1
                    continue

                # Skip MAESTRO POR ASIGNAR
                if "MAESTRO POR ASIGNAR" in name_line.upper():
                    k += 1
                    continue

                # Skip days of week
                if name_line in ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]:
                    k += 1
                    continue

                # Skip lines with colons (like time ranges or labels)
                if ":" in name_line and re.match(r'^[A-Z]', name_line):
                    k += 1
                    continue

                # Skip lines that are too short
                if len(name_line) < 5:
                    k += 1
                    continue

                # This is a potential name - validate it
                # Names should be: APELLIDO APELLIDO NOMBRE (at least 2 parts)
                parts = name_line.split()
                if len(parts) >= 2:
                    # All parts should be uppercase (no lowercase except maybe accents)
                    # Check if most parts are uppercase
                    uppercase_count = sum(1 for p in parts if p.isupper())
                    if uppercase_count >= len(parts) * 0.7:
                        name = re.sub(r'\d+', '', name_line).strip()
                        name = re.sub(r'\s+', ' ', name)

                        if name and len(name) > 5:
                            if name not in teachers:
                                teachers[name] = set()
                            teachers[name].add(subject)

                k += 1

            i = k  # Continue from after this block
        else:
            i += 1
    else:
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
