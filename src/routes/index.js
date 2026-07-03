import { Router } from 'express';
import { userRouter } from './user.routes.js';
import { clientRouter } from './client.routes.js';
import { projectRouter } from './project.routes.js';
import { deliveryNoteRouter } from './deliverynote.routes.js';

export const apiRouter = Router();

apiRouter.use('/user', userRouter);
apiRouter.use('/client', clientRouter);
apiRouter.use('/project', projectRouter);
apiRouter.use('/deliverynote', deliveryNoteRouter);
