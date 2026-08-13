export type Student = {
  id: string;
  studentName: string;
  email: string;
  passwordHash: string;
  studentStatus: "Active" | "Inactive";
  createdDate: string;
  shopifyCustomerId?: string | null;
  shop: string;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
};

export type RegisterStudentRequest = {
  studentName: string;
  email: string;
  password: string;
  shop: string;
  shopifyCustomerId?: string | null;
  enrolledCourseId?: string; // Optional field for initial course enrollment on register
};

export type LoginStudentRequest = {
  email: string;
  password: string;
  shop: string;
};

export type UpdateStudentRequest = {
  id: string;
  studentName?: string;
  email?: string;
  studentStatus?: "Active" | "Inactive";
  shopifyCustomerId?: string | null;
  shop: string;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
};

export interface StudentAuthResponse {
  id: string;
  studentName: string;
  email: string;
  studentStatus: "Active" | "Inactive";
  createdDate: string;
  shopifyCustomerId?: string | null;
  shop: string;
  token: string;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
}