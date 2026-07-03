import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'BildyApp API',
      version: '2.0.0',
      description:
        'API REST para la digitalización de albaranes de BildyApp: usuarios, compañías, clientes, proyectos y albaranes.'
    },
    servers: [{ url: '/', description: 'Servidor actual' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            number: { type: 'string' },
            postal: { type: 'string' },
            city: { type: 'string' },
            province: { type: 'string' }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            lastName: { type: 'string' },
            nif: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'guest'] },
            status: { type: 'string', enum: ['pending', 'verified'] },
            company: { type: 'string', nullable: true }
          }
        },
        Company: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            owner: { type: 'string' },
            name: { type: 'string' },
            cif: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
            logo: { type: 'string', nullable: true },
            isFreelance: { type: 'boolean' }
          }
        },
        ClientInput: {
          type: 'object',
          required: ['name', 'cif'],
          properties: {
            name: { type: 'string' },
            cif: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' }
          }
        },
        Client: {
          allOf: [
            { $ref: '#/components/schemas/ClientInput' },
            {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                user: { type: 'string' },
                company: { type: 'string' },
                deleted: { type: 'boolean' }
              }
            }
          ]
        },
        ProjectInput: {
          type: 'object',
          required: ['name', 'projectCode', 'client'],
          properties: {
            name: { type: 'string' },
            projectCode: { type: 'string' },
            client: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
            email: { type: 'string' },
            notes: { type: 'string' },
            active: { type: 'boolean' }
          }
        },
        Project: {
          allOf: [
            { $ref: '#/components/schemas/ProjectInput' },
            {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                user: { type: 'string' },
                company: { type: 'string' },
                deleted: { type: 'boolean' }
              }
            }
          ]
        },
        DeliveryNoteInput: {
          type: 'object',
          required: ['format', 'client', 'project', 'workDate'],
          properties: {
            format: { type: 'string', enum: ['material', 'hours'] },
            client: { type: 'string' },
            project: { type: 'string' },
            description: { type: 'string' },
            workDate: { type: 'string', format: 'date' },
            material: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string' },
            hours: { type: 'number' },
            workers: {
              type: 'array',
              items: {
                type: 'object',
                properties: { name: { type: 'string' }, hours: { type: 'number' } }
              }
            }
          }
        },
        DeliveryNote: {
          allOf: [
            { $ref: '#/components/schemas/DeliveryNoteInput' },
            {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                user: { type: 'string' },
                company: { type: 'string' },
                signed: { type: 'boolean' },
                signedAt: { type: 'string', format: 'date-time', nullable: true },
                signatureUrl: { type: 'string', nullable: true },
                pdfUrl: { type: 'string', nullable: true },
                deleted: { type: 'boolean' }
              }
            }
          ]
        },
        Error: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object', nullable: true }
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js']
};

export const swaggerSpec = swaggerJsdoc(options);
