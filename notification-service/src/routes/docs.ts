import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import { swaggerDef } from '../swagger';

const router = Router();

const options = {
  definition: swaggerDef,
  apis: ['src/routes/*.ts']
};

const spec = swaggerJSDoc(options);
router.use('/', swaggerUi.serve, swaggerUi.setup(spec));

export default router;
