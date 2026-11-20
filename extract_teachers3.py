#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# The PDF has sections where each teacher is listed with their subject
# Format: subject on one line, teacher name on next line, group on next
# Let's find pairs where we have:
# Line 1: Subject (uppercase)
# Line 2: Name (Title + Lastname + Firstname)
# Line 3: Group (like "4C4B")

lines = content.split('\n')
teachers = {}

i = 0
while i < len(lines) - 2:
    line1 = lines[i].strip()
    line2 = lines[i+1].strip()
    line3 = lines[i+2].strip()

    # Skip if any line is empty
    if not line1 or not line2:
        i += 1
        continue

    # Skip "MAESTRO POR ASIGNAR"
    if "MAESTRO POR ASIGNAR" in line2.upper():
        i += 1
        continue

    # Skip headers
    if line1 in ["Materia", "Clave", "Grupo", "Nombre", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Salón"]:
        i += 1
        continue

    # Skip lines that are just times
    if re.match(r'^\d{2}:\d{2}', line1) or re.match(r'^\d{2}:\d{2}', line2):
        i += 1
        continue

    # Skip lines that are just numbers
    if re.match(r'^\d+$', line1) or re.match(r'^\d+$', line2):
        i += 1
        continue

    # Skip lines that look like page numbers
    if re.match(r'^\d+\s*/\s*\d+$', line1) or re.match(r'^\d+\s*/\s*\d+$', line2):
        i += 1
        continue

    # Check if line1 looks like a subject (uppercase, maybe multiple words)
    # and line2 looks like a name (starts with title like MTRO, MTRA, DR, DRA or uppercase name)
    is_subject = re.search(r'[A-ZÁÉÍÓÚÑ]{3,}', line1) and len(line1) > 3
    is_name = (line2.startswith(("MTRO", "MTRA", "DR", "DRA", "ING", "LIC")) or
               (re.match(r'^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+\s+[A-ZÁÉÍÓÚÑ]', line2) and len(line2.split()) >= 2))

    # Also check if line3 looks like a group code (letter + numbers)
    is_group = re.match(r'^[A-Z]\d+[A-Z]?\d*$', line3) or re.match(r'^\d+[A-Z]+\d*$', line3)

    if is_subject and is_name and is_group:
        # Found a match
        subject = line1
        name = line2

        # Clean up the name - remove any numeric codes
        name = re.sub(r'\d+', '', name).strip()

        if name and len(name) > 5:
            if name not in teachers:
                teachers[name] = set()
            teachers[name].add(subject)
            # Skip ahead
            i += 3
            continue

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
