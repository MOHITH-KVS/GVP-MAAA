import re
import sys

def fix_types(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements for `type = None` in function parameters
    replacements = [
        (r"start_date:\s*date\s*=\s*None", "start_date: Optional[date] = None"),
        (r"end_date:\s*date\s*=\s*None", "end_date: Optional[date] = None"),
        (r"subject_id:\s*int\s*=\s*None", "subject_id: Optional[int] = None"),
        (r"year:\s*int\s*=\s*None", "year: Optional[int] = None"),
        (r"semester:\s*int\s*=\s*None", "semester: Optional[int] = None"),
        (r"section:\s*str\s*=\s*None", "section: Optional[str] = None"),
        (r"department:\s*str\s*=\s*None", "department: Optional[str] = None"),
        (r"faculty_id:\s*int\s*=\s*None", "faculty_id: Optional[int] = None"),
        (r"timetable_type:\s*str\s*=\s*None", "timetable_type: Optional[str] = None"),
        (r"audience:\s*str\s*=\s*None", "audience: Optional[str] = None"),
        (r"role:\s*str\s*=\s*None", "role: Optional[str] = None"),
        (r"year:\s*str\s*=\s*None", "year: Optional[str] = None"),
        (r"semester:\s*str\s*=\s*None", "semester: Optional[str] = None"),
    ]

    for p, r in replacements:
        content = re.sub(p, r, content)

    # Some variables like current_date are accidentally shadowed by datetime module:
    content = content.replace("current_date.append", "current_date_lst.append")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    fix_types(sys.argv[1])
