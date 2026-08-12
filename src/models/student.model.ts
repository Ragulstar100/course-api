// ==========================================
// 1. TYPES & INTERFACES (types/student.types.ts)
// ==========================================

export type Student = {
  id: string;
  studentName: string;
  email: string;
  passwordHash: string;
  enrolledCourseId: string;
  studentStatus: "Active" | "Inactive";
  createdDate: string;
};

export type RegisterStudentRequest = {
  studentName: string;
  email: string;
  password: string;
  enrolledCourseId: string;
};

export type LoginStudentRequest = {
  email: string;
  password: string;
};

export type UpdateStudentRequest = Partial<Omit<Student, "id" | "createdDate" | "passwordHash">> & { id: string };