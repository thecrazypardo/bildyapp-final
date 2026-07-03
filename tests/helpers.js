import request from 'supertest';
import { app } from '../src/app.js';

let counter = 0;

// Crea un usuario admin totalmente verificado y con compañía, listo para
// probar los módulos de client/project/deliverynote.
export const createOnboardedUser = async () => {
  counter += 1;
  const email = `user${counter}@example.com`;
  const password = 'password123';

  const registerRes = await request(app).post('/api/user/register').send({ email, password });
  const { accessToken } = registerRes.body.data;

  const { User } = await import('../src/models/User.js');
  const user = await User.findOne({ email }).select('+verificationCode');

  await request(app)
    .put('/api/user/validation')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ code: user.verificationCode });

  const companyRes = await request(app)
    .patch('/api/user/company')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ isFreelance: false, name: `Company ${counter}`, cif: `B1234567${counter}` });

  return {
    accessToken,
    email,
    password,
    companyId: companyRes.body.data.user.company._id
  };
};
