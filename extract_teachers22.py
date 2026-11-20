#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output (using latin-1 encoding)
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="latin-1", errors="ignore") as f:
    content = f.read()

lines = content.split('\n')
teachers = {}

# Simple approach: look for pattern where line i is a subject (uppercase words)
# and line i+1 is "GROUP NAME"
i = 0
while i < len(lines) - 1:
    line1 = lines[i].strip()
    line2 = lines[i+1].strip()

    if not line1 or not line2:
        i += 1
        continue

    # Skip headers
    if line1 in ["Materia", "Clave", "Grupo", "Nombre", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Salón"]:
        i += 1
        continue

    # Skip times and numbers
    if re.match(r'^\d{2}:\d{2}', line1) or re.match(r'^\d+$', line1):
        i += 1
        continue

    # Skip page numbers
    if re.match(r'^\d+\s*/\s*\d+$', line1):
        i += 1
        continue

    # Check if line1 looks like a subject (multiple uppercase words, not just codes)
    # Line1 should have at least 2 words, all uppercase
    parts1 = line1.split()
    is_subject = (len(parts1) >= 2 and
                  all(p.isupper() or not p.isalpha() for p in parts1) and
                  not re.match(r'^[A-Z]\d+[A-Z]?$', line1) and
                  len(line1) > 10)

    if is_subject:
        # Check if line2 has pattern "GROUP NAME"
        match = re.match(r'^(\d+[A-Z]\d+[A-Z]?\d*)\s+([A-ZÁÉÍÓÚÑ\s]+)$', line2)
        if match:
            group = match.group(1)
            name = match.group(2).strip()

            # Clean name - remove any numbers
            name = re.sub(r'\d+', '', name).strip()
            name = re.sub(r'\s+', ' ', name)

            # Skip MAESTRO POR ASIGNAR
            if "MAESTRO POR ASIGNAR" not in name.upper():
                if name and len(name) > 5:
                    print(f"Found: {name} -> {line1}")
                    if name not in teachers:
                        teachers[name] = set()
                    teachers[name].add(line1)
            i += 2
            continue

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
