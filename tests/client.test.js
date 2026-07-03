import request from 'supertest';
import { app } from '../src/app.js';
import { createOnboardedUser } from './helpers.js';

describe('Client module', () => {
  test('POST /api/client crea un cliente asociado a la compañía del usuario', async () => {
    const { accessToken } = await createOnboardedUser();

    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cliente S.L.', cif: 'B99999999', email: 'contacto@cliente.com' });

    expect(res.status).toBe(201);
    expect(res.body.data.client.name).toBe('Cliente S.L.');
    expect(res.body.data.client.cif).toBe('B99999999');
  });

  test('POST /api/client rechaza un CIF duplicado en la misma compañía', async () => {
    const { accessToken } = await createOnboardedUser();
    const payload = { name: 'Cliente S.L.', cif: 'B99999999' };

    await request(app).post('/api/client').set('Authorization', `Bearer ${accessToken}`).send(payload);
    const res = await request(app).post('/api/client').set('Authorization', `Bearer ${accessToken}`).send(payload);

    expect(res.status).toBe(409);
  });

  test('GET /api/client devuelve solo los clientes de la compañía propia (aislamiento multi-tenant)', async () => {
    const userA = await createOnboardedUser();
    const userB = await createOnboardedUser();

    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${userA.accessToken}`)
      .send({ name: 'Cliente A', cif: 'B11111111' });
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${userB.accessToken}`)
      .send({ name: 'Cliente B', cif: 'B22222222' });

    const res = await request(app).get('/api/client').set('Authorization', `Bearer ${userA.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.clients).toHaveLength(1);
    expect(res.body.data.clients[0].name).toBe('Cliente A');
  });

  test('DELETE /api/client/:id?soft=true archiva el cliente y GET /archived lo lista', async () => {
    const { accessToken } = await createOnboardedUser();

    const createRes = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cliente Temporal', cif: 'B33333333' });
    const clientId = createRes.body.data.client._id;

    const deleteRes = await request(app)
      .delete(`/api/client/${clientId}?soft=true`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await request(app).get('/api/client').set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.body.data.clients).toHaveLength(0);

    const archivedRes = await request(app)
      .get('/api/client/archived')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(archivedRes.body.data.clients).toHaveLength(1);
  });

  test('PATCH /api/client/:id/restore restaura un cliente archivado', async () => {
    const { accessToken } = await createOnboardedUser();

    const createRes = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Cliente Restaurable', cif: 'B44444444' });
    const clientId = createRes.body.data.client._id;

    await request(app).delete(`/api/client/${clientId}?soft=true`).set('Authorization', `Bearer ${accessToken}`);
    const restoreRes = await request(app)
      .patch(`/api/client/${clientId}/restore`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.data.client.deleted).toBe(false);
  });
});
