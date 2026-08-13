import sqlite3 from 'sqlite3';

const dbFilePath = './courses.db';

export const db = new sqlite3.Database(dbFilePath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Successfully connected to SQLite database:', dbFilePath);
  }
});

// Helper functions for Promise-based database operations
export function dbRun(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (this: any, err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet<T>(sql: string, params: any[] = []): Promise<T | null> {
  return new Promise((resolve, reject) => {
    db.get<T>(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

export function dbAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all<T>(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

// Initialize tables on startup
export async function initializeDatabase() {
  console.log('Initializing database schema...');

  // 2. Create stores table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS stores (
      shop TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // Re-create courses and students tables with multi-tenant fields if they don't have them
  // To avoid complex migrations, we drop old tables if they are incompatible.
  // We'll inspect students schema to see if it still has enrolledCourseId
  try {
    const hasOldStudentTable = await dbGet<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='students'"
    );

    if (hasOldStudentTable && hasOldStudentTable.sql.includes('enrolledCourseId TEXT NOT NULL')) {
      console.log('Detected outdated students table schema. Recreating table...');
      await dbRun('DROP TABLE IF EXISTS enrollments'); // enrollments depends on students
      await dbRun('DROP TABLE IF EXISTS students');
      await dbRun('DROP TABLE IF EXISTS courses');
    }
  } catch (e) {
    console.error('Error checking database migration status:', e);
  }

  // 3. Create courses table (multi-tenant)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      courseTitle TEXT NOT NULL,
      description TEXT NOT NULL,
      instructorName TEXT NOT NULL,
      category TEXT NOT NULL,
      duration TEXT NOT NULL,
      courseStatus TEXT CHECK(courseStatus IN ('Active', 'Inactive')) NOT NULL,
      createdDate TEXT NOT NULL,
      shopifyProductId TEXT,
      shop TEXT NOT NULL
    )
  `);

  // 4. Create students table (multi-tenant)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      studentName TEXT NOT NULL,
      email TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      studentStatus TEXT CHECK(studentStatus IN ('Active', 'Inactive')) NOT NULL,
      createdDate TEXT NOT NULL,
      shopifyCustomerId TEXT,
      shop TEXT NOT NULL,
      phone TEXT,
      course TEXT,
      bio TEXT,
      UNIQUE(email, shop)
    )
  `);

  // Run dynamic schema migrations if columns are missing in existing tables
  try {
    await dbRun('ALTER TABLE students ADD COLUMN phone TEXT');
  } catch (e) {
    // Column already exists or error
  }
  try {
    await dbRun('ALTER TABLE students ADD COLUMN course TEXT');
  } catch (e) {
    // Column already exists or error
  }
  try {
    await dbRun('ALTER TABLE students ADD COLUMN bio TEXT');
  } catch (e) {
    // Column already exists or error
  }

  // 5. Create enrollments table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      courseId TEXT NOT NULL,
      enrollmentDate TEXT NOT NULL,
      enrollmentStatus TEXT CHECK(enrollmentStatus IN ('In Progress', 'Completed')) NOT NULL,
      shop TEXT NOT NULL,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(studentId, courseId)
    )
  `);

  console.log('Database schema successfully initialized.');
}
