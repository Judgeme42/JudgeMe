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

    # Check if line1 is a subject (uppercase, long enough) and line2 is a group code
    is_subject = (len(line1) > 3 and
                  re.search(r'[A-ZÁÉÍÓÚÑ]{3,}', line1) and
                  not re.match(r'^[A-Z]\d+[A-Z]?$', line1))

    is_group = re.match(r'^[A-Z]\d+[A-Z]?\d*$', line2) or re.match(r'^\d+[A-Z]+\d*$', line2)

    if is_subject and is_group:
        subject = line1
        group = line2

        # Look ahead for "Nombre" header
        j = i + 2
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

                # Skip names that start with 2-letter codes (FA, FB, etc.)
                if re.match(r'^[A-Z]{2}\s+[A-Z]', name_line):
                    k += 1
                    continue

                # This is a potential name - validate it
                parts = name_line.split()
                if len(parts) >= 2:
                    # All parts should be uppercase (no lowercase except maybe accents)
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
