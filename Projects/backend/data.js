// In-memory database (nawawala pag nag-restart)
export const db = {
  users: [
    {
      id: 'P001',
      username: 'johndoe',
      password: 'password123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '09171234567',
      age: 34,
      bloodType: 'O+',
      nfcUid: '04A1B2C3D4',
    },
  ],

  rooms: [
    { id: '1', number: '101', type: 'Private', price: 3500, status: 'available' },
    { id: '2', number: '102', type: 'Semi-Private', price: 2000, status: 'available' },
    { id: '3', number: '103', type: 'Private', price: 3500, status: 'occupied' },
    { id: '4', number: '104', type: 'Semi-Private', price: 2000, status: 'available' },
    { id: '5', number: '105', type: 'Private', price: 4000, status: 'reserved' },
    { id: '6', number: '106', type: 'Semi-Private', price: 2200, status: 'available' },
  ],

  reservations: [],

  bills: [
    {
      id: 'B001',
      userId: 'P001',
      roomCharges: 10500,
      services: 2000,
      total: 12500,
      paid: 0,
    },
  ],

  payments: [],

  nfcCards: {
    '04A1B2C3D4': { userId: 'P001' },
    '04X9Y8Z7W6': { userId: 'P003' },
  },

  sessions: {},
};

export const makeToken = () =>
  'tok_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

export const makeId = (prefix) =>
  `${prefix}${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;