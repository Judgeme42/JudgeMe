#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output (using latin-1 encoding)
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="latin-1", errors="ignore") as f:
    content = f.read()

lines = content.split('\n')
teachers = {}

# Find all (subject, group) pairs first
pairs = []
i = 0
while i < len(lines):
    line = lines[i].strip()

    if not line:
        i += 1
        continue

    # Skip headers
    if line in ["Materia", "Clave", "Grupo", "Nombre", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Salón"]:
        i += 1
        continue

    # Skip times and numbers
    if re.match(r'^\d{2}:\d{2}', line) or re.match(r'^\d+$', line):
        i += 1
        continue

    # Skip page numbers
    if re.match(r'^\d+\s*/\s*\d+$', line):
        i += 1
        continue

    # Check if this line is a subject (uppercase, long enough)
    is_subject = (len(line) > 3 and
                  re.search(r'[A-ZÁÉÍÓÚÑ]{3,}', line) and
                  not re.match(r'^[A-Z]\d+[A-Z]?$', line))

    if is_subject:
        # First, check if the group is on the same line
        match = re.search(r'([A-ZÁÉÍÓÚÑ\s]+)\s+([A-Z]\d+[A-Z]?\d*)$', line)
        if match:
            subject = match.group(1).strip()
            group = match.group(2).strip()
            pairs.append((i, subject, group))
            print(f"Found pair at line {i} (same line): subject='{subject}', group='{group}'")
            i += 1
            continue

        # Otherwise, look ahead for a group code (skip empty lines)
        subject = line
        j = i + 1
        while j < len(lines):
            next_line = lines[j].strip()
            if not next_line:
                j += 1
                continue
            # Check if this is a group code
            is_group = re.match(r'^[A-Z]\d+[A-Z]?\d*$', next_line) or re.match(r'^\d+[A-Z]+\d*$', next_line)
            if is_group:
                group = next_line
                pairs.append((i, subject, group))
                print(f"Found pair at line {i} (next line): subject='{subject}', group='{group}'")
                i = j + 1
                break
            else:
                # Not a group, this subject doesn't have a group
                i += 1
                break
        else:
            i += 1
    else:
        i += 1

print(f"\nTotal pairs found: {len(pairs)}")

# Now for each pair, find the names
for line_idx, subject, group in pairs:
    # Look ahead for "Nombre" header
    j = line_idx + 1
    while j < len(lines) and lines[j].strip() != "Nombre":
        j += 1

    if j < len(lines) and lines[j].strip() == "Nombre":
        print(f"  Found Nombre at line {j} for subject '{subject}'")
        # Look for names after Nombre
        m = j + 1
        while m < len(lines):
            name_line = lines[m].strip()

            # Stop at next major header
            if name_line in ["Materia", "Clave", "Grupo", "Salón"]:
                break

            # Skip empty lines
            if not name_line:
                m += 1
                continue

            # Skip days of week
            if name_line in ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]:
                m += 1
                continue

            # Skip lines that are just times
            if re.match(r'^\d{2}:\d{2}', name_line):
                m += 1
                continue

            # Skip lines that are just numbers
            if re.match(r'^\d+$', name_line):
                m += 1
                continue

            # Skip MAESTRO POR ASIGNAR
            if "MAESTRO POR ASIGNAR" in name_line.upper():
                m += 1
                continue

            # Skip lines with colons (like time ranges or labels)
            if ":" in name_line and re.match(r'^[A-Z]', name_line):
                m += 1
                continue

            # Skip lines that are too short
            if len(name_line) < 5:
                m += 1
                continue

            # Skip names that start with 2-letter codes (FA, FB, etc.)
            if re.match(r'^[A-Z]{2}\s+[A-Z]', name_line):
                m += 1
                continue

            # This is a potential name - validate it
            # Extract name, removing any time that might be on the same line
            name_with_time = re.sub(r'\d{2}:\d{2}\s*-\s*\d{2}:\d{2}', '', name_line).strip()
            name = re.sub(r'\d+', '', name_with_time).strip()
            name = re.sub(r'\s+', ' ', name)

            parts = name.split()
            if len(parts) >= 2:
                # All parts should be uppercase (no lowercase except maybe accents)
                uppercase_count = sum(1 for p in parts if p.isupper())
                if uppercase_count >= len(parts) * 0.7:
                    if name and len(name) > 5:
                        print(f"    Adding: {name} -> {subject}")
                        if name not in teachers:
                            teachers[name] = set()
                        teachers[name].add(subject)

            m += 1

# Output
print("\n\nTEACHERS AND SUBJECTS:")
print("=" * 60)
for name, subjects in sorted(teachers.items()):
    if subjects:
        print(f"\n{name}:")
        for subject in sorted(subjects):
            print(f"  - {subject}")

print(f"\n\nTotal unique teachers: {len(teachers)}")
