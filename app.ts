import exp from 'express';
import { error } from 'node:console';
import { server,environment } from './config.js';
const app: exp.Application = exp();

//add this first line
app.use(exp.json())

app.get('/', (req: exp.Request, res: exp.Response) => {
    
res.status(200).json("hello")
    
})

app.listen(server.port, () => {
    console.log('Server is running on http://localhost:'+JSON.stringify(server)+"environement:"+environment);
} )      


export default app