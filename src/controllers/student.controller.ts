import { type Request, type Response } from 'express';
import { 
  registerStudent, 
  loginStudent, 
  fetchAllStudents, 
  fetchStudentById, 
  modifyStudent,
  removeStudent as deleteStudent,
  enrollStudentInCourse,
  fetchStudentEnrollments,
  fetchAllShopEnrollments,
  fetchRecentShopEnrollments,
  updateEnrollmentStatus,
  deleteEnrollment,
  fetchDashboardMetrics
} from '../service/student.service.js'; 
import { findCustomerByEmail, normalizeShop } from '../service/shopify.service.js';



export async function register(req: Request, res: Response): Promise<void> {


  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!req.body.email || !emailRegex.test(req.body.email.trim())) {
    res.status(400).json({ error: 'Invalid email address format' });
    return;
  }

  // Enforce that Name is not an email
  if (emailRegex.test(req.body.studentName?.trim()) || req.body.studentName?.trim().includes('@')) {
    res.status(400).json({ error: 'Full Name cannot be an email address' });
    return;
  }

  // Enforce Name length
  if (!req.body.studentName || req.body.studentName.trim().length < 2) {
    res.status(400).json({ error: 'Full Name must be at least 2 characters long' });
    return;
  }

  // Enforce Password length
  if (!req.body.password || req.body.password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  try {
    const student = await registerStudent({ ...req.body });
    res.status(201).json({ message: 'Student registered successfully', student });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed', details: (error as Error).message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {


  try {
    const student = await loginStudent({ ...req.body });
    res.status(200).json({ message: 'Login successful', student });
  } catch (error) {
    res.status(401).json({ error: 'Login failed', details: (error as Error).message });
  }
}

export async function getAllStudents(req: Request, res: Response): Promise<void> {


  try {
    const students = await fetchAllStudents();
    res.status(200).json(students);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch students', details: (error as Error).message });
  }
}

export async function getStudentById(req: Request, res: Response): Promise<void> {
  const rawShop = req.shop || req.body.shop || (req.query.shop as string) || 'devstore-k71vvnrv.myshopify.com';
  const id = req.params.id as string;
  const shop = normalizeShop(rawShop);

  try {
    const student = await fetchStudentById(id);
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    // Enrich student response with Shopify customer details if available
    let shopifyCustomerDetails = null;
    try {
      shopifyCustomerDetails = await findCustomerByEmail( student.email);
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

export async function updateStudent(req: Request, res: Response): Promise<void> {
  const rawShop = req.shop || req.body.shop;
  if (!rawShop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }
  const shop = normalizeShop(rawShop);

  try {
    const id = req.params.id as string;
    const updatedStudent = await modifyStudent({ id, shop, ...req.body });
    if (!updatedStudent) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.status(200).json({ message: 'Student updated successfully', student: updatedStudent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student', details: (error as Error).message });
  }
}

export async function removeStudent(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const id = req.params.id as string;
    const success = await deleteStudent(id);
    if (!success) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student', details: (error as Error).message });
  }
}

// ==========================================
// ENROLLMENT CONTROLLERS
// ==========================================

export async function enroll(req: Request, res: Response): Promise<void> {
  // Can be called by student (studentAuthMiddleware) or admin (shopifyAuthMiddleware)
  const shop = req.shop;
  const studentId = req.studentId || req.body.studentId;
  const courseId = req.body.courseId;

  if (!shop || !studentId || !courseId) {
    res.status(400).json({ error: 'Missing required parameters: shop, studentId, courseId' });
    return;
  }

  try {
    const enrollment = await enrollStudentInCourse({ studentId, courseId, shop });
    res.status(201).json({ message: 'Student enrolled successfully', enrollment });
  } catch (error) {
    res.status(400).json({ error: 'Enrollment failed', details: (error as Error).message });
  }
}

export async function getEnrollments(req: Request, res: Response): Promise<void> {
  const shop = req.shop || (req.query.shop as string);
  const studentId = req.studentId || (req.query.studentId as string);

  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing' });
    return;
  }

  try {
    if (studentId) {
      // Fetch for specific student (e.g. Student Portal view or Admin checking a student)
      const enrollments = await fetchStudentEnrollments(studentId, shop);
      res.status(200).json(enrollments);
    } else {
      // Fetch all for shop (Admin Dashboard view)
      const enrollments = await fetchAllShopEnrollments(shop);
      res.status(200).json(enrollments);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enrollments', details: (error as Error).message });
  }
}

export async function updateEnrollment(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  const id = req.params.id as string;
  const { enrollmentStatus } = req.body;

  if (!shop || !id || !enrollmentStatus) {
    res.status(400).json({ error: 'Missing parameters: shop, id, enrollmentStatus' });
    return;
  }

  try {
    const success = await updateEnrollmentStatus(id, enrollmentStatus, shop);
    if (!success) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }
    res.status(200).json({ message: 'Enrollment status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update enrollment', details: (error as Error).message });
  }
}

export async function unenroll(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  const id = req.params.id as string;

  if (!shop || !id) {
    res.status(400).json({ error: 'Missing parameters: shop, id' });
    return;
  }

  try {
    const success = await deleteEnrollment(id, shop);
    if (!success) {
      res.status(404).json({ error: 'Enrollment not found' });
      return;
    }
    res.status(200).json({ message: 'Enrollment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete enrollment', details: (error as Error).message });
  }
}

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const shop = req.shop;
  if (!shop) {
    res.status(400).json({ error: 'Shop domain missing from request context' });
    return;
  }

  try {
    const stats = await fetchDashboardMetrics(shop);
    const recent = await fetchRecentShopEnrollments(shop, 5);
    res.status(200).json({ stats, recentEnrollments: recent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve dashboard stats', details: (error as Error).message });
  }
}