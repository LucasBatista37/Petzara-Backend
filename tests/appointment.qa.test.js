const supertest = require('supertest');
const express = require('express');
const { createAppointment } = require('../controllers/appointmentController');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');

// Mocks
vi.mock('../models/Appointment');
vi.mock('../models/Service');
vi.mock('../models/User');
vi.mock('../models/Transaction');
vi.mock('../models/Notification');
vi.mock('../utils/withTransaction', () => ({
    withTransaction: vi.fn(async (cb) => {
        return await cb({});
    })
}));
vi.mock('../utils/getOwnerId', () => ({ default: () => 'mockedOwnerId' }));

const app = express();
app.use(express.json());
// Inject fake req.user
app.use((req, res, next) => {
    req.user = { _id: 'mockedOwnerId' };
    next();
});
app.post('/api/appointments', createAppointment);

describe('Appointments Controller QA', () => {
    it('should prevent double booking with a 400 or 500 error if date and time overlap', async () => {
        // Mock Service 
        Service.findById = vi.fn().mockReturnValue({
            session: vi.fn().mockResolvedValue({ _id: 'serviceId', price: 50 })
        });
        Service.find = vi.fn().mockReturnValue({
            session: vi.fn().mockResolvedValue([])
        });

        // Assume an overlapping appointment exists!
        Appointment.findOne = vi.fn().mockReturnValue({
            session: vi.fn().mockResolvedValue({ _id: 'existingAppt' })
        });

        const payload = {
            petName: 'Rex',
            ownerName: 'Lucas',
            baseService: 'serviceId',
            date: '2026-02-28',
            time: '14:00',
            responsible: 'mockedOwnerId'
        };

        const response = await supertest(app)
            .post('/api/appointments')
            .send(payload);

        // Should return an error because of overlapping appointments
        expect(response.status).toBe(500);
        expect(response.body.message).toMatch(/Já existe um agendamento/);
    });
});
