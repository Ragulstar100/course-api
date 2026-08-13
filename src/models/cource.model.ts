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