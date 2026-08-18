import { type Request, type Response } from 'express';
import type { ICourseController, ICourseService } from '../models/cource.model.js';
import { CourseService } from '../service/cource.service.js';
import { ShopifyService } from '../service/shopify.service.js';

const service:ICourseService=new CourseService()
const shopfyService:ShopifyService=new ShopifyService()


export class CourseController implements ICourseController {
  async createCourse(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(400).json({ error: 'Shop domain missing from request context' });
      return;
    }

    try {
      const course = await service.createNewCourse({ ...req.body, shop });
      res.status(201).json({ message: 'Course created successfully', course });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create course', details: (error as Error).message });
    }
  }

  async getAllCourses(req: Request, res: Response): Promise<void> {
    const shop = req.shop || (req.query.shop as string);

    try {
      if (shop) {
        const courses = await service.fetchAllCourses(shop);
        res.status(200).json(courses);
      } else {
        const courses = await service.fetchAllCoursesGlobal();
        res.status(200).json(courses);
      }
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch courses', details: (error as Error).message });
    }
  }

  async getCourseById(req: Request, res: Response): Promise<void> {
    const shop = req.shop || (req.query.shop as string);
    if (!shop) {
      res.status(400).json({ error: 'Shop domain missing' });
      return;
    }

    try {
      const id = req.params.id as string;
      const course = await service.fetchCourseById(id, shop);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }

      // Enrich course with Shopify product details if associated
      let shopifyProductDetails = null;
      if (course.shopifyProductId) {
        try {
        shopifyProductDetails = await shopfyService.fetchProductDetails(shop, course.shopifyProductId);
        } catch (e) {
          console.warn(`Could not fetch Shopify product details for course ${id}: ${(e as Error).message}`);
        }
      }

      res.status(200).json({
        ...course,
        shopifyProductDetails
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch course details', details: (error as Error).message });
    }
  }

  async updateCourse(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(400).json({ error: 'Shop domain missing from request context' });
      return;
    }

    try {
      const id = req.params.id as string;
      const updatedCourse = await service.modifyCourse({ id, shop, ...req.body });
      
      if (!updatedCourse) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      res.status(200).json({ message: 'Course updated successfully', course: updatedCourse });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update course', details: (error as Error).message });
    }
  }

  async removeCourse(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(400).json({ error: 'Shop domain missing from request context' });
      return;
    }

    try {
      const id = req.params.id as string;
      const success = await service.removeCourse(id, shop);
      if (!success) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      res.status(200).json({ message: 'Course deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete course', details: (error as Error).message });
    }
  }
}