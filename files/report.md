# Student Registration System — Short Report

---

## 1. Application Identified
**Student Registration System** — manages student records, course offerings, and enrollments for a school.

---

## 2. Entity-Relationship Diagram (ERD)

```
┌──────────────────┐         ┌──────────────────┐
│   DEPARTMENTS    │         │    COURSES       │
│──────────────────│         │──────────────────│
│ PK department_id │◄────────│ PK course_id     │
│    dept_name     │  1   N  │    course_name   │
│    dept_code     │         │    course_code   │
└──────────────────┘         │    units         │
         ▲                   │ FK department_id │
         │ 1                 └──────────────────┘
         │                            ▲
         │ N                          │ N
┌──────────────────┐         ┌────────┴─────────┐
│    STUDENTS      │         │   ENROLLMENTS    │
│──────────────────│    M    │──────────────────│
│ PK student_id    │◄────────│ PK enrollment_id │
│    student_no    │         │ FK student_id    │
│    first_name    │         │ FK course_id     │
│    last_name     │         │    semester      │
│    email         │         │    school_year   │
│    birthdate     │         │    grade         │
│ FK department_id │         │    enrolled_at   │
│    status        │         └──────────────────┘
└──────────────────┘
                                  triggers ↓
                             ┌──────────────────┐
                             │   AUDIT_LOG      │
                             │──────────────────│
                             │ PK log_id        │
                             │    action        │
                             │    table_name    │
                             │    record_id     │
                             │    description   │
                             │    created_at    │
                             └──────────────────┘
```

### Relationships
| Relationship | Type |
|---|---|
| Department → Students | One-to-Many |
| Department → Courses | One-to-Many |
| Students ↔ Courses (via Enrollments) | Many-to-Many |
| Students → Audit Log (via trigger) | Automatic logging |

---

## 3. Database Schema

```sql
departments  (department_id PK, dept_name UNIQUE, dept_code UNIQUE)
courses      (course_id PK, course_name, course_code UNIQUE, units, department_id FK)
students     (student_id PK, student_no UNIQUE, first_name, last_name,
              email UNIQUE, birthdate, department_id FK, enrollment_date, status)
enrollments  (enrollment_id PK, student_id FK, course_id FK,
              semester, school_year, grade, enrolled_at,
              UNIQUE(student_id, course_id, semester, school_year))
audit_log    (log_id PK, action, table_name, record_id, description, created_at)
```

---

## 4. SQL Queries (CRUD Operations)

### CREATE
```sql
-- Insert a student
INSERT INTO students (student_no, first_name, last_name, email, department_id)
VALUES ('2024-0005', 'Jose', 'Rizal', 'jose@school.edu', 1);

-- Enroll a student in a course
INSERT INTO enrollments (student_id, course_id, semester, school_year)
VALUES (1, 3, '1st', '2024-2025');
```

### READ
```sql
-- Get all students with department
SELECT s.student_no, s.first_name, s.last_name, d.dept_name
FROM students s
LEFT JOIN departments d ON s.department_id = d.department_id;

-- Get all enrollments for a student
SELECT c.course_code, c.course_name, e.semester, e.school_year
FROM enrollments e
JOIN courses c ON e.course_id = c.course_id
WHERE e.student_id = 1;
```

### UPDATE
```sql
-- Update student status
UPDATE students SET status = 'Graduated' WHERE student_id = 1;

-- Assign a grade
UPDATE enrollments SET grade = 1.50
WHERE student_id = 1 AND course_id = 2;
```

### DELETE
```sql
-- Delete a student (triggers audit log)
DELETE FROM students WHERE student_id = 5;

-- Drop an enrollment
DELETE FROM enrollments WHERE enrollment_id = 3;
```

---

## 5. Stored Procedure

```sql
-- sp_enroll_student: prevents duplicate enrollment
CALL sp_enroll_student(1, 3, '1st', '2024-2025', @msg);
SELECT @msg;
```

---

## 6. Triggers

| Trigger | Event | Action |
|---|---|---|
| `trg_after_student_insert` | AFTER INSERT on students | Logs new registration to audit_log |
| `trg_after_student_delete` | AFTER DELETE on students | Logs removal to audit_log |

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Database | MySQL |
| Backend | Python 3 + Flask + flask-cors |
| Frontend | Standalone HTML + CSS + JavaScript (Fetch API) |

---

## 8. How to Run

1. **Database** — run `setup_database.sql` in MySQL Workbench or terminal:
   ```bash
   mysql -u root -p < setup_database.sql
   ```

2. **Backend** — install dependencies and start the server:
   ```bash
   pip install flask flask-cors mysql-connector-python
   # Edit DB_CONFIG password in app.py first!
   python app.py
   ```

3. **Frontend** — simply open `index.html` in any browser (no server needed).

---
