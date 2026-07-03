import request from 'supertest';
import { app } from '../src/app.js';
import { User } from '../src/models/User.js';

const credentials = { email: 'ana@example.com', password: 'password123' };

const registerAndGetToken = async () => {
  const res = await request(app).post('/api/user/register').send(credentials);
  return res.body.data;
};

describe('User module', () => {
  test('POST /api/user/register crea un usuario pendiente y devuelve tokens', async () => {
    const res = await request(app).post('/api/user/register').send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.user.email).toBe(credentials.email);
    expect(res.body.data.user.status).toBe('pending');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  test('POST /api/user/register rechaza un email duplicado ya verificado', async () => {
    await registerAndGetToken();
    const user = await User.findOne({ email: credentials.email });
    user.status = 'verified';
    await user.save();

    const res = await request(app).post('/api/user/register').send(credentials);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('PUT /api/user/validation verifica el email con el código correcto', async () => {
    const { accessToken } = await registerAndGetToken();
    const user = await User.findOne({ email: credentials.email }).select('+verificationCode');

    const res = await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: user.verificationCode });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('PUT /api/user/validation rechaza un código incorrecto y descuenta intentos', async () => {
    const { accessToken } = await registerAndGetToken();

    const res = await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error.details.attemptsLeft).toBe(2);
  });

  test('POST /api/user/login falla con credenciales incorrectas', async () => {
    await registerAndGetToken();

    const res = await request(app)
      .post('/api/user/login')
      .send({ email: credentials.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  test('GET /api/user requiere autenticación', async () => {
    const res = await request(app).get('/api/user');
    expect(res.status).toBe(401);
  });

  test('Flujo completo: registro, verificación, onboarding y compañía', async () => {
    const { accessToken } = await registerAndGetToken();
    const user = await User.findOne({ email: credentials.email }).select('+verificationCode');

    await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: user.verificationCode });

    await request(app)
      .put('/api/user/register')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ana', lastName: 'García', nif: '12345678Z' });

    const companyRes = await request(app)
      .patch('/api/user/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ isFreelance: false, name: 'Acme Corp', cif: 'B12345678' });

    expect(companyRes.status).toBe(200);
    expect(companyRes.body.data.user.role).toBe('admin');
    expect(companyRes.body.data.user.company.cif).toBe('B12345678');
  });

  test('PATCH /api/user/company mantiene el role admin si el usuario ya es el owner', async () => {
    const { accessToken } = await registerAndGetToken();
    const payload = { isFreelance: false, name: 'Acme Corp', cif: 'B12345678' };

    await request(app).patch('/api/user/company').set('Authorization', `Bearer ${accessToken}`).send(payload);
    const secondRes = await request(app)
      .patch('/api/user/company')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload);

    expect(secondRes.body.data.user.role).toBe('admin');
  });
});
