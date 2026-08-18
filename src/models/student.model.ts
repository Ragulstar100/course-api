import type { Enrollment, EnrollmentDetails } from "../dal/enrollment.dal.js";
import { type Request, type Response } from 'express';


export type Student = {
  id: string;
  studentName: string;
  email: string;
  passwordHash: string;
  studentStatus: "Active" | "Inactive";
  createdDate: string;
  shopifyCustomerId?: string | null;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
  isAdmin?: boolean;
};

export type RegisterStudentRequest = {
  studentName: string;
  email: string;
  password: string;
  shopifyCustomerId?: string | null;
};

export type LoginStudentRequest = {
  email: string;
  password: string;
};

export type UpdateStudentRequest = {
  id: string;
  studentName?: string;
  email?: string;
  studentStatus?: "Active" | "Inactive";
  shopifyCustomerId?: string | null;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
};

export interface StudentAuthResponse {
  id: string;
  studentName: string;
  email: string;
  studentStatus: "Active" | "Inactive";
  createdDate: string;
  shopifyCustomerId?: string | null;
  token: string;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
  isAdmin?: boolean;
}


export interface IStudentController {
  register(req: Request, res: Response): Promise<void>;
  login(req: Request, res: Response): Promise<void>;
  getAllStudents(req: Request, res: Response): Promise<void>;
  getStudentById(req: Request, res: Response): Promise<void>;
  updateStudent(req: Request, res: Response): Promise<void>;
  removeStudent(req: Request, res: Response): Promise<void>;
  enroll(req: Request, res: Response): Promise<void>;
  getEnrollments(req: Request, res: Response): Promise<void>;
  updateEnrollment(req: Request, res: Response): Promise<void>;
  unenroll(req: Request, res: Response): Promise<void>;
  getDashboardStats(req: Request, res: Response): Promise<void>;
}



export interface IStudentService {
  registerStudent(data: RegisterStudentRequest): Promise<StudentAuthResponse>;
  loginStudent(data: LoginStudentRequest): Promise<StudentAuthResponse>;
  fetchAllStudents(): Promise<Omit<Student, "passwordHash">[]>;
  fetchStudentById(id: string): Promise<Omit<Student, "passwordHash"> | null>;
  modifyStudent(data: UpdateStudentRequest): Promise<Omit<Student, "passwordHash"> | null>;
  removeStudent(id: string): Promise<boolean>;
  enrollStudentInCourse(data: {
    studentId: string;
    courseId: string;
    shop: string;
  }): Promise<any>;
  fetchStudentEnrollments(studentId: string): Promise<any>;
  fetchAllShopEnrollments(shop: string): Promise<any>;
  fetchRecentShopEnrollments(shop: string, limit: number): Promise<any>;
  updateEnrollmentStatus(id: string, status: 'In Progress' | 'Completed', shop: string): Promise<any>;
  deleteEnrollment(id: string, shop: string): Promise<any>;
  fetchDashboardMetrics(shop: string): Promise<any>;
}

export interface IStudentRepository {
  insertStudent(student: Student): Promise<Student>;
  selectStudentByEmail(email: string): Promise<Student | null>;
  selectAllStudents(): Promise<Student[]>;
  selectStudentById(id: string): Promise<Student | null>;
  selectStudentByIdSimple(id: string): Promise<Student | null>;
  updateStudentInDb(
    id: string,
    updatedFields: Omit<Student, "id" | "createdDate" | "passwordHash">
  ): Promise<Student | null>;
  deleteStudentFromDb(id: string): Promise<boolean>;
}

export interface IEnrollmentRepository {
  insertEnrollment(enrollment: Enrollment): Promise<Enrollment>;
  selectEnrollmentsByStudent(studentId: string): Promise<EnrollmentDetails[]>;
  selectAllEnrollments(shop: string): Promise<EnrollmentDetails[]>;
  selectRecentEnrollments(shop: string, limit?: number): Promise<EnrollmentDetails[]>;
  updateEnrollmentStatusInDb(id: string,status: 'In Progress' | 'Completed',shop: string): Promise<boolean>;
  deleteEnrollmentFromDb(id: string, shop: string): Promise<boolean>;
  getMerchantDashboardMetrics(shop: string): Promise<{totalCourses: number; totalStudents: number; totalEnrollments: number; completedEnrollments: number;activeEnrollments: number;}>;
}




