import exp from 'express';
import { error } from 'node:console';
import { server,environment } from './config.js';
import { CourseController, CourseManagerService, SQLiteCourseDAL, createCourseRouter } from './course.js';
import { createStudentRouter, SQLiteStudentDAL, StudentController, StudentManagerService } from './student.js';
import { courseRouter } from './src/routes/cource.route.js';
const app: exp.Application = exp();

//add this first line
app.use(exp.json())
    
app.use("/courses", courseRouter);

app.use("/student", createStudentRouter(new StudentController(new StudentManagerService(new SQLiteStudentDAL()))));

app.listen(server.port, () => {
    console.log('Server is running on http://localhost:'+JSON.stringify(server)+"environement:"+environment);
} )      


export default app