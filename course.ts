import sqlite3 from 'sqlite3';
import { type Request, type Response, Router } from 'express';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================

export type Course = {
  id: string;
  courseTitle: string;
  description: string;
  instructorName: string;
  category: string;
  duration: string;
  courseStatus: "Active" | "Inactive";
  createdDate: string;
};

export type CreateCourseRequest = Omit<Course, "id" | "createdDate">;

export type UpdateCourseRequest = Partial<Omit<Course, "id" | "createdDate">> & { id: string };
    
export interface CourseDAL {
  createCourse(data: CreateCourseRequest): Promise<Course>;
  getAllCourses(): Promise<Course[]>;
  getCourseById(id: string): Promise<Course | null>;
  updateCourse(data: UpdateCourseRequest): Promise<Course | null>;
  deleteCourse(id: string): Promise<boolean>;
}

// ==========================================
// 2. DAL (SQLITE3 RAW DATA ACCESS LAYER)
// ==========================================

export class SQLiteCourseDAL implements CourseDAL {
  private db: sqlite3.Database;

  constructor(dbFilePath: string = './courses.db') {
    this.db = new sqlite3.Database(dbFilePath, (err) => {
      if (err) {
        console.error('Error opening database', err.message);
      }
    });
    this.initTable();
  }

  private initTable() {
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
  }

  async createCourse(data: CreateCourseRequest): Promise<Course> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const createdDate = new Date().toISOString();

      const course: Course = {
        id,
        ...data,
        createdDate,
      };

      const query = `INSERT INTO courses (id, courseTitle, description, instructorName, category, duration, courseStatus, createdDate)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      this.db.run(
        query,
        [course.id, course.courseTitle, course.description, course.instructorName, course.category, course.duration, course.courseStatus, course.createdDate],
        function (err) {
          if (err) reject(err);
          else resolve(course);
        }
      );
    });
  }

  async getAllCourses(): Promise<Course[]> {
    return new Promise((resolve, reject) => {
      this.db.all<Course>(`SELECT * FROM courses`, [], (err, rows) => {

        if (err) reject(err);
        else if(rows.length) resolve(rows);
        else reject(new Error("No courses found"));
      });
    });
  }

  async getCourseById(id: string): Promise<Course | null> {
    return new Promise((resolve, reject) => {
      this.db.get<Course>(`SELECT * FROM courses WHERE id = ?`, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  async updateCourse(data: UpdateCourseRequest): Promise<Course | null> {
    const existing = await this.getCourseById(data.id);
    if (!existing) return null;

    const updatedFields = {
      courseTitle: data.courseTitle ?? existing.courseTitle,
      description: data.description ?? existing.description,
      instructorName: data.instructorName ?? existing.instructorName,
      category: data.category ?? existing.category,
      duration: data.duration ?? existing.duration,
      courseStatus: data.courseStatus ?? existing.courseStatus,
    };

    return new Promise((resolve, reject) => {
      const query = `UPDATE courses SET courseTitle = ?, description = ?, instructorName = ?, category = ?, duration = ?, courseStatus = ? WHERE id = ?`;
      
      this.db.run(
        query,
        [updatedFields.courseTitle, updatedFields.description, updatedFields.instructorName, updatedFields.category, updatedFields.duration, updatedFields.courseStatus, data.id],
        async (err) => {
          if (err) {
            reject(err);
          } else {
            const updated = await this.getCourseById(data.id);
            resolve(updated);
          }
        }
      );
    });
  }

  async deleteCourse(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM courses WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve((this.changes ?? 0) > 0);
      });
    });
  }
}

// ==========================================
// 3. SERVICE LAYER
// ==========================================

export class CourseManagerService {
  constructor(private courseService: CourseDAL) {}

  async createNewCourse(data: CreateCourseRequest): Promise<Course> {
    return this.courseService.createCourse(data);
  }

  async fetchAllCourses(): Promise<Course[]> {
    return this.courseService.getAllCourses();
  }

  async fetchCourseById(id: string): Promise<Course | null> {
    return this.courseService.getCourseById(id);
  }

  async modifyCourse(data: UpdateCourseRequest): Promise<Course | null> {
    return this.courseService.updateCourse(data);
  }

  async removeCourse(id: string): Promise<boolean> {
    return this.courseService.deleteCourse(id);
  }
}


// ==========================================
// 4. CONTROLLER LAYER
// ==========================================

export class CourseController {
  constructor(private courseService: CourseManagerService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const course = await this.courseService.createNewCourse(req.body);
      res.status(201).json(course);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create course', details: (error as Error).message });
    }
  };

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const courses = await this.courseService.fetchAllCourses();
      res.status(200).json(courses);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch courses', details: (error as Error).message });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(500).json({ error: 'Invalid course ID format' });
        return;
      }

      const course = await this.courseService.fetchCourseById(id);
      if (!course) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      res.status(200).json(course);
    } catch (error) {
     res.status(500).json({ error: 'Failed to fetch course', details: (error as Error).message });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid course ID format' });
        return;
      }

      const updateData = { id, ...req.body };
      const updatedCourse = await this.courseService.modifyCourse(updateData);
      if (!updatedCourse) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      res.status(200).json(updatedCourse);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update course', details: (error as Error).message });
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      if (typeof id !== 'string') {
        res.status(400).json({ error: 'Invalid course ID format' });
        return;
      }

      const success = await this.courseService.removeCourse(id);
      if (!success) {
        res.status(404).json({ error: 'Course not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete course', details: (error as Error).message });
    }
  };
}

// ==========================================
// 5. ROUTES WIRING
// ==========================================

export function createCourseRouter(controller: CourseController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.getAll);
  router.get('/:id', controller.getById);
  router.put('/:id', controller.update);
  router.delete('/:id', controller.remove);

  return router;
}