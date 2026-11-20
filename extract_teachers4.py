#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

lines = content.split('\n')
teachers = {}

# Mode 1: After the first page, format is:
# MATERIA (uppercase)
# Grupo (like "6F7C")
# Nombre (teacher name)

i = 0
while i < len(lines) - 2:
    line1 = lines[i].strip()
    line2 = lines[i+1].strip()
    line3 = lines[i+2].strip()

    # Skip empty lines
    if not line1:
        i += 1
        continue

    # Skip headers
    if line1 in ["Materia", "Clave", "Grupo", "Nombre", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Salón"]:
        i += 1
        continue

    # Skip lines that are just times
    if re.match(r'^\d{2}:\d{2}', line1):
        i += 1
        continue

    # Skip lines that are just numbers
    if re.match(r'^\d+$', line1):
        i += 1
        continue

    # Skip page numbers
    if re.match(r'^\d+\s*/\s*\d+$', line1):
        i += 1
        continue

    # Skip lines that look like dates
    if re.match(r'^\d+\s*/\s*\d+\s*/\s*\d+', line1):
        i += 1
        continue

    # Check if line1 is a subject (uppercase, longer than 3 chars)
    # Check if line2 is a group (alphanumeric, short)
    # Check if line3 is a name (has name-like pattern)
    is_subject = (len(line1) > 3 and
                  re.search(r'[A-ZÁÉÍÓÚÑ]{3,}', line1) and
                  not re.match(r'^[A-Z]\d+[A-Z]?$', line1))  # Not a group code

    is_group = re.match(r'^[A-Z]\d+[A-Z]?\d*$', line2) or re.match(r'^\d+[A-Z]+\d*$', line2)

    is_name = (len(line3) > 5 and
               not re.match(r'^\d+$', line3) and
               not re.match(r'^\d{2}:\d{2}', line3) and
               "MAESTRO POR ASIGNAR" not in line3.upper())

    if is_subject and is_group and is_name:
        subject = line1
        name = line3

        # Clean name - remove any numeric codes
        name = re.sub(r'\d+', '', name).strip()

        if name and len(name) > 5:
            if name not in teachers:
                teachers[name] = set()
            teachers[name].add(subject)
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
