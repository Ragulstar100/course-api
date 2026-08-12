import crypto from 'crypto';
// Import DAL functions
import { 
  insertCourse, 
  selectAllCourses, 
  selectCourseById, 
  updateCourseInDb, 
  deleteCourseFromDb 
} from '../dal/cource.dal.js';

// ==========================================
// 1. TYPES & INTERFACES (Import from DAL/types if available)
// ==========================================

export type Course = {
  id: string;
  courseTitle: string;
  description: string;
  instructorName: string;
  category: string;
  duration: string;
  courseStatus: "Active" | "Inactive";
  createdDate: string;
};

export type CreateCourseRequest = Omit<Course, "id" | "createdDate">;

export type UpdateCourseRequest = Partial<Omit<Course, "id" | "createdDate">> & { id: string };



// ==========================================
// 2. SERVICE FUNCTIONS (Business Logic Only)
// ==========================================

export async function createNewCourse(data: CreateCourseRequest): Promise<Course> {
  const id = crypto.randomUUID();
  const createdDate = new Date().toISOString();

  const course: Course = {
    id,
    ...data,
    createdDate,
  };

  return insertCourse(course);
}

export async function fetchAllCourses(): Promise<Course[]> {
  return selectAllCourses();
}

export async function fetchCourseById(id: string): Promise<Course | null> {
  return selectCourseById(id);
}

export async function modifyCourse(data: UpdateCourseRequest): Promise<Course | null> {
  const existing = await selectCourseById(data.id);
  if (!existing) return null;

  const updatedFields = {
    courseTitle: data.courseTitle ?? existing.courseTitle,
    description: data.description ?? existing.description,
    instructorName: data.instructorName ?? existing.instructorName,
    category: data.category ?? existing.category,
    duration: data.duration ?? existing.duration,
    courseStatus: data.courseStatus ?? existing.courseStatus,
  };

  return updateCourseInDb(data.id, updatedFields);
}

export async function removeCourse(id: string): Promise<boolean> {
  return deleteCourseFromDb(id);
}