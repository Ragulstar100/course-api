// ==========================================
// 3. SERVICE LAYER (service/student.service.ts)
// ==========================================

import crypto from 'crypto';
import type { Student, CreateStudentRequest, UpdateStudentRequest } from '../models/student.model.js';
import { 
  insertStudent, 
  selectAllStudents, 
  selectStudentById, 
  updateStudentInDb, 
  deleteStudentFromDb 
} from '../dal/student.dal.js';

export async function createNewStudent(data: CreateStudentRequest): Promise<Student> {
  const id = crypto.randomUUID();
  const createdDate = new Date().toISOString();

  const student: Student = {
    id,
    ...data,
    createdDate,
  };

  return insertStudent(student);
}

export async function fetchAllStudents(): Promise<Student[]> {
  return selectAllStudents();
}

export async function fetchStudentById(id: string): Promise<Student | null> {
  return selectStudentById(id);
}

export async function modifyStudent(data: UpdateStudentRequest): Promise<Student | null> {
  const existing = await selectStudentById(data.id);
  if (!existing) return null;

  const updatedFields = {
    studentName: data.studentName ?? existing.studentName,
    email: data.email ?? existing.email,
    age: data.age ?? existing.age,
    enrolledCourseId: data.enrolledCourseId ?? existing.enrolledCourseId,
    studentStatus: data.studentStatus ?? existing.studentStatus,
  };

  return updateStudentInDb(data.id, updatedFields);
}

export async function removeStudent(id: string): Promise<boolean> {
  return deleteStudentFromDb(id);
}

export type { UpdateStudentRequest };