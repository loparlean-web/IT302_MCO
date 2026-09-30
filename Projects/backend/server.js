import express from 'express';
import cors from 'cors';
import { db, makeToken, makeId } from './data.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ---------- AUTH MIDDLEWARE ----------
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !db.sessions[token]) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = db.sessions[token];
  req.user = db.users.find((u) => u.id === req.userId);
  next();
};

// ---------- HEALTH ----------
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Patient Room Backend running' });
});

// ---------- AUTH ----------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const token = makeToken();
  db.sessions[token] = user.id;
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name, phone, email, age } = req.body;
  if (!username || !password || !name)
    return res.status(400).json({ error: 'Missing required fields' });
  if (db.users.find((u) => u.username === username))
    return res.status(400).json({ error: 'Username already exists' });

  const newUser = {
    id: makeId('P'),
    username,
    password,
    name,
    phone: phone || '',
    email: email || '',
    age: age || null,
    bloodType: null,
    nfcUid: null,
  };
  db.users.push(newUser);

  const token = makeToken();
  db.sessions[token] = newUser.id;
  const { password: _, ...safe } = newUser;
  res.json({ token, user: safe });
});

app.post('/api/auth/logout', auth, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  delete db.sessions[token];
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, (req, res) => {
  const { password: _, ...safe } = req.user;
  res.json(safe);
});

// ---------- PROFILE ----------
app.put('/api/profile', auth, (req, res) => {
  const { name, email, phone, age } = req.body;
  if (name) req.user.name = name;
  if (email !== undefined) req.user.email = email;
  if (phone !== undefined) req.user.phone = phone;
  if (age !== undefined) req.user.age = age;
  const { password: _, ...safe } = req.user;
  res.json(safe);
});

// ---------- ROOMS ----------
app.get('/api/rooms', (req, res) => res.json(db.rooms));

app.get('/api/rooms/:id', (req, res) => {
  const room = db.rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room);
});

// ---------- RESERVATIONS ----------
app.get('/api/reservations/current', auth, (req, res) => {
  const resv = db.reservations.find(
    (r) => r.userId === req.userId && r.status === 'active'
  );
  if (!resv) return res.json(null);
  const room = db.rooms.find((r) => r.id === resv.roomId);
  res.json({ ...resv, room });
});

app.post('/api/rooms/:id/reserve', auth, (req, res) => {
  const room = db.rooms.find((r) => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.status !== 'available')
    return res.status(400).json({ error: `Room is ${room.status}` });

  const existing = db.reservations.find(
    (r) => r.userId === req.userId && r.status === 'active'
  );
  if (existing)
    return res.status(400).json({ error: 'You already have a reservation' });

  const resv = {
    id: makeId('R'),
    userId: req.userId,
    roomId: room.id,
    checkIn: req.body.checkIn || new Date().toISOString().split('T')[0],
    status: 'active',
    reservedAt: new Date().toISOString(),
  };
  db.reservations.push(resv);
  room.status = 'reserved';
  res.json({ ...resv, room });
});

app.delete('/api/reservations/:id', auth, (req, res) => {
  const resv = db.reservations.find(
    (r) => r.id === req.params.id && r.userId === req.userId
  );
  if (!resv) return res.status(404).json({ error: 'Reservation not found' });
  const room = db.rooms.find((r) => r.id === resv.roomId);
  if (room) room.status = 'available';
  resv.status = 'cancelled';
  res.json({ ok: true });
});

// ---------- NFC ----------
app.post('/api/nfc/scan', auth, (req, res) => {
  const { nfcUid } = req.body;
  if (!nfcUid) return res.status(400).json({ error: 'Missing NFC UID' });
  const card = db.nfcCards[nfcUid];
  if (!card) return res.json({ verified: false, nfcUid });
  const patient = db.users.find((u) => u.id === card.userId);
  if (!patient) return res.json({ verified: false, nfcUid });
  const { password: _, ...safe } = patient;
  res.json({ verified: true, nfcUid, patient: safe });
});

// ---------- BILL & PAYMENTS ----------
app.get('/api/bill', auth, (req, res) => {
  let bill = db.bills.find((b) => b.userId === req.userId);
  if (!bill) {
    bill = {
      id: makeId('B'),
      userId: req.userId,
      roomCharges: 0,
      services: 0,
      total: 0,
      paid: 0,
    };
    db.bills.push(bill);
  }
  res.json(bill);
});

app.post('/api/payments', auth, (req, res) => {
  const { amount, method = 'NFC' } = req.body;
  if (!amount || amount <= 0)
    return res.status(400).json({ error: 'Invalid amount' });

  const success = Math.random() > 0.1;
  const payment = {
    id: makeId('TXN-'),
    userId: req.userId,
    amount,
    method,
    status: success ? 'successful' : 'failed',
    timestamp: new Date().toISOString(),
  };
  db.payments.push(payment);

  if (success) {
    const bill = db.bills.find((b) => b.userId === req.userId);
    if (bill) bill.paid += amount;
  }

  setTimeout(() => res.json(payment), 1200);
});

app.get('/api/payments/history', auth, (req, res) => {
  const list = db.payments
    .filter((p) => p.userId === req.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(list);
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`🏥 Backend running at http://localhost:${PORT}`);
  console.log(`📱 Frontend connects via http://192.168.1.69:${PORT}`);
});