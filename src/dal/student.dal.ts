// ==========================================
// 2. DAL LAYER (dal/student.dal.ts)
// ==========================================

import sqlite3 from 'sqlite3';
import type { Student } from '../models/student.model.js';

const dbFilePath = './courses.db';
const db = new sqlite3.Database(dbFilePath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  }
});

// Initialize Table
db.run(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    studentName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    enrolledCourseId TEXT NOT NULL,
    studentStatus TEXT CHECK(studentStatus IN ('Active', 'Inactive')) NOT NULL,
    createdDate TEXT NOT NULL
  )
`);

export async function insertStudent(student: Student): Promise<Student> {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO students (id, studentName, email, passwordHash, enrolledCourseId, studentStatus, createdDate)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(
      query,
      [student.id, student.studentName, student.email, student.passwordHash, student.enrolledCourseId, student.studentStatus, student.createdDate],
      function (err) {
        if (err) reject(err);
        else resolve(student);
      }
    );
  });
}

export async function selectStudentByEmail(email: string): Promise<Student | null> {
  return new Promise((resolve, reject) => {
    db.get<Student>(`SELECT * FROM students WHERE email = ?`, [email], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export async function selectAllStudents(): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    db.all<Student>(`SELECT * FROM students`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export async function selectStudentById(id: string): Promise<Student | null> {
  return new Promise((resolve, reject) => {
    db.get<Student>(`SELECT * FROM students WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export async function updateStudentInDb(id: string, updatedFields: Omit<Student, "id" | "createdDate" | "passwordHash">): Promise<Student | null> {
  return new Promise((resolve, reject) => {
    const query = `UPDATE students SET studentName = ?, email = ?, enrolledCourseId = ?, studentStatus = ? WHERE id = ?`;
    
    db.run(
      query,
      [updatedFields.studentName, updatedFields.email, updatedFields.enrolledCourseId, updatedFields.studentStatus, id],
      async function (err) {
        if (err) {
          reject(err);
        } else {
          const updated = await selectStudentById(id);
          resolve(updated);
        }
      }
    );
  });
}

export async function deleteStudentFromDb(id: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM students WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve((this.changes ?? 0) > 0);
    });
  });
}