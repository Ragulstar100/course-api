import crypto from 'crypto';
import type { Course, CreateCourseRequest } from '../models/cource.model.js';
import { 
  insertCourse, 
  selectAllCourses, 
  selectAllActiveCourses,
  selectCourseById, 
  updateCourseInDb, 
  deleteCourseFromDb,
  selectAllCoursesGlobal
} from '../dal/cource.dal.js';

export async function createNewCourse(data: CreateCourseRequest & { shop: string }): Promise<Course> {
  const id = crypto.randomUUID();
  const createdDate = new Date().toISOString();

  if (!data.courseTitle || !data.description || !data.instructorName || !data.category || !data.duration) {
    throw new Error('Missing required course fields');
  }

  const course: Course = {
    id,
    courseTitle: data.courseTitle,
    description: data.description,
    instructorName: data.instructorName,
    category: data.category,
    duration: data.duration,
    courseStatus: data.courseStatus || 'Active',
    createdDate,
    shopifyProductId: data.shopifyProductId || null,
    shop: data.shop,
  };

  return insertCourse(course);
}

export async function fetchAllCourses(shop: string): Promise<Course[]> {
  return selectAllCourses(shop);
}

export async function fetchAllActiveCourses(shop: string): Promise<Course[]> {
  return selectAllActiveCourses(shop);
}

export async function fetchCourseById(id: string, shop: string): Promise<Course | null> {
  return selectCourseById(id, shop);
}

export async function modifyCourse(data: { id: string; shop: string } & Partial<Omit<Course, 'id' | 'shop' | 'createdDate'>>): Promise<Course | null> {
  const existing = await selectCourseById(data.id, data.shop);
  if (!existing) return null;

  return updateCourseInDb(data.id, data, data.shop);
}

export async function removeCourse(id: string, shop: string): Promise<boolean> {
  return deleteCourseFromDb(id, shop);
}

export async function fetchAllCoursesGlobal(): Promise<Course[]> {
  return selectAllCoursesGlobal();
}