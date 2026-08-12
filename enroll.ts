import sqlite3 from 'sqlite3';
import { type Request, type Response, Router } from 'express';
import type { Student } from './student.js';
import type { Course } from './course.js';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================


export type Enrollment = {
  id: string;
  studentId: string;
  courseId: string;
  enrolledDate: string;
  enrollmentStatus: "Enrolled" | "Completed" | "Dropped";
};

export type CreateEnrollmentRequest = Omit<Enrollment, "id" | "enrolledDate">;

export type UpdateEnrollmentRequest = Partial<Omit<Enrollment, "id" | "enrolledDate">> & { id: string };

export type EnrollmentWithDetails = Enrollment & {
  student: Student | null;
  course: Course | null;
};

export interface EnrollmentDAL {
  createEnrollment(data: CreateEnrollmentRequest): Promise<Enrollment>;
  getAllEnrollments(): Promise<EnrollmentWithDetails[]>;
  getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null>;
  updateEnrollment(data: UpdateEnrollmentRequest): Promise<Enrollment | null>;
  deleteEnrollment(id: string): Promise<boolean>;
}

// ==========================================
// 2. DAL (SQLITE3 RAW DATA ACCESS LAYER)
// ==========================================

export class SQLiteEnrollmentDAL implements EnrollmentDAL {
  private db: sqlite3.Database;

  constructor(dbFilePath: string = './school.db') {
    this.db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
      }
    });
    this.initTables();
  }

  private initTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        courseTitle TEXT NOT NULL,
        description TEXT NOT NULL,
        instructorName TEXT NOT NULL,
        category TEXT NOT NULL,
        duration TEXT NOT NULL,
        courseStatus TEXT CHECK(courseStatus IN ('Active', 'Inactive')) NOT NULL,
        createdDate TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        studentName TEXT NOT NULL,
        studentEmail TEXT NOT NULL UNIQUE,
        enrollmentDate TEXT NOT NULL,
        enrollmentStatus TEXT CHECK(enrollmentStatus IN ('Enrolled', 'Completed', 'Dropped')) NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        enrolledDate TEXT NOT NULL,
        enrollmentStatus TEXT CHECK(enrollmentStatus IN ('Enrolled', 'Completed', 'Dropped')) NOT NULL,
        FOREIGN KEY (studentId) REFERENCES students (id),
        FOREIGN KEY (courseId) REFERENCES courses (id)
      )
    `);
  }

  async createEnrollment(data: CreateEnrollmentRequest): Promise<Enrollment> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const enrolledDate = new Date().toISOString();

      const enrollment: Enrollment = {
        id,
        ...data,
        enrolledDate,
      };

      const query = `INSERT INTO enrollments (id, studentId, courseId, enrolledDate, enrollmentStatus)
                     VALUES (?, ?, ?, ?, ?)`;
      
      this.db.run(
        query,
        [enrollment.id, enrollment.studentId, enrollment.courseId, enrollment.enrolledDate, enrollment.enrollmentStatus],
        function (err) {
          if (err) reject(err);
          else resolve(enrollment);
        }
      );
    });
  }

  async getAllEnrollments(): Promise<EnrollmentWithDetails[]> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          e.id AS enrollment_id,
          e.studentId,
          e.courseId,
          e.enrolledDate,
          e.enrollmentStatus AS enrollment_status,
          s.id AS student_id,
          s.studentName,
          s.studentEmail,
          s.enrollmentDate AS student_enrollmentDate,
          s.enrollmentStatus AS student_enrollmentStatus,
          c.id AS course_id,
          c.courseTitle,
          c.description,
          c.instructorName,
          c.category,
          c.duration,
          c.courseStatus,
          c.createdDate AS course_createdDate
        FROM enrollments e
        LEFT JOIN students s ON e.studentId = s.id
        LEFT JOIN courses c ON e.courseId = c.id
      `;

      this.db.all(query, [], (err, rows: any[]) => {
        if (err) {
          return reject(err);
        }

        const enrollments: EnrollmentWithDetails[] = (rows || []).map((row) => ({
          id: row.enrollment_id,
          studentId: row.studentId,
          courseId: row.courseId,
          enrolledDate: row.enrolledDate,
          enrollmentStatus: row.enrollment_status,
          student: row.student_id ? {
            id: row.student_id,
            studentName: row.studentName,
            studentEmail: row.studentEmail,
            enrollmentDate: row.student_enrollmentDate,
            enrollmentStatus: row.student_enrollmentStatus,
          } : null,
          course: row.course_id ? {
            id: row.course_id,
            courseTitle: row.courseTitle,
            description: row.description,
            instructorName: row.instructorName,
            category: row.category,
            duration: row.duration,
            courseStatus: row.courseStatus,
            createdDate: row.course_createdDate,
          } : null,
        }));

        resolve(enrollments);
      });
    });
  }

  async getEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          e.id AS enrollment_id,
          e.studentId,
          e.courseId,
          e.enrolledDate,
          e.enrollmentStatus AS enrollment_status,
          s.id AS student_id,
          s.studentName,
          s.studentEmail,
          s.enrollmentDate AS student_enrollmentDate,
          s.enrollmentStatus AS student_enrollmentStatus,
          c.id AS course_id,
          c.courseTitle,
          c.description,
          c.instructorName,
          c.category,
          c.duration,
          c.courseStatus,
          c.createdDate AS course_createdDate
        FROM enrollments e
        LEFT JOIN students s ON e.studentId = s.id
        LEFT JOIN courses c ON e.courseId = c.id
        WHERE e.id = ?
      `;

      this.db.get(query, [id], (err, row: any) => {
        if (err) {
          return reject(err);
        }
        if (!row) {
          return resolve(null);
        }

        const enrollment: EnrollmentWithDetails = {
          id: row.enrollment_id,
          studentId: row.studentId,
          courseId: row.courseId,
          enrolledDate: row.enrolledDate,
          enrollmentStatus: row.enrollment_status,
          student: row.student_id ? {
            id: row.student_id,
            studentName: row.studentName,
            studentEmail: row.studentEmail,
            enrollmentDate: row.student_enrollmentDate,
            enrollmentStatus: row.student_enrollmentStatus,
          } : null,
          course: row.course_id ? {
            id: row.course_id,
            courseTitle: row.courseTitle,
            description: row.description,
            instructorName: row.instructorName,
            category: row.category,
            duration: row.duration,
            courseStatus: row.courseStatus,
            createdDate: row.course_createdDate,
          } : null,
        };

        resolve(enrollment);
      });
    });
  }

  async updateEnrollment(data: UpdateEnrollmentRequest): Promise<Enrollment | null> {
    const existing = await this.getEnrollmentById(data.id);
    if (!existing) return null;

    const updatedFields = {
      studentId: data.studentId ?? existing.studentId,
      courseId: data.courseId ?? existing.courseId,
      enrollmentStatus: data.enrollmentStatus ?? existing.enrollmentStatus,
    };

    return new Promise((resolve, reject) => {
      const query = `UPDATE enrollments SET studentId = ?, courseId = ?, enrollmentStatus = ? WHERE id = ?`;
      
      this.db.run(
        query,
        [updatedFields.studentId, updatedFields.courseId, updatedFields.enrollmentStatus, data.id],
        async (err) => {
          if (err) {
            reject(err);
          } else {
            const updatedWithDetails = await this.getEnrollmentById(data.id);
            if (!updatedWithDetails) {
              resolve(null);
              return;
            }
            const { student, course, ...baseEnrollment } = updatedWithDetails;
            resolve(baseEnrollment);
          }
        }
      );
    });
  }

  async deleteEnrollment(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM enrollments WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve((this.changes ?? 0) > 0);
      });
    });
  }
}

// ==========================================
// 3. SERVICE LAYER
// ==========================================

export class EnrollmentManagerService {
  constructor(private enrollmentService: EnrollmentDAL) {}

  async createNewEnrollment(data: CreateEnrollmentRequest): Promise<Enrollment> {
    return this.enrollmentService.createEnrollment(data);
  }

  async fetchAllEnrollments(): Promise<EnrollmentWithDetails[]> {
    return this.enrollmentService.getAllEnrollments();
  }

  async fetchEnrollmentById(id: string): Promise<EnrollmentWithDetails | null> {
    return this.enrollmentService.getEnrollmentById(id);
  }

  async modifyEnrollment(data: UpdateEnrollmentRequest): Promise<Enrollment | null> {
    return this.enrollmentService.updateEnrollment(data);
  }

  async removeEnrollment(id: string): Promise<boolean> {
    return this.enrollmentService.deleteEnrollment(id);
  }
}

// ==========================================
// 4. CONTROLLER LAYER
// ==========================================

export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentManagerService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const enrollment = await this.enrollmentService.createNewEnrollment(req.body);
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create enrollment', details: (error as Error).message });
    }
  };

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const enrollments = await this.enrollmentService.fetchAllEnrollments();
      res.status(200).json(enrollments);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch enrollments', details: (error as Error).message });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid enrollment ID format' });
        return;
      }

      const enrollment = await this.enrollmentService.fetchEnrollmentById(id);
      if (!enrollment) {
        res.status(404).json({ error: 'Enrollment not found' });
        return;
      }
      res.status(200).json(enrollment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch enrollment', details: (error as Error).message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid enrollment ID format' });
        return;
      }

      const updateData = { id, ...req.body };
      const updatedEnrollment = await this.enrollmentService.modifyEnrollment(updateData);
      if (!updatedEnrollment) {
        res.status(404).json({ error: 'Enrollment not found' });
        return;
      }
      res.status(200).json(updatedEnrollment);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update enrollment', details: (error as Error).message });
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid enrollment ID format' });
        return;
      }

      const success = await this.enrollmentService.removeEnrollment(id);
      if (!success) {
        res.status(404).json({ error: 'Enrollment not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete enrollment', details: (error as Error).message });
    }
  };
}

// ==========================================
// 5. ROUTES WIRING
// ==========================================

export function createEnrollmentRouter(controller: EnrollmentController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}