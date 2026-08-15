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
import { findCustomerByEmail, createCustomerInShopify, normalizeShop } from './shopify.service.js';
// ==========================================
// STUDENT SERVICES
// ==========================================

export async function registerStudent(data: RegisterStudentRequest): Promise<StudentAuthResponse> {
  const shop = normalizeShop(data.shop);
  
  const existing = await selectStudentByEmail(data.email, shop);
  if (existing) {
    throw new Error('Email is already registered on this store');
  }

  const id = crypto.randomUUID();
  const createdDate = new Date().toISOString();
  const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

  // Attempt to link Shopify customer ID automatically by email, or create a new customer
  let shopifyCustomerId = data.shopifyCustomerId || null;
  if (!shopifyCustomerId) {
    try {
      let shopifyCustomer = await findCustomerByEmail(shop, data.email);
      if (!shopifyCustomer) {
        shopifyCustomer = await createCustomerInShopify(shop, data.email, data.studentName);
      }
      if (shopifyCustomer) {
        shopifyCustomerId = shopifyCustomer.id;
      }
    } catch (e) {
      console.warn(`Could not associate or create student as a Shopify customer: ${(e as Error).message}`);
    }
  }

  const student: Student = {
    id,
    studentName: data.studentName,
    email: data.email,
    passwordHash,
    studentStatus: "Active",
    createdDate,
    shopifyCustomerId,
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
  const shop = normalizeShop(data.shop);


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

  // Ensure Shopify customer exists and is linked
  let shopifyCustomerId = student.shopifyCustomerId || null;
  if (!shopifyCustomerId) {
    try {
      let shopifyCustomer = await findCustomerByEmail(shop, student.email);
      if (!shopifyCustomer) {
        shopifyCustomer = await createCustomerInShopify(shop, student.email, student.studentName);
      }
      if (shopifyCustomer) {
        shopifyCustomerId = shopifyCustomer.id;
        await updateStudentInDb(student.id, {
          studentName: student.studentName,
          email: student.email,
          studentStatus: student.studentStatus,
          shopifyCustomerId,
          shop: student.shop,
          phone: student.phone || null,
          course: student.course || null,
          bio: student.bio || null
        });
        student.shopifyCustomerId = shopifyCustomerId;
      }
    } catch (e) {
      console.warn(`Could not associate or create Shopify customer upon login: ${(e as Error).message}`);
    }
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
  const cleanShop = normalizeShop(shop);
  const students = await selectAllStudents(cleanShop);
  return students.map(({ passwordHash: _, ...rest }) => rest);
}

export async function fetchStudentById(id: string, shop: string): Promise<Omit<Student, "passwordHash"> | null> {
  const cleanShop = normalizeShop(shop);
  const student = await selectStudentById(id, cleanShop);
  if (!student) return null;
  const { passwordHash: _, ...rest } = student;
  return rest;
}

export async function modifyStudent(data: UpdateStudentRequest): Promise<Omit<Student, "passwordHash"> | null> {
  const cleanShop = normalizeShop(data.shop);
  const existing = await selectStudentById(data.id, cleanShop);
  if (!existing) return null;

  let shopifyCustomerId = data.shopifyCustomerId !== undefined ? data.shopifyCustomerId : (existing.shopifyCustomerId || null);
  
  // If email has changed, recheck for a matching Shopify customer
  if (data.email && data.email !== existing.email && !data.shopifyCustomerId) {
    try {
      const shopifyCustomer = await findCustomerByEmail(cleanShop, data.email);
      shopifyCustomerId = shopifyCustomer ? shopifyCustomer.id : null;
    } catch (e) {
      console.warn(`Could not re-associate student with Shopify customer on email update: ${(e as Error).message}`);
    }
  }

  const updatedFields = {
    studentName: data.studentName ?? existing.studentName,
    email: data.email ?? existing.email,
    studentStatus: data.studentStatus ?? existing.studentStatus,
    shopifyCustomerId,
    shop: cleanShop,
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
  const cleanShop = normalizeShop(shop);
  return deleteStudentFromDb(id, cleanShop);
}

// ==========================================
// ENROLLMENT SERVICES
// ==========================================

export async function enrollStudentInCourse(data: {
  studentId: string;
  courseId: string;
  shop: string;
}): Promise<any> {
  const cleanShop = normalizeShop(data.shop);
  const enrollment = {
    id: crypto.randomUUID(),
    studentId: data.studentId,
    courseId: data.courseId,
    enrollmentDate: new Date().toISOString(),
    enrollmentStatus: 'In Progress' as const,
    shop: cleanShop,
  };
  return insertEnrollment(enrollment);
}

export async function fetchStudentEnrollments(studentId: string, shop: string) {
  return selectEnrollmentsByStudent(studentId, normalizeShop(shop));
}

export async function fetchAllShopEnrollments(shop: string) {
  return selectAllEnrollments(normalizeShop(shop));
}

export async function fetchRecentShopEnrollments(shop: string, limit: number) {
  return selectRecentEnrollments(normalizeShop(shop), limit);
}

export async function updateEnrollmentStatus(id: string, status: 'In Progress' | 'Completed', shop: string) {
  return updateEnrollmentStatusInDb(id, status, normalizeShop(shop));
}

export async function deleteEnrollment(id: string, shop: string) {
  return deleteEnrollmentFromDb(id, normalizeShop(shop));
}

export async function fetchDashboardMetrics(shop: string) {
  return getMerchantDashboardMetrics(normalizeShop(shop));
}