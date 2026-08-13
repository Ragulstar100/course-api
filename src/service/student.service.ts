import crypto from 'crypto';
import type { 
  Student, 
  RegisterStudentRequest, 
  LoginStudentRequest, 
  UpdateStudentRequest,
  StudentAuthResponse
} from '../models/student.model.js';
import { 
  insertStudent, 
  selectStudentByEmail, 
  selectAllStudents, 
  selectStudentById, 
  updateStudentInDb, 
  deleteStudentFromDb 
} from '../dal/student.dal.js';
import { 
  insertEnrollment, 
  selectEnrollmentsByStudent, 
  selectAllEnrollments, 
  selectRecentEnrollments,
  updateEnrollmentStatusInDb, 
  deleteEnrollmentFromDb,
  getMerchantDashboardMetrics
} from '../dal/enrollment.dal.js';
import { signJwt } from '../middleware/auth.middleware.js';
import { shopifyConfig } from '../../config.js';
// ==========================================
// STUDENT SERVICES
// ==========================================

export async function registerStudent(data: RegisterStudentRequest): Promise<StudentAuthResponse> {
  const shop = data.shop.trim().toLowerCase();
  
  const existing = await selectStudentByEmail(data.email, shop);
  if (existing) {
    throw new Error('Email is already registered on this store');
  }

  const id = crypto.randomUUID();
  const createdDate = new Date().toISOString();
  const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

  

  const student: Student = {
    id,
    studentName: data.studentName,
    email: data.email,
    passwordHash,
    studentStatus: "Active",
    createdDate,
    shop,
    phone: null,
    course: null,
    bio: null,
  };

  await insertStudent(student);


  // Generate JWT token
  const token = signJwt({ studentId: id, shop }, shopifyConfig.jwtSecret, 2592000); // 30 days

  return {
    id: student.id,
    studentName: student.studentName,
    email: student.email,
    studentStatus: student.studentStatus,
    createdDate: student.createdDate,
    shopifyCustomerId: student.shopifyCustomerId || null,
    shop: student.shop,
    token,
    phone: student.phone || null,
    course: student.course || null,
    bio: student.bio || null,
  };
}



export async function loginStudent(data: LoginStudentRequest): Promise<StudentAuthResponse> {
  const shop = data.shop.trim().toLowerCase();

  // Hardcoded Admin login check
  if (data.email === 'test' && data.password === 'test') {
    return {
      id: 'admin_id',
      studentName: 'Admin Test',
      email: 'test',
      studentStatus: 'Active',
      createdDate: new Date().toISOString(),
      shop: shop,
      token: 'mock_admin_token',
      phone: null,
      course: null,
      bio: null,
      isAdmin: true,
    };
  }

  const student = await selectStudentByEmail(data.email, shop);
  
  if (!student) {
    throw new Error('Invalid email or password');
  }

  const hashedPassword = crypto.createHash('sha256').update(data.password).digest('hex');
  if (student.passwordHash !== hashedPassword) {
    throw new Error('Invalid email or password');
  }

  if (student.studentStatus !== 'Active') {
    throw new Error('Your student account is inactive. Please contact store support.');
  }

  const token = signJwt({ studentId: student.id, shop: student.shop }, shopifyConfig.jwtSecret, 2592000);

  return {
    id: student.id,
    studentName: student.studentName,
    email: student.email,
    studentStatus: student.studentStatus,
    createdDate: student.createdDate,
    shopifyCustomerId: student.shopifyCustomerId || null,
    shop: student.shop,
    token,
    phone: student.phone || null,
    course: student.course || null,
    bio: student.bio || null,
  };
}

export async function fetchAllStudents(shop: string): Promise<Omit<Student, "passwordHash">[]> {
  const students = await selectAllStudents(shop);
  return students.map(({ passwordHash: _, ...rest }) => rest);
}

export async function fetchStudentById(id: string, shop: string): Promise<Omit<Student, "passwordHash"> | null> {
  const student = await selectStudentById(id, shop);
  if (!student) return null;
  const { passwordHash: _, ...rest } = student;
  return rest;
}

export async function modifyStudent(data: UpdateStudentRequest): Promise<Omit<Student, "passwordHash"> | null> {
  const existing = await selectStudentById(data.id, data.shop);
  if (!existing) return null;

  const updatedFields = {
    studentName: data.studentName ?? existing.studentName,
    email: data.email ?? existing.email,
    studentStatus: data.studentStatus ?? existing.studentStatus,
    shopifyCustomerId: data.shopifyCustomerId !== undefined ? data.shopifyCustomerId : (existing.shopifyCustomerId || null),
    shop: data.shop,
    phone: data.phone !== undefined ? data.phone : (existing.phone || null),
    course: data.course !== undefined ? data.course : (existing.course || null),
    bio: data.bio !== undefined ? data.bio : (existing.bio || null),
  };



  const updated = await updateStudentInDb(data.id, updatedFields);
  if (!updated) return null;

  const { passwordHash: _, ...rest } = updated;
  return rest;
}

export async function removeStudent(id: string, shop: string): Promise<boolean> {
 
  return deleteStudentFromDb(id, shop);
}

// ==========================================
// ENROLLMENT SERVICES
// ==========================================

export async function enrollStudentInCourse(data: {
  studentId: string;
  courseId: string;
  shop: string;
}): Promise<any> {
  const enrollment = {
    id: crypto.randomUUID(),
    studentId: data.studentId,
    courseId: data.courseId,
    enrollmentDate: new Date().toISOString(),
    enrollmentStatus: 'In Progress' as const,
    shop: data.shop,
  };
  return insertEnrollment(enrollment);
}

export async function fetchStudentEnrollments(studentId: string, shop: string) {
  return selectEnrollmentsByStudent(studentId, shop);
}

export async function fetchAllShopEnrollments(shop: string) {
  return selectAllEnrollments(shop);
}

export async function fetchRecentShopEnrollments(shop: string, limit: number) {
  return selectRecentEnrollments(shop, limit);
}

export async function updateEnrollmentStatus(id: string, status: 'In Progress' | 'Completed', shop: string) {
  return updateEnrollmentStatusInDb(id, status, shop);
}

export async function deleteEnrollment(id: string, shop: string) {
  return deleteEnrollmentFromDb(id, shop);
}

export async function fetchDashboardMetrics(shop: string) {
  return getMerchantDashboardMetrics(shop);
}