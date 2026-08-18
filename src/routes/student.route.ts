import { Router } from 'express';

import { shopifyAuthMiddleware, studentAuthMiddleware } from '../middleware/auth.middleware.js';
import { StudentController } from '../controllers/student.controller.js';
import type { IStudentController } from '../models/student.model.js';

export const studentRouter: Router = Router();

const con:IStudentController=new StudentController()

// ==========================================
// 1. PUBLIC AUTH ROUTING
// ==========================================
studentRouter.post('/register', con.register);
studentRouter.post('/login', con.login);

// ==========================================
// 2. STUDENT PORTAL (Student Auth Protected)
// ==========================================
// Student profile fetching/editing
studentRouter.get(
  '/student-profile', 
  studentAuthMiddleware, 
  (req, res, next) => { req.params.id = req.studentId!; next(); }, 
  con.getStudentById
);

studentRouter.put(
  '/student-profile', 
  studentAuthMiddleware, 
  (req, res, next) => { req.params.id = req.studentId!; next(); }, 
  con.updateStudent
);

// Student enrollments fetch/create
studentRouter.get('/student-enrollments', studentAuthMiddleware, con.getEnrollments);
studentRouter.post('/student-enroll', studentAuthMiddleware, con.enroll);


// ==========================================
// 3. MERCHANT PORTAL (Shopify Admin Protected)
// ==========================================
// Student CRUD
studentRouter.get('/', shopifyAuthMiddleware, con.getAllStudents);
studentRouter.get('/admin/:id', shopifyAuthMiddleware, con.getStudentById);
studentRouter.put('/admin/:id', shopifyAuthMiddleware, con.updateStudent);
studentRouter.delete('/admin/:id', shopifyAuthMiddleware, con.removeStudent);

// Enrollment list & admin enrollment creation
studentRouter.get('/admin-enrollments', shopifyAuthMiddleware, con.getEnrollments);
studentRouter.post('/admin-enroll', shopifyAuthMiddleware, con.enroll);

// Enrollment updates & deletions
studentRouter.put('/enrollments/:id', shopifyAuthMiddleware, con.updateEnrollment);
studentRouter.delete('/enrollments/:id', shopifyAuthMiddleware, con.unenroll);

// Dashboard metrics endpoint
studentRouter.get('/admin-dashboard/stats', shopifyAuthMiddleware, con.getDashboardStats);