import crypto from 'crypto';
import type { Course, CreateCourseRequest } from '../models/cource.model.js';
import type { ICourseService } from '../models/cource.model.js';
import { CourceDalRepositery } from '../dal/cource.dal.js';
import { ShopifyService } from './shopify.service.js';


const repositery=new CourceDalRepositery()
const shopyfyService:ShopifyService=new ShopifyService()

export class CourseService implements ICourseService {
  async createNewCourse(data: CreateCourseRequest & { shop: string }): Promise<Course> {
    const id = crypto.randomUUID();
    const createdDate = new Date().toISOString();

    if (!data.courseTitle || !data.description || !data.instructorName || !data.category || !data.duration) {
      throw new Error('Missing required course fields');
    }

    let shopifyProductId = data.shopifyProductId || null;
    if (!shopifyProductId) {
      try {
        const shopifyProduct = await shopyfyService.createProductInShopify(data.shop, data.courseTitle, data.description);
        if (shopifyProduct) {
          shopifyProductId = shopifyProduct.id;
        }
      } catch (e) {
        console.warn(`Could not create Shopify product for new course: ${(e as Error).message}`);
      }
    }

    const course: Course = {
      id,
      courseTitle: data.courseTitle,
      description: data.description,
      instructorName: data.instructorName,
      category: data.category,
      duration: data.duration,
      courseStatus: data.courseStatus || 'Active',
      createdDate,
      shopifyProductId,
      shop: data.shop,
    };

    return repositery.insertCourse(course);
  }

  async fetchAllCourses(shop: string): Promise<Course[]> {
    return repositery.selectAllCourses(shop);
  }

  async fetchAllActiveCourses(shop: string): Promise<Course[]> {
    return repositery.selectAllActiveCourses(shop);
  }

  async fetchCourseById(id: string, shop: string): Promise<Course | null> {
    return repositery.selectCourseById(id, shop);
  }

  async modifyCourse(data: { id: string; shop: string } & Partial<Omit<Course, 'id' | 'shop' | 'createdDate'>>): Promise<Course | null> {
    const existing = await repositery.selectCourseById(data.id, data.shop);
    if (!existing) return null;

    return repositery.updateCourseInDb(data.id, data, data.shop);
  }

  async removeCourse(id: string, shop: string): Promise<boolean> {
    return repositery.deleteCourseFromDb(id, shop);
  }

  async fetchAllCoursesGlobal(): Promise<Course[]> {
    return repositery.selectAllCoursesGlobal();
  }
}