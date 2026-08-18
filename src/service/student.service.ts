import crypto from 'crypto';
import type { 
  Student, 
  RegisterStudentRequest, 
  LoginStudentRequest, 
  UpdateStudentRequest,
  StudentAuthResponse,
  IStudentRepository,
  IEnrollmentRepository
} from '../models/student.model.js';
import type { IStudentService } from '../models/student.model.js';
import { signJwt } from '../middleware/auth.middleware.js';
import { shopifyConfig } from '../../config.js';
import { StudentRepository } from '../dal/student.dal.js';
import { EnrollmentRepository } from '../dal/enrollment.dal.js';
import { normalizeShop, ShopifyService } from './shopify.service.js';


const repositery:IStudentRepository=new StudentRepository()
const enrollRep:IEnrollmentRepository=new EnrollmentRepository()
const shopyfyService=new ShopifyService()


export class StudentService implements IStudentService {
  async registerStudent(data: RegisterStudentRequest): Promise<StudentAuthResponse> {
    const existing = await repositery.selectStudentByEmail(data.email);
    if (existing) {
      throw new Error('Email is already registered on this store');
    }

    const id = crypto.randomUUID();
    const createdDate = new Date().toISOString();
    const passwordHash = crypto.createHash('sha256').update(data.password).digest('hex');

    let shopifyCustomerId = data.shopifyCustomerId || null;
    if (!shopifyCustomerId) {
      try {
        let shopifyCustomer = await shopyfyService.findCustomerByEmail(data.email);
        if (!shopifyCustomer) {
          shopifyCustomer = await shopifyCustomer.createCustomerInShopify(data.email, data.studentName);
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
      phone: null,
      course: null,
      bio: null,
    };

    await repositery.insertStudent(student);

    const token = signJwt({ studentId: id }, shopifyConfig.jwtSecret, 2592000); // 30 days

    return {
      id: student.id,
      studentName: student.studentName,
      email: student.email,
      studentStatus: student.studentStatus,
      createdDate: student.createdDate,
      shopifyCustomerId: student.shopifyCustomerId || null,
      token,
      phone: student.phone || null,
      course: student.course || null,
      bio: student.bio || null,
    };
  }

  async loginStudent(data: LoginStudentRequest): Promise<StudentAuthResponse> {
    const student = await repositery.selectStudentByEmail(data.email);
    
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

    let shopifyCustomerId = student.shopifyCustomerId || null;
    if (!shopifyCustomerId) {
      try {
        let shopifyCustomer = await shopyfyService.findCustomerByEmail(student.email);
        if (!shopifyCustomer) {
          shopifyCustomer = await shopyfyService.createCustomerInShopify(student.email, student.studentName);
        }
        if (shopifyCustomer) {
          shopifyCustomerId = shopifyCustomer.id;
          await repositery.updateStudentInDb(student.id, {
            studentName: student.studentName,
            email: student.email,
            studentStatus: student.studentStatus,
            shopifyCustomerId,
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

    const token = signJwt({ studentId: student.id }, shopifyConfig.jwtSecret, 2592000);

    return {
      id: student.id,
      studentName: student.studentName,
      email: student.email,
      studentStatus: student.studentStatus,
      createdDate: student.createdDate,
      shopifyCustomerId: student.shopifyCustomerId || null,
      token,
      phone: student.phone || null,
      course: student.course || null,
      bio: student.bio || null,
    };
  }

  async fetchAllStudents(): Promise<Omit<Student, "passwordHash">[]> {
    const students = await repositery.selectAllStudents();
    return students.map(({ passwordHash: _, ...rest }) => rest);
  }

  async fetchStudentById(id: string): Promise<Omit<Student, "passwordHash"> | null> {
    const student = await repositery.selectStudentById(id);
    if (!student) return null;
    const { passwordHash: _, ...rest } = student;
    return rest;
  }

  async modifyStudent(data: UpdateStudentRequest): Promise<Omit<Student, "passwordHash"> | null> {
    const existing = await repositery.selectStudentById(data.id);
    if (!existing) return null;

    let shopifyCustomerId = data.shopifyCustomerId !== undefined ? data.shopifyCustomerId : (existing.shopifyCustomerId || null);
    
    if (data.email && data.email !== existing.email && !data.shopifyCustomerId) {
      try {
        const shopifyCustomer = await shopyfyService.findCustomerByEmail(data.email);
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
      phone: data.phone !== undefined ? data.phone : (existing.phone || null),
      course: data.course !== undefined ? data.course : (existing.course || null),
      bio: data.bio !== undefined ? data.bio : (existing.bio || null),
    };

    const updated = await repositery.updateStudentInDb(data.id, updatedFields);
    if (!updated) return null;

    const { passwordHash: _, ...rest } = updated;
    return rest;
  }

  async removeStudent(id: string): Promise<boolean> {
    return repositery.deleteStudentFromDb(id);
  }

  async enrollStudentInCourse(data: {
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
    return enrollRep.insertEnrollment(enrollment);
  }

  async fetchStudentEnrollments(studentId: string) {
    return enrollRep.selectEnrollmentsByStudent(studentId);
  }

  async fetchAllShopEnrollments(shop: string) {
    return enrollRep.selectAllEnrollments(normalizeShop(shop));
  }

  async fetchRecentShopEnrollments(shop: string, limit: number) {
    return enrollRep.selectRecentEnrollments(normalizeShop(shop), limit);
  }

  async updateEnrollmentStatus(id: string, status: 'In Progress' | 'Completed', shop: string) {
    return enrollRep.updateEnrollmentStatusInDb(id, status, normalizeShop(shop));
  }

  async deleteEnrollment(id: string, shop: string) {
    return enrollRep.deleteEnrollmentFromDb(id, normalizeShop(shop));
  }

  async fetchDashboardMetrics(shop: string) {
    return enrollRep.getMerchantDashboardMetrics(normalizeShop(shop));
  }
}