import '@shopify/shopify-api/adapters/node';
import exp from 'express';
import { server, environment } from './config.js';
import { courseRouter } from './src/routes/cource.route.js';
import { studentRouter } from './src/routes/student.route.js';
import { merchantRouter } from './src/routes/merchant.route.js';
import { initializeDatabase } from './src/dal/db.js';

const app: exp.Application = exp();

app.use(exp.json());


app.use('/courses', courseRouter);
app.use('/student', studentRouter);
app.use('/shopify', merchantRouter);


initializeDatabase().then(() => {

  app.listen(server.port, () => {
    console.log(`Server is running on http://localhost:${server.port} in ${environment} mode`);
  });
  
}).catch((error) => {
  console.error('Fatal error initializing database:', error);
});

export default app;