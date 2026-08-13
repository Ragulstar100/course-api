import { dbGet, dbRun, dbAll } from './db.js';

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrollmentDate: string;
  enrollmentStatus: 'In Progress' | 'Completed';
  shop: string;
}

export interface EnrollmentDetails extends Enrollment {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  category: string;
  duration: string;
}

export async function insertEnrollment(enrollment: Enrollment): Promise<Enrollment> {
  const query = `
    INSERT INTO enrollments (id, studentId, courseId, enrollmentDate, enrollmentStatus, shop)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  try {
    await dbRun(query, [
      enrollment.id,
      enrollment.studentId,
      enrollment.courseId,
      enrollment.enrollmentDate,
      enrollment.enrollmentStatus,
      enrollment.shop,
    ]);
    return enrollment;
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      throw new Error('Student is already enrolled in this course.');
    }
    throw error;
  }
}

export async function selectEnrollmentsByStudent(studentId: string, shop: string): Promise<EnrollmentDetails[]> {
  const query = `
    SELECT e.*, s.studentName, s.email as studentEmail, c.courseTitle, c.category, c.duration
    FROM enrollments e
    JOIN students s ON e.studentId = s.id
    JOIN courses c ON e.courseId = c.id
    WHERE e.studentId = ? AND e.shop = ?
  `;
  return dbAll<EnrollmentDetails>(query, [studentId, shop]);
}

export async function selectAllEnrollments(shop: string): Promise<EnrollmentDetails[]> {
  const query = `
    SELECT e.*, s.studentName, s.email as studentEmail, c.courseTitle, c.category, c.duration
    FROM enrollments e
    JOIN students s ON e.studentId = s.id
    JOIN courses c ON e.courseId = c.id
    WHERE e.shop = ?
    ORDER BY e.enrollmentDate DESC
  `;
  return dbAll<EnrollmentDetails>(query, [shop]);
}

export async function selectRecentEnrollments(shop: string, limit = 5): Promise<EnrollmentDetails[]> {
  const query = `
    SELECT e.*, s.studentName, s.email as studentEmail, c.courseTitle, c.category, c.duration
    FROM enrollments e
    JOIN students s ON e.studentId = s.id
    JOIN courses c ON e.courseId = c.id
    WHERE e.shop = ?
    ORDER BY e.enrollmentDate DESC
    LIMIT ?
  `;
  return dbAll<EnrollmentDetails>(query, [shop, limit]);
}

export async function updateEnrollmentStatusInDb(
  id: string,
  status: 'In Progress' | 'Completed',
  shop: string
): Promise<boolean> {
  const query = `
    UPDATE enrollments
    SET enrollmentStatus = ?
    WHERE id = ? AND shop = ?
  `;
  const result = await dbRun(query, [status, id, shop]);
  return result.changes > 0;
}

export async function deleteEnrollmentFromDb(id: string, shop: string): Promise<boolean> {
  const query = `
    DELETE FROM enrollments
    WHERE id = ? AND shop = ?
  `;
  const result = await dbRun(query, [id, shop]);
  return result.changes > 0;
}

export async function getMerchantDashboardMetrics(shop: string): Promise<{
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  completedEnrollments: number;
  activeEnrollments: number;
}> {
  // Run queries in parallel
  const coursesCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM courses WHERE shop = ?', [shop]);
  const studentsCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM students WHERE shop = ?', [shop]);
  const enrollmentsCount = await dbGet<{ count: number }>('SELECT COUNT(*) as count FROM enrollments WHERE shop = ?', [shop]);
  const completedCount = await dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM enrollments WHERE enrollmentStatus = 'Completed' AND shop = ?",
    [shop]
  );
  const activeCount = await dbGet<{ count: number }>(
    "SELECT COUNT(*) as count FROM enrollments WHERE enrollmentStatus = 'In Progress' AND shop = ?",
    [shop]
  );

  return {
    totalCourses: coursesCount?.count || 0,
    totalStudents: studentsCount?.count || 0,
    totalEnrollments: enrollmentsCount?.count || 0,
    completedEnrollments: completedCount?.count || 0,
    activeEnrollments: activeCount?.count || 0,
  };
}
