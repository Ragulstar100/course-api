import sqlite3 from 'sqlite3';
import { type Request, type Response, Router } from 'express';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export type Student = {
  id: string;
  studentName: string;
  studentEmail: string;
  course: string;
  enrollmentDate: string;
  enrollmentStatus: "Enrolled" | "Completed" | "Dropped";
};

export type CreateStudentRequest = Omit<Student, "id" | "enrollmentDate">;

export type UpdateStudentRequest = Partial<Omit<Student, "id" | "enrollmentDate">> & { id: string };
    
export interface StudentDAL {
  createStudent(data: CreateStudentRequest): Promise<Student>;
  getAllStudents(): Promise<Student[]>;
  getStudentById(id: string): Promise<Student | null>;
  updateStudent(data: UpdateStudentRequest): Promise<Student | null>;
  deleteStudent(id: string): Promise<boolean>;
}

// ==========================================
// 2. DAL (SQLITE3 RAW DATA ACCESS LAYER)
// ==========================================

export class SQLiteStudentDAL implements StudentDAL {
  private db: sqlite3.Database;

  constructor(dbFilePath: string = './students.db') {
    this.db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
      }
    });
    this.initTable();
  }

  private initTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        studentName TEXT NOT NULL,
        studentEmail TEXT NOT NULL UNIQUE,
        course TEXT NOT NULL,
        enrollmentDate TEXT NOT NULL,
        enrollmentStatus TEXT CHECK(enrollmentStatus IN ('Enrolled', 'Completed', 'Dropped')) NOT NULL
      )
    `);
  }

  async createStudent(data: CreateStudentRequest): Promise<Student> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const enrollmentDate = new Date().toISOString();

      const student: Student = {
        id,
        ...data,
        enrollmentDate,
      };

      const query = `INSERT INTO students (id, studentName, studentEmail, course, enrollmentDate, enrollmentStatus)
                     VALUES (?, ?, ?, ?, ?, ?)`;
      
      this.db.run(
        query,
        [student.id, student.studentName, student.studentEmail, student.course, student.enrollmentDate, student.enrollmentStatus],
        function (err) {
          if (err) reject(err);
          else resolve(student);
        }
      );
    });
  }

  async getAllStudents(): Promise<Student[]> {
    return new Promise((resolve, reject) => {
      this.db.all<Student>(`SELECT * FROM students`, [], (err, rows) => {
        if (err) reject(err);
        else if(rows.length) resolve(rows);
        else reject(new Error("No students found"));
      });
    });
  }

  async getStudentById(id: string): Promise<Student | null> {
    return new Promise((resolve, reject) => {
      this.db.get<Student>(`SELECT * FROM students WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  async updateStudent(data: UpdateStudentRequest): Promise<Student | null> {
    const existing = await this.getStudentById(data.id);
    if (!existing) return null;

    const updatedFields = {
      studentName: data.studentName ?? existing.studentName,
      studentEmail: data.studentEmail ?? existing.studentEmail,
      course: data.course ?? existing.course,
      enrollmentStatus: data.enrollmentStatus ?? existing.enrollmentStatus,
    };

    return new Promise((resolve, reject) => {
      const query = `UPDATE students SET studentName = ?, studentEmail = ?, course = ?, enrollmentStatus = ? WHERE id = ?`;
      
      this.db.run(
        query,
        [updatedFields.studentName, updatedFields.studentEmail, updatedFields.course, updatedFields.enrollmentStatus, data.id],
        async (err) => {
          if (err) {
            reject(err);
          } else {
            const updated = await this.getStudentById(data.id);
            resolve(updated);
          }
        }
      );
    });
  }

  async deleteStudent(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM students WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve((this.changes ?? 0) > 0);
      });
    });
  }
}

// ==========================================
// 3. SERVICE LAYER
// ==========================================

export class StudentManagerService {
  constructor(private studentService: StudentDAL) {}

  async createNewStudent(data: CreateStudentRequest): Promise<Student> {
    return this.studentService.createStudent(data);
  }

  async fetchAllStudents(): Promise<Student[]> {
    return this.studentService.getAllStudents();
  }

  async fetchStudentById(id: string): Promise<Student | null> {
    return this.studentService.getStudentById(id);
  }

  async modifyStudent(data: UpdateStudentRequest): Promise<Student | null> {
    return this.studentService.updateStudent(data);
  }

  async removeStudent(id: string): Promise<boolean> {
    return this.studentService.deleteStudent(id);
  }
}

// ==========================================
// 4. CONTROLLER LAYER
// ==========================================

export class StudentController {
  constructor(private studentService: StudentManagerService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const student = await this.studentService.createNewStudent(req.body);
      res.status(201).json(student);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create student', details: (error as Error).message });
    }
  };

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const students = await this.studentService.fetchAllStudents();
      res.status(200).json(students);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch students', details: (error as Error).message });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(500).json({ error: 'Invalid student ID format' });
        return;
      }

      const student = await this.studentService.fetchStudentById(id);
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.status(200).json(student);
    } catch (error) {
     res.status(500).json({ error: 'Failed to fetch student', details: (error as Error).message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid student ID format' });
        return;
      }

      const updateData = { id, ...req.body };
      const updatedStudent = await this.studentService.modifyStudent(updateData);
      if (!updatedStudent) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.status(200).json(updatedStudent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update student', details: (error as Error).message });
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid student ID format' });
        return;
      }

      const success = await this.studentService.removeStudent(id);
      if (!success) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete student', details: (error as Error).message });
    }
  };
}

// ==========================================
// 5. ROUTES WIRING
// ==========================================

export function createStudentRouter(controller: StudentController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}