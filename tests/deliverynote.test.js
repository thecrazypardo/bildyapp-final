import request from 'supertest';
import sharp from 'sharp';
import { app } from '../src/app.js';
import { createOnboardedUser } from './helpers.js';

const setupClientAndProject = async (accessToken) => {
  const clientRes = await request(app)
    .post('/api/client')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Cliente Albarán', cif: 'B88888888' });
  const client = clientRes.body.data.client;

  const projectRes = await request(app)
    .post('/api/project')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Proyecto Albarán', projectCode: 'PRJ-DN', client: client._id });
  const project = projectRes.body.data.project;

  return { client, project };
};

describe('DeliveryNote module', () => {
  test('POST /api/deliverynote crea un albarán de tipo material', async () => {
    const { accessToken } = await createOnboardedUser();
    const { client, project } = await setupClientAndProject(accessToken);

    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        format: 'material',
        client: client._id,
        project: project._id,
        workDate: '2026-06-01',
        material: 'Cemento',
        quantity: 10,
        unit: 'sacos'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.deliveryNote.format).toBe('material');
    expect(res.body.data.deliveryNote.signed).toBe(false);
  });

  test('POST /api/deliverynote crea un albarán de tipo horas con trabajadores', async () => {
    const { accessToken } = await createOnboardedUser();
    const { client, project } = await setupClientAndProject(accessToken);

    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        format: 'hours',
        client: client._id,
        project: project._id,
        workDate: '2026-06-02',
        workers: [{ name: 'Luis', hours: 8 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.deliveryNote.workers).toHaveLength(1);
  });

  test('POST /api/deliverynote de tipo horas sin hours ni workers falla la validación', async () => {
    const { accessToken } = await createOnboardedUser();
    const { client, project } = await setupClientAndProject(accessToken);

    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ format: 'hours', client: client._id, project: project._id, workDate: '2026-06-02' });

    expect(res.status).toBe(400);
  });

  test('PATCH /api/deliverynote/:id/sign firma el albarán y genera el PDF', async () => {
    const { accessToken } = await createOnboardedUser();
    const { client, project } = await setupClientAndProject(accessToken);

    const createRes = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        format: 'material',
        client: client._id,
        project: project._id,
        workDate: '2026-06-03',
        material: 'Ladrillos',
        quantity: 500,
        unit: 'unidades'
      });
    const noteId = createRes.body.data.deliveryNote._id;

    const signatureBuffer = await sharp({
      create: { width: 100, height: 50, channels: 3, background: '#ffffff' }
    })
      .png()
      .toBuffer();

    const signRes = await request(app)
      .patch(`/api/deliverynote/${noteId}/sign`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('signature', signatureBuffer, 'signature.png');

    expect(signRes.status).toBe(200);
    expect(signRes.body.data.deliveryNote.signed).toBe(true);
    expect(signRes.body.data.deliveryNote.signatureUrl).toBeTruthy();
  });

  test('DELETE /api/deliverynote/:id falla si el albarán ya está firmado', async () => {
    const { accessToken } = await createOnboardedUser();
    const { client, project } = await setupClientAndProject(accessToken);

    const createRes = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        format: 'material',
        client: client._id,
        project: project._id,
        workDate: '2026-06-04',
        material: 'Arena',
        quantity: 3,
        unit: 'm3'
      });
    const noteId = createRes.body.data.deliveryNote._id;

    const signatureBuffer = await sharp({
      create: { width: 50, height: 50, channels: 3, background: '#000000' }
    })
      .png()
      .toBuffer();

    await request(app)
      .patch(`/api/deliverynote/${noteId}/sign`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('signature', signatureBuffer, 'signature.png');

    const deleteRes = await request(app)
      .delete(`/api/deliverynote/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(deleteRes.status).toBe(403);
  });
});
