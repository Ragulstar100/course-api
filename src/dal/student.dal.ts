import { dbGet, dbRun, dbAll } from './db.js';
import type { Student } from '../models/student.model.js';

// ==========================================
// DAL FUNCTIONS (Student Database Operations Scoped by Shop)
// ==========================================

export async function insertStudent(student: Student): Promise<Student> {
  const query = `
    INSERT INTO students (id, studentName, email, passwordHash, studentStatus, createdDate, shopifyCustomerId, shop, phone, course, bio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await dbRun(query, [
    student.id,
    student.studentName,
    student.email,
    student.passwordHash,
    student.studentStatus,
    student.createdDate,
    student.shopifyCustomerId || null,
    student.phone || null,
    student.course || null,
    student.bio || null,
  ]);
  return student;
}

export async function selectStudentByEmail(email: string): Promise<Student | null> {
  const query = 'SELECT * FROM students WHERE email = ?';
  return dbGet<Student>(query, [email]);
}

export async function selectAllStudents(): Promise<Student[]> {
  const query = 'SELECT * FROM students WHERE shop = ?';
  return dbAll<Student>(query);
}

export async function selectStudentById(id: string): Promise<Student | null> {
  const query = 'SELECT * FROM students WHERE id = ? AND shop = ?';
  return dbGet<Student>(query, [id]);
}

export async function selectStudentByIdSimple(id: string): Promise<Student | null> {
  const query = 'SELECT * FROM students WHERE id = ?';
  return dbGet<Student>(query, [id]);
}

export async function updateStudentInDb(
  id: string,
  updatedFields: Omit<Student, "id" | "createdDate" | "passwordHash">
): Promise<Student | null> {
  const query = `
    UPDATE students 
    SET studentName = ?, email = ?, studentStatus = ?, shopifyCustomerId = ?, phone = ?, course = ?, bio = ?
    WHERE id = ? AND shop = ?
  `;
  await dbRun(query, [
    updatedFields.studentName,
    updatedFields.email,
    updatedFields.studentStatus,
    updatedFields.shopifyCustomerId || null,
    updatedFields.phone || null,
    updatedFields.course || null,
    updatedFields.bio || null,
    id,
  ]);
  return selectStudentById(id);
}

export async function deleteStudentFromDb(id: string): Promise<boolean> {
  const query = 'DELETE FROM students WHERE id = ?';
  const result = await dbRun(query, [id]);
  return result.changes > 0;
}