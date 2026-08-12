// ==========================================
// 5. ROUTE OBJECT (routes/student.routes.ts)
// ==========================================

import { Router } from 'express';
import { 
  createStudent, 
  getAllStudents, 
  getStudentById, 
  updateStudent, 
  removeStudent 
} from '../controllers/student.controller.js'; // Import your controller functions

export const studentRouter: Router = Router();

// 1. Create a student
studentRouter.post('/', createStudent);

// 2. View all students
studentRouter.get('/', getAllStudents);

// 3. View individual student details
studentRouter.get('/:id', getStudentById);

// 4. Edit a student
studentRouter.put('/:id', updateStudent);

// 5. Delete a student
studentRouter.delete('/:id', removeStudent);