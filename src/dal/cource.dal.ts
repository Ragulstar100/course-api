import { dbGet, dbRun, dbAll } from './db.js';
import type { Course } from '../models/cource.model.js';

// ==========================================
// DAL FUNCTIONS (Database Operations Scoped by Shop)
// ==========================================

export async function insertCourse(course: Course): Promise<Course> {
  const query = `
    INSERT INTO courses (id, courseTitle, description, instructorName, category, duration, courseStatus, createdDate, shopifyProductId, shop)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await dbRun(query, [
    course.id,
    course.courseTitle,
    course.description,
    course.instructorName,
    course.category,
    course.duration,
    course.courseStatus,
    course.createdDate,
    course.shopifyProductId || null,
    course.shop,
  ]);
  return course;
}

export async function selectAllCourses(shop: string): Promise<Course[]> {
  const query = 'SELECT * FROM courses WHERE shop = ?';
  return dbAll<Course>(query, [shop]);
}

export async function selectAllActiveCourses(shop: string): Promise<Course[]> {
  const query = "SELECT * FROM courses WHERE shop = ? AND courseStatus = 'Active'";
  return dbAll<Course>(query, [shop]);
}

export async function selectCourseById(id: string, shop: string): Promise<Course | null> {
  const query = 'SELECT * FROM courses WHERE id = ? AND shop = ?';
  return dbGet<Course>(query, [id, shop]);
}

export async function selectCourseByIdSimple(id: string): Promise<Course | null> {
  const query = 'SELECT * FROM courses WHERE id = ?';
  return dbGet<Course>(query, [id]);
}

export async function updateCourseInDb(
  id: string,
  updatedFields: Partial<Omit<Course, "id" | "createdDate" | "shop">>,
  shop: string
): Promise<Course | null> {
  const existing = await selectCourseById(id, shop);
  if (!existing) return null;

  const title = updatedFields.courseTitle !== undefined ? updatedFields.courseTitle : existing.courseTitle;
  const desc = updatedFields.description !== undefined ? updatedFields.description : existing.description;
  const inst = updatedFields.instructorName !== undefined ? updatedFields.instructorName : existing.instructorName;
  const cat = updatedFields.category !== undefined ? updatedFields.category : existing.category;
  const dur = updatedFields.duration !== undefined ? updatedFields.duration : existing.duration;
  const status = updatedFields.courseStatus !== undefined ? updatedFields.courseStatus : existing.courseStatus;
  const prodId = updatedFields.shopifyProductId !== undefined ? updatedFields.shopifyProductId : existing.shopifyProductId;

  const query = `
    UPDATE courses 
    SET courseTitle = ?, description = ?, instructorName = ?, category = ?, duration = ?, courseStatus = ?, shopifyProductId = ?
    WHERE id = ? AND shop = ?
  `;

  await dbRun(query, [title, desc, inst, cat, dur, status, prodId || null, id, shop]);
  return selectCourseById(id, shop);
}

export async function deleteCourseFromDb(id: string, shop: string): Promise<boolean> {
  const query = 'DELETE FROM courses WHERE id = ? AND shop = ?';
  const result = await dbRun(query, [id, shop]);
  return result.changes > 0;
}