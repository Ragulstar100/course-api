// ==========================================
// 5. ROUTE OBJECT (routes/student.routes.ts)
// ==========================================

import { Router } from 'express';
import { 
  register, 
  login, 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  removeStudent 
} from '../controllers/student.controller.js';

export const studentRouter: Router = Router();

// 1. Register a student
studentRouter.post('/register', register);

// 2. Login a student
studentRouter.post('/login', login);

// 3. View all students
studentRouter.get('/', getAllStudents);

// 4. View individual student details
studentRouter.get('/:id', getStudentById);

// 5. Edit a student
studentRouter.put('/:id', updateStudent);

// 6. Delete a student
studentRouter.delete('/:id', removeStudent);