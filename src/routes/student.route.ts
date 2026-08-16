import { Router } from 'express';
import { 
  register, 
  login, 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  removeStudent,
  enroll,
  getEnrollments,
  updateEnrollment,
  unenroll,
  getDashboardStats
} from '../controllers/student.controller.js';
import { shopifyAuthMiddleware, studentAuthMiddleware } from '../middleware/auth.middleware.js';

export const studentRouter: Router = Router();

// ==========================================
// 1. PUBLIC AUTH ROUTING
// ==========================================
studentRouter.post('/register', register);
studentRouter.post('/login', login);

// ==========================================
// 2. STUDENT PORTAL (Student Auth Protected)
// ==========================================
// Student profile fetching/editing
studentRouter.get(
  '/student-profile', 
  studentAuthMiddleware, 
  (req, res, next) => { req.params.id = req.studentId!; next(); }, 
  getStudentById
);

studentRouter.put(
  '/student-profile', 
  studentAuthMiddleware, 
  (req, res, next) => { req.params.id = req.studentId!; next(); }, 
  updateStudent
);

// Student enrollments fetch/create
studentRouter.get('/student-enrollments', studentAuthMiddleware, getEnrollments);
studentRouter.post('/student-enroll', studentAuthMiddleware, enroll);

// ==========================================
// 3. MERCHANT PORTAL (Shopify Admin Protected)
// ==========================================
// Student CRUD
studentRouter.get('/', shopifyAuthMiddleware, getAllStudents);
studentRouter.get('/admin/:id', shopifyAuthMiddleware, getStudentById);
studentRouter.put('/admin/:id', shopifyAuthMiddleware, updateStudent);
studentRouter.delete('/admin/:id', shopifyAuthMiddleware, removeStudent);

// Enrollment list & admin enrollment creation
studentRouter.get('/admin-enrollments', shopifyAuthMiddleware, getEnrollments);
studentRouter.post('/admin-enroll', shopifyAuthMiddleware, enroll);

// Enrollment updates & deletions
studentRouter.put('/enrollments/:id', shopifyAuthMiddleware, updateEnrollment);
studentRouter.delete('/enrollments/:id', shopifyAuthMiddleware, unenroll);

// Dashboard metrics endpoint
studentRouter.get('/admin-dashboard/stats', shopifyAuthMiddleware, getDashboardStats);