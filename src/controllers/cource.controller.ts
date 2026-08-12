import { type Request, type Response } from 'express';

// Directly importing the specific service functions instead of a class instance
import { 
  createNewCourse, 
  fetchAllCourses, 
  fetchCourseById, 
  modifyCourse,
  removeCourse as deleteCourse
} from '../service/cource.service.js'; 
import type { UpdateCourseRequest } from '../service/cource.service.js';

// ==========================================
// COURSE CONTROLLER FUNCTIONS (Using standalone functions)
// ==========================================

export async function createCourse(req: Request, res: Response): Promise<void> {
  try {
    const course = await createNewCourse(req.body);
    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create course', details: (error as Error).message });
  }
}

export async function getAllCourses(_req: Request, res: Response): Promise<void> {
  try {
    const courses = await fetchAllCourses();
    res.status(200).json(courses);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch courses', details: (error as Error).message });
  }
}

export async function getCourseById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const course = await fetchCourseById(id);
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
  try {
    const id = req.params.id as string;
    const updateData: UpdateCourseRequest = { id, ...req.body };
    
    const updatedCourse = await modifyCourse(updateData);
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
  try {
    const id = req.params.id as string;
    const success = await deleteCourse(id);
    if (!success) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }
    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course', details: (error as Error).message });
  }
}