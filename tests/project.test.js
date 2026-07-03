import request from 'supertest';
import { app } from '../src/app.js';
import { createOnboardedUser } from './helpers.js';

const createClient = async (accessToken, overrides = {}) => {
  const res = await request(app)
    .post('/api/client')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Cliente Proyecto', cif: 'B55555555', ...overrides });
  return res.body.data.client;
};

describe('Project module', () => {
  test('POST /api/project crea un proyecto ligado a un cliente existente', async () => {
    const { accessToken } = await createOnboardedUser();
    const client = await createClient(accessToken);

    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Reforma oficina', projectCode: 'PRJ-001', client: client._id });

    expect(res.status).toBe(201);
    expect(res.body.data.project.projectCode).toBe('PRJ-001');
  });

  test('POST /api/project rechaza un cliente que no existe en la compañía', async () => {
    const { accessToken } = await createOnboardedUser();
    const fakeClientId = '64b7f3f1f1f1f1f1f1f1f1f1';

    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Reforma oficina', projectCode: 'PRJ-002', client: fakeClientId });

    expect(res.status).toBe(400);
  });

  test('GET /api/project/:id devuelve el proyecto con el cliente populado', async () => {
    const { accessToken } = await createOnboardedUser();
    const client = await createClient(accessToken);
    const createRes = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Reforma oficina', projectCode: 'PRJ-003', client: client._id });

    const res = await request(app)
      .get(`/api/project/${createRes.body.data.project._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.project.client.name).toBe('Cliente Proyecto');
  });

  test('GET /api/project filtra por client', async () => {
    const { accessToken } = await createOnboardedUser();
    const clientA = await createClient(accessToken, { cif: 'B66666666' });
    const clientB = await createClient(accessToken, { name: 'Otro cliente', cif: 'B77777777' });

    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Proyecto A', projectCode: 'PRJ-A', client: clientA._id });
    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Proyecto B', projectCode: 'PRJ-B', client: clientB._id });

    const res = await request(app)
      .get(`/api/project?client=${clientA._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.body.data.projects).toHaveLength(1);
    expect(res.body.data.projects[0].projectCode).toBe('PRJ-A');
  });
});
