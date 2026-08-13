import { type Request, type Response } from 'express';
import { 
  createNewCourse, 
  fetchAllCourses, 
  fetchCourseById, 
  modifyCourse,
  removeCourse as deleteCourse,
  fetchAllCoursesGlobal
} from '../service/cource.service.js'; 

export async function createCourse(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const course = await createNewCourse({ ...req.body, shop });
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course', details: (error as Error).message });
  }
}

export async function getAllCourses(req: Request, res: Response): Promise<void> {
  const shop = req.shop || (req.query.shop as string);

  try {
    if (shop) {
      const courses = await fetchAllCourses(shop);
      res.status(200).json(courses);
    } else {
      const courses = await fetchAllCoursesGlobal();
      res.status(200).json(courses);
    }
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch courses', details: (error as Error).message });
  }
}

export async function getCourseById(req: Request, res: Response): Promise<void> {
  const shop = req.shop || (req.query.shop as string);
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing' });
    return;
  }

  try {
    const id = req.params.id as string;
    const course = await fetchCourseById(id, shop);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.status(200).json(course);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch course details', details: (error as Error).message });
  }
}

export async function updateCourse(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const id = req.params.id as string;
    const updatedCourse = await modifyCourse({ id, shop, ...req.body });
    
    if (!updatedCourse) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.status(200).json({ message: 'Course updated successfully', course: updatedCourse });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course', details: (error as Error).message });
  }
}

export async function removeCourse(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const id = req.params.id as string;
    const success = await deleteCourse(id, shop);
    if (!success) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course', details: (error as Error).message });
  }
}