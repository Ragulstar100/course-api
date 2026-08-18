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

  // 1. Create shopify_sessions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS shopify_sessions (
      id TEXT PRIMARY KEY,
      shop TEXT NOT NULL,
      state TEXT NOT NULL,
      isOnline INTEGER NOT NULL,
      scope TEXT,
      accessToken TEXT,
      expires INTEGER,
      onlineAccessInfo TEXT
    )
  `);

  // 2. Create stores table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS stores (
      shop TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      createdAt TEXT NOT NULL,
      username TEXT UNIQUE,
      passwordHash TEXT
    )
  `);

  // Check if existing tables contain the old/unwanted schema (e.g., student table still has shop)
  try {
    const hasOldStudentTable = await dbGet<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='students'"
    );
    const hasOldCourseTable = await dbGet<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='courses'"
    );

    // If students table still has 'shop', treat it as old and recreate it
    const isOldStudent = hasOldStudentTable && hasOldStudentTable.sql.includes('shop');
    const isOldCourse = hasOldCourseTable && !hasOldCourseTable.sql.includes('FOREIGN KEY (shop) REFERENCES stores(shop)');

    if (isOldStudent || isOldCourse) {
      console.log('Detected outdated schema. Recreating tables...');
      await dbRun('DROP TABLE IF EXISTS enrollments'); // enrollments depends on students & courses
      await dbRun('DROP TABLE IF EXISTS students');
      await dbRun('DROP TABLE IF EXISTS courses');
    }
  } catch (e) {
    console.error('Error checking database migration status:', e);
  }

  // 3. Create courses table (multi-tenant with shop)
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
      shop TEXT NOT NULL,
      FOREIGN KEY (shop) REFERENCES stores(shop) ON DELETE CASCADE
    )
  `); 

  // 4. Create students table (Independent of shop - email is now globally unique)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      studentName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      studentStatus TEXT CHECK(studentStatus IN ('Active', 'Inactive')) NOT NULL,
      createdDate TEXT NOT NULL,
      shopifyCustomerId TEXT,
      phone TEXT,
      course TEXT,
      bio TEXT
    )
  `);

  // Run dynamic schema migrations for stores or other tables if columns are missing
  try {
    await dbRun('ALTER TABLE stores ADD COLUMN username TEXT');
  } catch (e) {}

  try {
    await dbRun('ALTER TABLE stores ADD COLUMN passwordHash TEXT');
  } catch (e) {}
  
  try {
    await dbRun('ALTER TABLE students ADD COLUMN phone TEXT');
  } catch (e) {}

  try {
    await dbRun('ALTER TABLE students ADD COLUMN course TEXT');
  } catch (e) {}

  try {
    await dbRun('ALTER TABLE students ADD COLUMN bio TEXT');
  } catch (e) {}
 
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
