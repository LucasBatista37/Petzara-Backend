/* vi.mock é hoistado para o topo pelo Vitest — manter mocks antes dos requires do controller */
vi.mock('../utils/withTransaction', () => ({
    withTransaction: (cb) => cb({}),
}));
vi.mock('../models/Appointment', () => ({}));
vi.mock('../models/Service', () => ({}));
vi.mock('../models/User');
vi.mock('../models/Transaction');
vi.mock('../models/Notification');
vi.mock('../utils/getOwnerId', () => () => 'mockedOwnerId');

const { createAppointment } = require('../controllers/appointmentController');

describe('Appointments Controller QA', () => {
    it('should return 400 when required fields are missing', async () => {
        const req = {
            body: {},
            user: { _id: 'mockedOwnerId' },
            app: { get: () => null },
        };
        const res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        await createAppointment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

});
