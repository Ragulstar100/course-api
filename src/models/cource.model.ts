import { type Request, type Response } from 'express';

export type Course = {
  id: string;
  courseTitle: string;
  description: string;
  instructorName: string;
  category: string;
  duration: string;
  courseStatus: "Active" | "Inactive";
  createdDate: string;
  shopifyProductId?: string | null;
  shop: string;
};

export type CreateCourseRequest = Omit<Course, "id" | "createdDate" | "shop"> & {
  shop?: string;
};

export type UpdateCourse = {
  courseTitle?: string;
  description?: string;
  instructorName?: string;
  category?: string;
  duration?: string;
  courseStatus?: "Active" | "Inactive";
  shopifyProductId?: string | null;
};

export interface ICourseController {
  createCourse(req: Request, res: Response): Promise<void>;
  getAllCourses(req: Request, res: Response): Promise<void>;
  getCourseById(req: Request, res: Response): Promise<void>;
  updateCourse(req: Request, res: Response): Promise<void>;
  removeCourse(req: Request, res: Response): Promise<void>;
}


export interface ICourseService {
  createNewCourse(data: CreateCourseRequest & { shop: string }): Promise<Course>;
  fetchAllCourses(shop: string): Promise<Course[]>;
  fetchAllActiveCourses(shop: string): Promise<Course[]>;
  fetchCourseById(id: string, shop: string): Promise<Course | null>;
  modifyCourse(data: { id: string; shop: string } & Partial<Omit<Course, 'id' | 'shop' | 'createdDate'>>): Promise<Course | null>;
  removeCourse(id: string, shop: string): Promise<boolean>;
  fetchAllCoursesGlobal(): Promise<Course[]>;
}

export interface ICourceRepositery {
      insertCourse(course: Course): Promise<Course>
      selectAllCourses(shop: string): Promise<Course[]>
      selectAllActiveCourses(shop: string): Promise<Course[]>
      selectCourseById(id: string, shop: string): Promise<Course | null>
      selectCourseByIdSimple(id: string): Promise<Course | null>
      updateCourseInDb( id: string, updatedFields: Partial<Omit<Course, "id" | "createdDate" | "shop">>, shop: string): Promise<Course | null>
      deleteCourseFromDb(id: string, shop: string): Promise<boolean>
      selectAllCoursesGlobal(): Promise<Course[]>
}