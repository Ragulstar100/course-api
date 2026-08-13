import { Router } from 'express';
import { 
  createCourse, 
  getAllCourses, 
  getCourseById, 
  updateCourse, 
  removeCourse 
} from '../controllers/cource.controller.js';
import { shopifyAuthMiddleware } from '../middleware/auth.middleware.js';

export const courseRouter: Router = Router();

// 1. Create a course (Merchant only)
courseRouter.post('/', shopifyAuthMiddleware, createCourse);

// 2. View all courses (Merchant admin OR Student portal)
courseRouter.get('/', getAllCourses);

// 3. View individual course details (Merchant admin OR Student portal)
courseRouter.get('/:id', getCourseById);

// 4. Edit a course (Merchant only)
courseRouter.put('/:id', shopifyAuthMiddleware, updateCourse);

// 5. Delete a course (Merchant only)
courseRouter.delete('/:id', shopifyAuthMiddleware, removeCourse);