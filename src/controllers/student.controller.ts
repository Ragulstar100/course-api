import { type Request, type Response } from 'express';
import type { IStudentController, IStudentService } from '../models/student.model.js';
import { StudentService } from '../service/student.service.js';
import { ShopifyService } from '../service/shopify.service.js';

const service:IStudentService=new StudentService()
const shopyfy=new ShopifyService()

export class StudentController implements IStudentController {
  async register(req: Request, res: Response): Promise<void> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!req.body.email || !emailRegex.test(req.body.email.trim())) {
      res.status(400).json({ error: 'Invalid email address format' });
      return;
    }

    if (emailRegex.test(req.body.studentName?.trim()) || req.body.studentName?.trim().includes('@')) {
      res.status(400).json({ error: 'Full Name cannot be an email address' });
      return;
    }

    if (!req.body.studentName || req.body.studentName.trim().length < 2) {
      res.status(400).json({ error: 'Full Name must be at least 2 characters long' });
      return;
    }

    if (!req.body.password || req.body.password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    try {
      const student = await service.registerStudent({ ...req.body });
      res.status(201).json({ message: 'Student registered successfully', student });
    } catch (error) {
      res.status(400).json({ error: 'Registration failed', details: (error as Error).message });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const student = await service.loginStudent({ ...req.body });
      res.status(200).json({ message: 'Login successful', student });
    } catch (error) {
      res.status(401).json({ error: 'Login failed', details: (error as Error).message });
    }
  }

  async getAllStudents(req: Request, res: Response): Promise<void> {
    try {
      const students = await service.fetchAllStudents();
      res.status(200).json(students);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch students', details: (error as Error).message });
    }
  }

  async getStudentById(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    try {
      const student = await service.fetchStudentById(id);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      let shopifyCustomerDetails = null;
      try {
        shopifyCustomerDetails = await shopyfy.findCustomerByEmail(student.email);
      } catch (e) {
        console.warn(`Could not fetch Shopify customer details for student ${id}: ${(e as Error).message}`);
      }

      res.status(200).json({
        ...student,
        shopifyCustomerDetails
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch student details', details: (error as Error).message });
    }
  }

  async updateStudent(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const updatedStudent = await service.modifyStudent({ id, ...req.body });
      if (!updatedStudent) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.status(200).json({ message: 'Student updated successfully', student: updatedStudent });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update student', details: (error as Error).message });
    }
  }

  async removeStudent(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(400).json({ error: 'Shop domain missing from request context' });
      return;
    }

    try {
      const id = req.params.id as string;
      const success = await service.removeStudent(id);
      if (!success) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete student', details: (error as Error).message });
    }
  }

  async enroll(req: Request, res: Response): Promise<void> {
    const shop = req.body.shop;
    const studentId = req.studentId || req.body.studentId;
    const courseId = req.body.courseId;

    if (!shop || !studentId || !courseId) {
      res.status(400).json({ error: 'Missing required parameters: shop, studentId, courseId' });
      return;
    }

    try {
      const enrollment = await service.enrollStudentInCourse({ studentId, courseId, shop });
      res.status(201).json({ message: 'Student enrolled successfully', enrollment });
    } catch (error) {
      res.status(400).json({ error: 'Enrollment failed', details: (error as Error).message });
    }
  }

  async getEnrollments(req: Request, res: Response): Promise<void> {
    const shop = req.shop || (req.query.shop as string);
    const studentId = req.studentId || (req.query.studentId as string);

    try {
      if (studentId) {
        const enrollments = await service.fetchStudentEnrollments(studentId);
        res.status(200).json(enrollments);
      } else {
        const enrollments = await service.fetchAllShopEnrollments(shop);
        res.status(200).json(enrollments);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch enrollments', details: (error as Error).message });
    }
  }

  async updateEnrollment(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    const id = req.params.id as string;
    const { enrollmentStatus } = req.body;

    if (!shop || !id || !enrollmentStatus) {
      res.status(400).json({ error: 'Missing parameters: shop, id, enrollmentStatus' });
      return;
    }

    try {
      const success = await service.updateEnrollmentStatus(id, enrollmentStatus, shop);
      if (!success) {
        res.status(404).json({ error: 'Enrollment not found' });
        return;
      }
      res.status(200).json({ message: 'Enrollment status updated successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update enrollment', details: (error as Error).message });
    }
  }

  async unenroll(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    const id = req.params.id as string;

    if (!shop || !id) {
      res.status(400).json({ error: 'Missing parameters: shop, id' });
      return;
    }

    try {
      const success = await service.deleteEnrollment(id, shop);
      if (!success) {
        res.status(404).json({ error: 'Enrollment not found' });
        return;
      }
      res.status(200).json({ message: 'Enrollment deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete enrollment', details: (error as Error).message });
    }
  }

  async getDashboardStats(req: Request, res: Response): Promise<void> {
    const shop = req.shop;
    if (!shop) {
      res.status(400).json({ error: 'Shop domain missing from request context' });
      return;
    }

    try {
      const stats = await service.fetchDashboardMetrics(shop);
      const recent = await service.fetchRecentShopEnrollments(shop, 5);
      res.status(200).json({ stats, recentEnrollments: recent });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve dashboard stats', details: (error as Error).message });
    }
  }
}