import AsyncStorage from '@react-native-async-storage/async-storage';

const K = {
  DB_VERSION: '@db_version',
  USERS: '@db_users',
  SESSIONS: '@db_sessions',
  ROOMS: '@db_rooms',
  RESERVATIONS: '@db_reservations',
  BILLS: '@db_bills',
  PAYMENTS: '@db_payments',
  NFC_CARDS: '@db_nfc',
  CURRENT_USER: '@current_user',
};

const DB_VERSION = 4;

const get = async (key, fallback = null) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const set = (key, value) => AsyncStorage.setItem(key, JSON.stringify(value));

const makeId = (prefix) =>
  `${prefix}${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

const makeToken = () =>
  'tok_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

// ============================================================
// SEED DATA
// ============================================================
const SEED_ROOMS = [
  { id: '1', number: '101', type: 'Private', price: 3500, status: 'available' },
  { id: '2', number: '102', type: 'Semi-Private', price: 2000, status: 'available' },
  { id: '3', number: '103', type: 'Private', price: 3500, status: 'occupied' },
  { id: '4', number: '104', type: 'Semi-Private', price: 2000, status: 'available' },
  { id: '5', number: '105', type: 'Private', price: 4000, status: 'reserved' },
  { id: '6', number: '106', type: 'Semi-Private', price: 2200, status: 'available' },
];

const SEED_USERS = [
  {
    id: 'A001',
    role: 'admin',
    username: 'admin',
    password: 'admin123',
    name: 'Hospital Admin',
    email: 'admin@hospital.com',
    phone: '09000000000',
    age: null,
    bloodType: null,
    nfcUid: null,
  },
];

const SEED_NFC = {};

// ============================================================
// INIT + MIGRATION
// ============================================================
const initDB = async () => {
  const currentVersion = await get(K.DB_VERSION, 0);
  const hasUsers = await get(K.USERS);

  if (!hasUsers || currentVersion < DB_VERSION) {
    console.log(`[API] Seeding DB (v${currentVersion} → v${DB_VERSION})`);

    await set(K.USERS, SEED_USERS);
    await set(K.ROOMS, SEED_ROOMS);
    await set(K.RESERVATIONS, []);
    await set(K.BILLS, []);
    await set(K.PAYMENTS, []);
    await set(K.NFC_CARDS, SEED_NFC);
    await set(K.SESSIONS, {});
    await set(K.DB_VERSION, DB_VERSION);

    console.log('[API] Seed complete. Admin: admin / admin123');
  }
};

// ============================================================
// API
// ============================================================
export const API = {
  init: initDB,

  // ---------- AUTH ----------
  login: async (username, password) => {
    await delay();
    const users = await get(K.USERS, []);
    const user = users.find(
      (u) => u.username === username && u.password === password
    );
    if (!user) throw new Error('Invalid credentials');

    const token = makeToken();
    const sessions = await get(K.SESSIONS, {});
    sessions[token] = user.id;
    await set(K.SESSIONS, sessions);
    await set(K.CURRENT_USER, user.id);

    const { password: _, ...safe } = user;
    return { token, user: safe };
  },

  register: async (payload) => {
    await delay();
    const users = await get(K.USERS, []);
    if (users.find((u) => u.username === payload.username)) {
      throw new Error('Username already exists');
    }

    const newUser = {
      id: makeId('P'),
      role: 'patient',
      username: payload.username,
      password: payload.password,
      name: payload.name,
      phone: payload.phone || '',
      email: payload.email || '',
      age: payload.age || null,
      bloodType: null,
      nfcUid: null,
    };
    users.push(newUser);
    await set(K.USERS, users);

    const token = makeToken();
    const sessions = await get(K.SESSIONS, {});
    sessions[token] = newUser.id;
    await set(K.SESSIONS, sessions);
    await set(K.CURRENT_USER, newUser.id);

    const { password: _, ...safe } = newUser;
    return { token, user: safe };
  },

  logout: async () => {
    await AsyncStorage.removeItem(K.CURRENT_USER);
  },

  me: async () => {
    const userId = await get(K.CURRENT_USER);
    if (!userId) return null;

    const users = await get(K.USERS, []);
    const user = users.find((u) => u.id === userId);
    if (!user) return null;

    const { password: _, ...safe } = user;
    return safe;
  },

  updateProfile: async (payload) => {
    await delay();
    const userId = await get(K.CURRENT_USER);
    const users = await get(K.USERS, []);
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');

    if (payload.name) users[idx].name = payload.name;
    if (payload.email !== undefined) users[idx].email = payload.email;
    if (payload.phone !== undefined) users[idx].phone = payload.phone;
    if (payload.age !== undefined) users[idx].age = payload.age;

    await set(K.USERS, users);
    const { password: _, ...safe } = users[idx];
    return safe;
  },

  // ---------- ROOMS ----------
  getRooms: async () => {
    await delay(200);
    return await get(K.ROOMS, []);
  },

  getRoom: async (id) => {
    await delay(200);
    const rooms = await get(K.ROOMS, []);
    const room = rooms.find((r) => r.id === id);
    if (!room) throw new Error('Room not found');
    return room;
  },

  // ---------- RESERVATIONS ----------
  getCurrentReservation: async () => {
    await delay(200);
    const userId = await get(K.CURRENT_USER);
    if (!userId) return null;

    const reservations = await get(K.RESERVATIONS, []);
    const resv = reservations.find(
      (r) => r.userId === userId && r.status === 'active'
    );
    if (!resv) return null;

    const rooms = await get(K.ROOMS, []);
    const room = rooms.find((r) => r.id === resv.roomId);
    return { ...resv, room };
  },

  reserveRoom: async (roomId, checkIn) => {
    await delay();
    const userId = await get(K.CURRENT_USER);
    if (!userId) throw new Error('Not logged in');

    const rooms = await get(K.ROOMS, []);
    const room = rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'available') throw new Error(`Room is ${room.status}`);

    const reservations = await get(K.RESERVATIONS, []);
    const existing = reservations.find(
      (r) => r.userId === userId && r.status === 'active'
    );
    if (existing) throw new Error('You already have a reservation');

    const resv = {
      id: makeId('R'),
      userId,
      roomId: room.id,
      checkIn: checkIn || new Date().toISOString().split('T')[0],
      status: 'active',
      reservedAt: new Date().toISOString(),
    };
    reservations.push(resv);
    await set(K.RESERVATIONS, reservations);

    room.status = 'reserved';
    await set(K.ROOMS, rooms);

    return { ...resv, room };
  },

  // ============================================================
// 🏥 CHECKOUT / DISCHARGE
// ============================================================
// Kunin ang checkout info ng kasalukuyang user
checkoutInfo: async () => {
  await delay(200);
  const userId = await get(K.CURRENT_USER);
  if (!userId) return null;

  const reservations = await get(K.RESERVATIONS, []);
  const resv = reservations.find(
    (r) => r.userId === userId && r.status === 'active'
  );
  if (!resv) return null;

  const rooms = await get(K.ROOMS, []);
  const room = rooms.find((r) => r.id === resv.roomId);

  const bills = await get(K.BILLS, []);
  const bill = bills.find((b) => b.userId === userId);

  const total = bill?.total || 0;
  const paid = bill?.paid || 0;
  const balance = Math.max(0, total - paid);

  return {
    reservation: { ...resv, room },
    bill,
    total,
    paid,
    balance,
    canCheckout: balance <= 0,
  };
},

// I-checkout ang patient (kailangan fully paid)
checkoutRoom: async () => {
  await delay();
  const userId = await get(K.CURRENT_USER);
  if (!userId) throw new Error('Not logged in');

  // 1. Hanapin ang active reservation
  const reservations = await get(K.RESERVATIONS, []);
  const idx = reservations.findIndex(
    (r) => r.userId === userId && r.status === 'active'
  );
  if (idx === -1) throw new Error('No active reservation found');

  // 2. Hanapin ang bill
  const bills = await get(K.BILLS, []);
  const billIdx = bills.findIndex((b) => b.userId === userId);
  if (billIdx === -1) throw new Error('No bill found');

  const bill = bills[billIdx];
  const balance = bill.total - bill.paid;

  // 3. Block kung may balance pa
  if (balance > 0) {
    throw new Error(
      `Outstanding balance of ₱${balance.toFixed(2)}. Please settle your bill first.`
    );
  }

  // 4. Mark reservation as completed
  reservations[idx].status = 'completed';
  reservations[idx].checkedOutAt = new Date().toISOString();
  await set(K.RESERVATIONS, reservations);

  // 5. Free up the room
  const roomId = reservations[idx].roomId;
  const rooms = await get(K.ROOMS, []);
  const roomIdx = rooms.findIndex((r) => r.id === roomId);
  if (roomIdx !== -1) rooms[roomIdx].status = 'available';
  await set(K.ROOMS, rooms);

  // 6. Mark bill as closed
  bills[billIdx].closedAt = new Date().toISOString();
  await set(K.BILLS, bills);

  return {
    ok: true,
    roomNumber: rooms[roomIdx]?.number || '?',
    checkedOutAt: reservations[idx].checkedOutAt,
  };
},

  // ============================================================
  // 📱 NFC
  // ============================================================
  nfcGetMyCard: async () => {
    const userId = await get(K.CURRENT_USER);
    if (!userId) return null;

    const cards = await get(K.NFC_CARDS, {});
    const entry = Object.entries(cards).find(([_, v]) => v.userId === userId);
    return entry ? entry[0] : null;
  },

  nfcRegister: async (nfcUid) => {
    await delay();
    const userId = await get(K.CURRENT_USER);
    if (!userId) throw new Error('Not logged in');
    if (!nfcUid) throw new Error('Missing NFC UID');

    const cards = await get(K.NFC_CARDS, {});
    const existing = cards[nfcUid];
    if (existing && existing.userId !== userId) {
      throw new Error('Card already registered to another user');
    }

    cards[nfcUid] = { userId };
    await set(K.NFC_CARDS, cards);

    const users = await get(K.USERS, []);
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx].nfcUid = nfcUid;
      await set(K.USERS, users);
    }

    return { ok: true, nfcUid };
  },

  nfcUnregister: async () => {
    await delay();
    const userId = await get(K.CURRENT_USER);
    if (!userId) throw new Error('Not logged in');

    const cards = await get(K.NFC_CARDS, {});
    const uidToRemove = Object.keys(cards).find(
      (k) => cards[k].userId === userId
    );
    if (uidToRemove) {
      delete cards[uidToRemove];
      await set(K.NFC_CARDS, cards);
    }

    const users = await get(K.USERS, []);
    const idx = users.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users[idx].nfcUid = null;
      await set(K.USERS, users);
    }

    return { ok: true };
  },

  scanNfc: async (nfcUid) => {
    await delay(800);
    if (!nfcUid) throw new Error('Missing NFC UID');

    const cards = await get(K.NFC_CARDS, {});
    const card = cards[nfcUid];
    if (!card) return { verified: false, nfcUid };

    const users = await get(K.USERS, []);
    const patient = users.find((u) => u.id === card.userId);
    if (!patient) return { verified: false, nfcUid };

    const { password: _, ...safe } = patient;
    return { verified: true, nfcUid, patient: safe };
  },

  nfcGenerateUid: () => {
    const hex = '0123456789ABCDEF';
    let uid = '';
    for (let i = 0; i < 10; i++) {
      uid += hex[Math.floor(Math.random() * 16)];
    }
    return uid;
  },

  // ---------- BILL & PAYMENTS ----------
  getBill: async () => {
    await delay(200);
    const userId = await get(K.CURRENT_USER);
    if (!userId) return { total: 0, paid: 0, roomCharges: 0, services: 0 };

    const bills = await get(K.BILLS, []);
    let bill = bills.find((b) => b.userId === userId);

    if (!bill) {
      bill = {
        id: makeId('B'),
        userId,
        roomCharges: 10500,
        services: 2000,
        total: 12500,
        paid: 0,
      };
      bills.push(bill);
      await set(K.BILLS, bills);
    }
    return bill;
  },

  pay: async (amount, method = 'NFC') => {
    await delay(1200);
    if (!amount || amount <= 0) throw new Error('Invalid amount');

    const userId = await get(K.CURRENT_USER);
    if (!userId) throw new Error('Not logged in');

    const success = Math.random() > 0.1;
    const payment = {
      id: makeId('TXN-'),
      userId,
      amount,
      method,
      status: success ? 'successful' : 'failed',
      timestamp: new Date().toISOString(),
    };

    const payments = await get(K.PAYMENTS, []);
    payments.push(payment);
    await set(K.PAYMENTS, payments);

    if (success) {
      const bills = await get(K.BILLS, []);
      const idx = bills.findIndex((b) => b.userId === userId);
      if (idx !== -1) {
        bills[idx].paid += amount;
        await set(K.BILLS, bills);
      }
    }

    return payment;
  },

  getPaymentHistory: async () => {
    await delay(200);
    const userId = await get(K.CURRENT_USER);
    if (!userId) return [];

    const payments = await get(K.PAYMENTS, []);
    return payments
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  // ============================================================
  // 👨‍💼 ADMIN API
  // ============================================================
  adminGetStats: async () => {
    await delay(200);
    const [users, rooms, reservations, payments] = await Promise.all([
      get(K.USERS, []),
      get(K.ROOMS, []),
      get(K.RESERVATIONS, []),
      get(K.PAYMENTS, []),
    ]);

    return {
      totalUsers: users.filter((u) => u.role === 'patient').length,
      totalRooms: rooms.length,
      availableRooms: rooms.filter((r) => r.status === 'available').length,
      occupiedRooms: rooms.filter((r) => r.status === 'occupied').length,
      reservedRooms: rooms.filter((r) => r.status === 'reserved').length,
      activeReservations: reservations.filter((r) => r.status === 'active').length,
      totalPayments: payments.filter((p) => p.status === 'successful').length,
      totalRevenue: payments
        .filter((p) => p.status === 'successful')
        .reduce((sum, p) => sum + p.amount, 0),
    };
  },

  adminGetUsers: async () => {
    await delay(200);
    const users = await get(K.USERS, []);
    return users
      .filter((u) => u.role === 'patient')
      .map(({ password, ...safe }) => safe);
  },

  adminGetReservations: async () => {
    await delay(200);
    const reservations = await get(K.RESERVATIONS, []);
    const users = await get(K.USERS, []);
    const rooms = await get(K.ROOMS, []);

    return reservations
      .map((r) => ({
        ...r,
        user: users.find((u) => u.id === r.userId)?.name || 'Unknown',
        room: rooms.find((rm) => rm.id === r.roomId)?.number || '?',
      }))
      .sort((a, b) => new Date(b.reservedAt) - new Date(a.reservedAt));
  },

  adminGetPayments: async () => {
    await delay(200);
    const payments = await get(K.PAYMENTS, []);
    const users = await get(K.USERS, []);

    return payments
      .map((p) => ({
        ...p,
        userName: users.find((u) => u.id === p.userId)?.name || 'Unknown',
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  adminSetRoomStatus: async (roomId, status) => {
    await delay();
    const rooms = await get(K.ROOMS, []);
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) throw new Error('Room not found');

    rooms[idx].status = status;
    await set(K.ROOMS, rooms);
    return rooms[idx];
  },

  // ✨ BAGO: I-update ang room (price, type, status)
  adminUpdateRoom: async (roomId, updates) => {
    await delay();
    const rooms = await get(K.ROOMS, []);
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) throw new Error('Room not found');

    const room = rooms[idx];

    if (updates.price !== undefined) {
      const price = Number(updates.price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Price must be a positive number');
      }
      room.price = price;
    }

    if (updates.type) {
      if (!['Private', 'Semi-Private'].includes(updates.type)) {
        throw new Error('Invalid room type');
      }
      room.type = updates.type;
    }

    if (updates.status) {
      if (!['available', 'reserved', 'occupied'].includes(updates.status)) {
        throw new Error('Invalid status');
      }
      room.status = updates.status;
    }

    await set(K.ROOMS, rooms);
    return room;
  },

  // ---------- DEV TOOLS ----------
  resetAll: async () => {
    await AsyncStorage.multiRemove(Object.values(K));
    await initDB();
  },

  getAllData: async () => {
    return {
      users: await get(K.USERS, []),
      rooms: await get(K.ROOMS, []),
      reservations: await get(K.RESERVATIONS, []),
      bills: await get(K.BILLS, []),
      payments: await get(K.PAYMENTS, []),
      nfcCards: await get(K.NFC_CARDS, {}),
    };
  },
};

export default API;