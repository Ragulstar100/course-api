// ==========================================
// 3. SERVICE LAYER (service/student.service.ts)
// ==========================================

import crypto from 'crypto';
import  type  { Student, RegisterStudentRequest, LoginStudentRequest, UpdateStudentRequest } from '../models/student.model.js';
import { 
  insertStudent, 
  selectStudentByEmail, 
  selectAllStudents, 
  selectStudentById, 
  updateStudentInDb, 
  deleteStudentFromDb 
} from '../dal/student.dal.js';

export async function registerStudent(data: RegisterStudentRequest): Promise<Omit<Student, "passwordHash">> {
  const existing = await selectStudentByEmail(data.email);
  if (existing) {
    throw new Error('Email is already registered');
  }

  const id = crypto.randomUUID();
  const createdDate = new Date().toISOString();
  const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

  const student: Student = {
    id,
    studentName: data.studentName,
    email: data.email,
    passwordHash,
    enrolledCourseId: data.enrolledCourseId,
    studentStatus: "Active",
    createdDate,
  };

  await insertStudent(student);

  const { passwordHash: _, ...studentWithoutPassword } = student;
  return studentWithoutPassword;
}

export async function loginStudent(data: LoginStudentRequest): Promise<Omit<Student, "passwordHash">> {
  const student = await selectStudentByEmail(data.email);
  if (!student) {
    throw new Error('Invalid email or password');
  }

  const hashedPassword = crypto.createHash('sha256').update(data.password).digest('hex');
  if (student.passwordHash !== hashedPassword) {
    throw new Error('Invalid email or password');
  }

  const { passwordHash: _, ...studentWithoutPassword } = student;
  return studentWithoutPassword;
}

export async function fetchAllStudents(): Promise<Omit<Student, "passwordHash">[]> {
  const students = await selectAllStudents();
  return students.map(({ passwordHash: _, ...rest }) => rest);
}

export async function fetchStudentById(id: string): Promise<Omit<Student, "passwordHash"> | null> {
  const student = await selectStudentById(id);
  if (!student) return null;
  const { passwordHash: _, ...rest } = student;
  return rest;
}

export async function modifyStudent(data: UpdateStudentRequest): Promise<Omit<Student, "passwordHash"> | null> {
  const existing = await selectStudentById(data.id);
  if (!existing) return null;

  const updatedFields = {
    studentName: data.studentName ?? existing.studentName,
    email: data.email ?? existing.email,
    enrolledCourseId: data.enrolledCourseId ?? existing.enrolledCourseId,
    studentStatus: data.studentStatus ?? existing.studentStatus,
  };

  const updated = await updateStudentInDb(data.id, updatedFields);
  if (!updated) return null;

  const { passwordHash: _, ...rest } = updated;
  return rest;
}

export async function removeStudent(id: string): Promise<boolean> {
  return deleteStudentFromDb(id);
}