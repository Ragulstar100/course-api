export type Student = {
  id: string;
  studentName: string;
  email: string;
  passwordHash: string;
  studentStatus: "Active" | "Inactive";
  createdDate: string;
  shopifyCustomerId?: string | null;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
  isAdmin?: boolean;
};

export type RegisterStudentRequest = {
  studentName: string;
  email: string;
  password: string;
  shopifyCustomerId?: string | null;
};

export type LoginStudentRequest = {
  email: string;
  password: string;
};

export type UpdateStudentRequest = {
  id: string;
  studentName?: string;
  email?: string;
  studentStatus?: "Active" | "Inactive";
  shopifyCustomerId?: string | null;
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
  token: string;
  phone?: string | null;
  course?: string | null;
  bio?: string | null;
  isAdmin?: boolean;
}