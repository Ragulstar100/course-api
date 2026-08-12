// ==========================================
// 4. CONTROLLER LAYER (controller/student.controller.ts)
// ==========================================

import { type Request, type Response } from 'express';
import { 
  createNewStudent, 
  fetchAllStudents, 
  fetchStudentById, 
  modifyStudent,
  removeStudent as deleteStudent
} from '../service/student.service.js'; 
import type { UpdateStudentRequest } from '../models/student.model.js';

export async function createStudent(req: Request, res: Response): Promise<void> {
  try {
    const student = await createNewStudent(req.body);
    res.status(201).json({ message: 'Student created successfully', student });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create student', details: (error as Error).message });
  }
}

export async function getAllStudents(_req: Request, res: Response): Promise<void> {
  try {
    const students = await fetchAllStudents();
    res.status(200).json(students);
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch students', details: (error as Error).message });
  }
}

export async function getStudentById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const student = await fetchStudentById(id);
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student details', details: (error as Error).message });
  }
}

export async function updateStudent(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const updateData: UpdateStudentRequest = { id, ...req.body };
    
    const updatedStudent = await modifyStudent(updateData);
    if (!updatedStudent) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.status(200).json({ message: 'Student updated successfully', student: updatedStudent });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student', details: (error as Error).message });
  }
}

export async function removeStudent(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const success = await deleteStudent(id);
    if (!success) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.status(200).json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student', details: (error as Error).message });
  }
}