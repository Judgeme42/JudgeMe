#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the pdftotext output
overflow_file = r"C:\Users\krisa\AppData\Local\Temp\devin.exe-overflows\shell-9394ff-3eaaeb2b06230fc2\content.txt"

with open(overflow_file, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

lines = content.split('\n')
teachers = {}

# First pass: find all (subject, group) pairs where they appear on the same line
# Format: "MATERIA XYZ 5A3C" (subject followed by group code)
subject_groups = []
for i, line in enumerate(lines):
    line = line.strip()
    if not line:
        continue

    # Skip headers
    if line in ["Materia", "Clave", "Grupo", "Nombre", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Salón"]:
        continue

    # Skip lines that are just times
    if re.match(r'^\d{2}:\d{2}', line):
        continue

    # Skip lines that are just numbers
    if re.match(r'^\d+$', line):
        continue

    # Skip page numbers
    if re.match(r'^\d+\s*/\s*\d+$', line):
        continue

    # Look for pattern: SUBJECT(s) GROUPCODE at end
    # Group codes are like: 5A3C, 2A3A, 6F7C, etc.
    match = re.search(r'([A-ZÁÉÍÓÚÑ\s]+)\s+([A-Z]\d+[A-Z]?\d*)$', line)
    if match:
        subject = match.group(1).strip()
        group = match.group(2).strip()
        if len(subject) > 3:
            subject_groups.append((i, subject, group))

# Second pass: find names after "Nombre" header and match with subjects
for i, line in enumerate(lines):
    line = line.strip()

    if line == "Nombre":
        # Look ahead for the subject assignments
        # The pattern is: after Nombre, we have day headers, then subjects with times, then names
        j = i + 1
        current_subjects = []
        current_groups = []

        # Skip to the first real line after Nombre
        while j < len(lines) and (not lines[j].strip() or lines[j].strip() in ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]):
            j += 1

        # Now look for patterns of: NAME, then times on next line
        while j < len(lines):
            name_line = lines[j].strip()
            if not name_line:
                j += 1
                continue

            # Stop if we hit another header
            if name_line in ["Materia", "Clave", "Grupo", "Nombre", "Salón"]:
                break

            # Stop if we hit "MAESTRO POR ASIGNAR"
            if "MAESTRO POR ASIGNAR" in name_line.upper():
                j += 1
                continue

            # Check if this looks like a name
            # Names are typically: APELLIDO1 NOMBRE1 (or with titles)
            if len(name_line) > 5 and not re.match(r'^\d{2}:\d{2}', name_line) and not re.match(r'^\d+$', name_line):
                # This is a name line
                # The next line(s) should have times
                k = j + 1
                times = []
                while k < len(lines):
                    time_line = lines[k].strip()
                    if re.match(r'^\d{2}:\d{2}', time_line):
                        times.append(time_line)
                        k += 1
                    else:
                        break

                # Extract the subject from the subject_groups list based on context
                # For now, just extract all names and we'll try to match later
                if "MAESTRO POR ASIGNAR" not in name_line.upper():
                    # Store the name with any times info
                    pass

            j += 1

# Let's try a simpler approach: look for the format where:
# Line: "MATERIA GROUP"
# Line: "Nombre"
# Line: "NAME" (with times on next line)

# Reset and try again
teachers = {}
current_subject = None
current_group = None

for i, line in enumerate(lines):
    line = line.strip()

    if not line:
        continue

    # Match subject + group on same line
    match = re.search(r'([A-ZÁÉÍÓÚÑ\s]+)\s+([A-Z]\d+[A-Z]?\d*)$', line)
    if match:
        current_subject = match.group(1).strip()
        current_group = match.group(2).strip()
        continue

    # After "Nombre", look for teacher names
    if line == "Nombre":
        # Look ahead for names
        j = i + 1
        while j < len(lines):
            name_line = lines[j].strip()
            if not name_line:
                j += 1
                continue

            # Stop at next header
            if name_line in ["Materia", "Clave", "Grupo", "Nombre", "Salón"]:
                break

            # Skip MAESTRO POR ASIGNAR
            if "MAESTRO POR ASIGNAR" in name_line.upper():
                j += 1
                continue

            # Skip times
            if re.match(r'^\d{2}:\d{2}', name_line):
                j += 1
                continue

            # Skip just numbers
            if re.match(r'^\d+$', name_line):
                j += 1
                continue

            # If we have a current subject and this looks like a name
            if current_subject and len(name_line) > 5:
                # Clean name
                name = re.sub(r'\d+', '', name_line).strip()
                name = re.sub(r'\s+', ' ', name)

                if name and len(name) > 5:
                    if name not in teachers:
                        teachers[name] = set()
                    teachers[name].add(current_subject)

            j += 1

        # Reset after processing a block
        current_subject = None
        current_group = None

# Output
print("TEACHERS AND SUBJECTS:")
print("=" * 60)
for name, subjects in sorted(teachers.items()):
    if subjects:
        print(f"\n{name}:")
        for subject in sorted(subjects):
            print(f"  - {subject}")

print(f"\n\nTotal unique teachers: {len(teachers)}")
