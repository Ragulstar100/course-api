// ==========================================
// 1. TYPES & INTERFACES (model/student.types.ts)
// ==========================================

export type Student = {
  id: string;
  studentName: string;
  email: string;
  age: number;
  enrolledCourseId: string;
  studentStatus: "Active" | "Inactive";
  createdDate: string;
};

export type CreateStudentRequest = Omit<Student, "id" | "createdDate">;

export type UpdateStudentRequest = Partial<Omit<Student, "id" | "createdDate">> & { id: string };