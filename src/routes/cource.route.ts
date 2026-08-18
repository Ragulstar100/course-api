import { Router } from 'express';

import { shopifyAuthMiddleware } from '../middleware/auth.middleware.js';
import type { IMerchantController } from '../models/merchant.model.js';
import { CourseController } from '../controllers/cource.controller.js';
import type { ICourseController } from '../models/cource.model.js';

export const courseRouter: Router = Router();

const con:ICourseController=new CourseController()

// 1. Create a course (Merchant only)
courseRouter.post('/', shopifyAuthMiddleware, con.createCourse);

// 2. View all courses (Merchant admin OR Student portal)
courseRouter.get('/', con.getAllCourses);

// 3. View individual course details (Merchant admin OR Student portal)
courseRouter.get('/:id', con.getCourseById);

// 4. Edit a course (Merchant only)
courseRouter.put('/:id', shopifyAuthMiddleware, con.updateCourse);

// 5. Delete a course (Merchant only)
courseRouter.delete('/:id', shopifyAuthMiddleware, con.removeCourse);