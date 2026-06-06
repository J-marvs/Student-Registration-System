-- ============================================================
-- Student Registration System - Database Setup
-- ============================================================

CREATE DATABASE IF NOT EXISTS student_registration;
USE student_registration;

-- ============================================================
-- TABLE DEFINITIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
    department_id   INT AUTO_INCREMENT PRIMARY KEY,
    dept_name       VARCHAR(100) NOT NULL UNIQUE,
    dept_code       VARCHAR(10)  NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS courses (
    course_id       INT AUTO_INCREMENT PRIMARY KEY,
    course_name     VARCHAR(100) NOT NULL,
    course_code     VARCHAR(20)  NOT NULL UNIQUE,
    units           INT          NOT NULL DEFAULT 3,
    department_id   INT,
    CONSTRAINT fk_course_dept FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS students (
    student_id      INT AUTO_INCREMENT PRIMARY KEY,
    student_no      VARCHAR(20)  NOT NULL UNIQUE,
    first_name      VARCHAR(50)  NOT NULL,
    last_name       VARCHAR(50)  NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    birthdate       DATE,
    department_id   INT,
    enrollment_date DATE         NOT NULL DEFAULT (CURDATE()),
    status          ENUM('Active','Inactive','Graduated') NOT NULL DEFAULT 'Active',
    CONSTRAINT fk_student_dept FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id   INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    course_id       INT NOT NULL,
    semester        VARCHAR(20) NOT NULL,
    school_year     VARCHAR(10) NOT NULL,
    grade           DECIMAL(4,2),
    enrolled_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_enroll_student FOREIGN KEY (student_id)
        REFERENCES students(student_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_enroll_course  FOREIGN KEY (course_id)
        REFERENCES courses(course_id)
        ON DELETE CASCADE,
    CONSTRAINT uq_enrollment UNIQUE (student_id, course_id, semester, school_year)
);

CREATE TABLE IF NOT EXISTS audit_log (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    action      VARCHAR(10)  NOT NULL,
    table_name  VARCHAR(50)  NOT NULL,
    record_id   INT          NOT NULL,
    description TEXT,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SAMPLE DATA
-- ============================================================

INSERT IGNORE INTO departments (dept_name, dept_code) VALUES
    ('Computer Science',       'CS'),
    ('Information Technology', 'IT'),
    ('Business Administration','BA'),
    ('Engineering',            'ENG');

INSERT IGNORE INTO courses (course_name, course_code, units, department_id) VALUES
    ('Introduction to Programming',   'CS101', 3, 1),
    ('Data Structures & Algorithms',  'CS201', 3, 1),
    ('Database Management Systems',   'CS301', 3, 1),
    ('Web Development',               'IT101', 3, 2),
    ('Network Fundamentals',          'IT201', 3, 2),
    ('Principles of Management',      'BA101', 3, 3),
    ('Engineering Mathematics',       'ENG101',4, 4);

INSERT IGNORE INTO students (student_no, first_name, last_name, email, birthdate, department_id) VALUES
    ('2024-0001','Catherine Jane','Manansala','catherinemanansala@urs.edu.ph','2024-05345-0',1),
    ('2024-0002','Maria','Santos',  'maria.santos@school.edu', '2003-08-23',2),
    ('2024-0003','Pedro','Reyes',   'pedro.reyes@school.edu',  '2002-11-01',1),
    ('2024-0004','Ana','Gonzales',  'ana.gonzales@school.edu', '2004-01-15',3);

INSERT IGNORE INTO enrollments (student_id, course_id, semester, school_year) VALUES
    (1,1,'1st','2024-2025'),
    (1,2,'1st','2024-2025'),
    (2,4,'1st','2024-2025'),
    (3,1,'1st','2024-2025'),
    (3,3,'1st','2024-2025'),
    (4,6,'1st','2024-2025');

-- ============================================================
-- STORED PROCEDURE: Enroll a student in a course
-- ============================================================

DELIMITER //
DROP PROCEDURE IF EXISTS sp_enroll_student //
CREATE PROCEDURE sp_enroll_student(
    IN  p_student_id  INT,
    IN  p_course_id   INT,
    IN  p_semester    VARCHAR(20),
    IN  p_school_year VARCHAR(10),
    OUT p_message     VARCHAR(200)
)
BEGIN
    DECLARE v_count INT DEFAULT 0;

    -- Check if already enrolled
    SELECT COUNT(*) INTO v_count
    FROM enrollments
    WHERE student_id  = p_student_id
      AND course_id   = p_course_id
      AND semester    = p_semester
      AND school_year = p_school_year;

    IF v_count > 0 THEN
        SET p_message = 'Student is already enrolled in this course.';
    ELSE
        INSERT INTO enrollments (student_id, course_id, semester, school_year)
        VALUES (p_student_id, p_course_id, p_semester, p_school_year);
        SET p_message = 'Enrollment successful.';
    END IF;
END //
DELIMITER ;

-- ============================================================
-- TRIGGER: Log every new student registration
-- ============================================================

DELIMITER //
DROP TRIGGER IF EXISTS trg_after_student_insert //
CREATE TRIGGER trg_after_student_insert
AFTER INSERT ON students
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (action, table_name, record_id, description)
    VALUES (
        'INSERT',
        'students',
        NEW.student_id,
        CONCAT('New student registered: ', NEW.first_name, ' ', NEW.last_name,
               ' (', NEW.student_no, ')')
    );
END //
DELIMITER ;

-- ============================================================
-- TRIGGER: Log student deletions
-- ============================================================

DELIMITER //
DROP TRIGGER IF EXISTS trg_after_student_delete //
CREATE TRIGGER trg_after_student_delete
AFTER DELETE ON students
FOR EACH ROW
BEGIN
    INSERT INTO audit_log (action, table_name, record_id, description)
    VALUES (
        'DELETE',
        'students',
        OLD.student_id,
        CONCAT('Student removed: ', OLD.first_name, ' ', OLD.last_name,
               ' (', OLD.student_no, ')')
    );
END //
DELIMITER ;
