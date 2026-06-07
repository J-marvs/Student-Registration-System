"""
Student Registration System - Flask Backend
Run: python app.py
Requires: pip install flask flask-cors pymysql
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import pymysql.cursors
import re

app = Flask(__name__)
CORS(app)

# ── Database config ────────────────────────────────────────────
import os

DB_CONFIG = {
    "host":     os.environ.get("MYSQLHOST", "localhost"),
    "user":     os.environ.get("MYSQLUSER", "root"),
    "password": os.environ.get("MYSQLPASSWORD", "root1234"),
    "database": os.environ.get("MYSQLDATABASE", "student_registration"),
    "port":     int(os.environ.get("MYSQLPORT", 3306))
}

def get_db():
    return pymysql.connect(**DB_CONFIG, cursorclass=pymysql.cursors.DictCursor)


# ══════════════════════════════════════════════════════════════
# STUDENTS
# ══════════════════════════════════════════════════════════════

@app.route("/students", methods=["GET"])
def get_students():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        SELECT s.student_id, s.student_no, s.first_name, s.last_name,
               s.email, s.birthdate, s.enrollment_date, s.status,
               d.dept_name
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.department_id
        ORDER BY s.student_id DESC
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        for k in ("birthdate", "enrollment_date"):
            if r[k]:
                r[k] = str(r[k])
    return jsonify(rows)


@app.route("/students", methods=["POST"])
def add_student():
    data = request.json
    required = ("student_no","first_name","last_name","email","department_id")
    if not all(data.get(f) for f in required):
        return jsonify({"error": "Missing required fields"}), 400
    if not re.match(r"[^@]+@[^@]+\.[^@]+", data["email"]):
        return jsonify({"error": "Invalid email address"}), 400
    conn = get_db()
    cur  = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO students
                (student_no, first_name, last_name, email, birthdate, department_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            data["student_no"], data["first_name"], data["last_name"],
            data["email"], data.get("birthdate") or None,
            data["department_id"]
        ))
        conn.commit()
        return jsonify({"message": "Student added", "id": cur.lastrowid}), 201
    except pymysql.IntegrityError as e:
        return jsonify({"error": str(e)}), 409
    finally:
        cur.close(); conn.close()


@app.route("/students/<int:sid>", methods=["PUT"])
def update_student(sid):
    data = request.json
    conn = get_db()
    cur  = conn.cursor()
    try:
        cur.execute("""
            UPDATE students
            SET first_name    = %s,
                last_name     = %s,
                email         = %s,
                birthdate     = %s,
                department_id = %s,
                status        = %s
            WHERE student_id = %s
        """, (
            data["first_name"], data["last_name"], data["email"],
            data.get("birthdate") or None,
            data["department_id"], data.get("status","Active"), sid
        ))
        conn.commit()
        return jsonify({"message": "Student updated"})
    finally:
        cur.close(); conn.close()


@app.route("/students/<int:sid>", methods=["DELETE"])
def delete_student(sid):
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("DELETE FROM students WHERE student_id = %s", (sid,))
    conn.commit()
    cur.close(); conn.close()
    return jsonify({"message": "Student deleted"})


# ══════════════════════════════════════════════════════════════
# DEPARTMENTS
# ══════════════════════════════════════════════════════════════

@app.route("/departments", methods=["GET"])
def get_departments():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM departments ORDER BY dept_name")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)


# ══════════════════════════════════════════════════════════════
# COURSES
# ══════════════════════════════════════════════════════════════

@app.route("/courses", methods=["GET"])
def get_courses():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        SELECT c.course_id, c.course_name, c.course_code, c.units,
               d.dept_name
        FROM courses c
        LEFT JOIN departments d ON c.department_id = d.department_id
        ORDER BY c.course_code
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    return jsonify(rows)


# ══════════════════════════════════════════════════════════════
# ENROLLMENTS
# ══════════════════════════════════════════════════════════════

@app.route("/enrollments", methods=["GET"])
def get_enrollments():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("""
        SELECT e.enrollment_id,
               CONCAT(s.first_name,' ',s.last_name) AS student_name,
               s.student_no,
               c.course_name, c.course_code,
               e.semester, e.school_year, e.grade,
               e.enrolled_at
        FROM enrollments e
        JOIN students s ON e.student_id = s.student_id
        JOIN courses  c ON e.course_id  = c.course_id
        ORDER BY e.enrolled_at DESC
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        if r["enrolled_at"]:
            r["enrolled_at"] = str(r["enrolled_at"])
    return jsonify(rows)


@app.route("/enrollments", methods=["POST"])
def enroll_student():
    data = request.json
    conn = get_db()
    cur  = conn.cursor()
    try:
        cur.callproc("sp_enroll_student", [
            data["student_id"], data["course_id"],
            data["semester"], data["school_year"], ""
        ])
        conn.commit()
        cur.execute("SELECT @_sp_enroll_student_4")
        row = cur.fetchone()
        msg = list(row.values())[0] if row else "Enrollment successful."
        if "already" in (msg or ""):
            return jsonify({"error": msg}), 409
        return jsonify({"message": msg}), 201
    finally:
        cur.close(); conn.close()


@app.route("/enrollments/<int:eid>", methods=["DELETE"])
def drop_enrollment(eid):
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("DELETE FROM enrollments WHERE enrollment_id = %s", (eid,))
    conn.commit()
    cur.close(); conn.close()
    return jsonify({"message": "Enrollment dropped"})


# ══════════════════════════════════════════════════════════════
# AUDIT LOG
# ══════════════════════════════════════════════════════════════

@app.route("/audit", methods=["GET"])
def get_audit():
    conn = get_db()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 50")
    rows = cur.fetchall()
    cur.close(); conn.close()
    for r in rows:
        if r["created_at"]:
            r["created_at"] = str(r["created_at"])
    return jsonify(rows)


# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
