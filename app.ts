import exp from 'express';
import { error } from 'node:console';
import { server,environment } from './config.js';
import { courseRouter } from './src/routes/cource.route.js';
import { studentRouter } from './src/routes/student.route.js';
const app: exp.Application = exp();

//add this first line
app.use(exp.json())
    
app.use("/courses", courseRouter);

app.use("/student", studentRouter);

app.listen(server.port, () => {
    console.log('Server is running on http://localhost:'+JSON.stringify(server)+"environement:"+environment);
} )      


export default app