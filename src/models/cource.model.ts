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

export type UpdateCourse = {
  courseTitle?: string;
  description?: string;
  instructorName?: string;
  category?: string;
  duration?: string;
  courseStatus?: "Active" | "Inactive";
};