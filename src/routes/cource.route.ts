import { Router } from 'express';
import { 
  createCourse, 
  getAllCourses, 
  getCourseById, 
  updateCourse, 
  removeCourse 
} from '../controllers/cource.controller.js'; // Import your controller functions

// ==========================================
// COURSE ROUTE OBJECT
// ==========================================

export const courseRouter: Router = Router();

// 1. Create a course
courseRouter.post('/', createCourse);

// 2. View all courses
courseRouter.get('/', getAllCourses);

// 3. View individual course details
courseRouter.get('/:id', getCourseById);

// 4. Edit a course
courseRouter.put('/:id', updateCourse);

// 5. Delete a course
courseRouter.delete('/:id', removeCourse);