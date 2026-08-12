import sqlite3 from 'sqlite3';
import type { Course } from '../models/cource.model.js'; // Adjust path to your types if needed

// ==========================================
// DATABASE INITIALIZATION
// ==========================================

const dbFilePath = './courses.db';
const db = new sqlite3.Database(dbFilePath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  }
});

// Initialize Table
db.run(`
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    courseTitle TEXT NOT NULL,
    description TEXT NOT NULL,
    instructorName TEXT NOT NULL,
    category TEXT NOT NULL,
    duration TEXT NOT NULL,
    courseStatus TEXT CHECK(courseStatus IN ('Active', 'Inactive')) NOT NULL,
    createdDate TEXT NOT NULL
  )
`);

// ==========================================
// DAL FUNCTIONS (Database Operations Only)
// ==========================================

export async function insertCourse(course: Course): Promise<Course> {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO courses (id, courseTitle, description, instructorName, category, duration, courseStatus, createdDate)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(
      query,
      [course.id, course.courseTitle, course.description, course.instructorName, course.category, course.duration, course.courseStatus, course.createdDate],
      function (err) {
        if (err) reject(err);
        else resolve(course);
      }
    );
  });
}

export async function selectAllCourses(): Promise<Course[]> {
  return new Promise((resolve, reject) => {
    db.all<Course>(`SELECT * FROM courses`, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export async function selectCourseById(id: string): Promise<Course | null> {
  return new Promise((resolve, reject) => {
    db.get<Course>(`SELECT * FROM courses WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export async function updateCourseInDb(id: string, updatedFields: Omit<Course, "id" | "createdDate">): Promise<Course | null> {
  return new Promise((resolve, reject) => {
    const query = `UPDATE courses SET courseTitle = ?, description = ?, instructorName = ?, category = ?, duration = ?, courseStatus = ? WHERE id = ?`;
    
    db.run(
      query,
      [updatedFields.courseTitle, updatedFields.description, updatedFields.instructorName, updatedFields.category, updatedFields.duration, updatedFields.courseStatus, id],
      async function (err) {
        if (err) {
          reject(err);
        } else {
          const updated = await selectCourseById(id);
          resolve(updated);
        }
      }
    );
  });
}

export async function deleteCourseFromDb(id: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    db.run(`DELETE FROM courses WHERE id = ?`, [id], function (err) {
      if (err) reject(err);
      else resolve((this.changes ?? 0) > 0);
    });
  });
}