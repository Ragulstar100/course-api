import exp from 'express';
import { error } from 'node:console';
import { server,environment } from './config.js';
import { CourseController, CourseManagerService, SQLiteCourseDAL, createCourseRouter } from './course.js';
const app: exp.Application = exp();

//add this first line
app.use(exp.json())
    
app.use("/courses", createCourseRouter(new CourseController(new CourseManagerService(new SQLiteCourseDAL()))));

app.listen(server.port, () => {
    console.log('Server is running on http://localhost:'+JSON.stringify(server)+"environement:"+environment);
} )      


export default app