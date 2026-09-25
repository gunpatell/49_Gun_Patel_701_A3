require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-me';

app.use(express.json());

const employeeSchema = new mongoose.Schema({
  empid: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  basicSalary: { type: Number, required: true },
  hra: { type: Number, required: true },
  da: { type: Number, required: true },
  grossSalary: { type: Number, required: true }
}, { timestamps: true });

const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  grant: { type: String, enum: ['yes', 'no'], default: 'no' }
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);
const LeaveApplication = mongoose.model('LeaveApplication', leaveSchema);

function signToken(employee) {
  return jwt.sign({ id: employee._id.toString(), email: employee.email }, JWT_SECRET, { expiresIn: '2h' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.employee = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Please log in again.' });
  }
}

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const employee = await Employee.findOne({ email });
    if (!employee) return res.status(401).json({ message: 'No employee found with this email.' });
    const employeeData = employee.toJSON();
    delete employeeData.password;
    res.json({ token: signToken(employee), employee: employeeData });
  } catch (error) {
    res.status(500).json({ message: 'Unable to log in right now.' });
  }
});

app.post('/api/auth/set-password', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const empid = String(req.body.empid || '').trim();
    const password = String(req.body.password || '');
    if (!email || !empid || password.length < 6) {
      return res.status(400).json({ message: 'Email, employee ID, and a password of at least 6 characters are required.' });
    }
    const employee = await Employee.findOne({ email, empid });
    if (!employee) return res.status(404).json({ message: 'Email and employee ID do not match.' });
    employee.password = await bcrypt.hash(password, 10);
    await employee.save();
    res.json({ message: 'Password created. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create the password right now.' });
  }
});

app.get('/api/employees/me', requireAuth, async (req, res) => {
  const employee = await Employee.findById(req.employee.id).select('-password');
  if (!employee) return res.status(404).json({ message: 'Employee not found.' });
  res.json(employee);
});

app.get('/api/leaves', requireAuth, async (req, res) => {
  const leaves = await LeaveApplication.find({ employee: req.employee.id }).sort({ date: -1 });
  res.json(leaves);
});

app.post('/api/leaves', requireAuth, async (req, res) => {
  try {
    const { date, reason, grant } = req.body;
    if (!date || !reason || !['yes', 'no'].includes(grant)) {
      return res.status(400).json({ message: 'Date, reason, and grant choice are required.' });
    }
    const leave = await LeaveApplication.create({ employee: req.employee.id, date, reason, grant });
    res.status(201).json(leave);
  } catch (error) {
    res.status(400).json({ message: 'Could not submit the leave application.' });
  }
});

app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get('*splat', (req, res) => res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html')));

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp_system');
  const demoEmail = (process.env.DEMO_EMAIL || '2023040259@vnsgu.ac.in').toLowerCase();
  const demoPassword = process.env.DEMO_PASSWORD || 'password123';
  if (!(await Employee.exists({ email: demoEmail }))) {
    await Employee.create({
      empid: `EMP${Date.now()}`, name: 'Demo Employee', email: demoEmail,
      password: await bcrypt.hash(demoPassword, 10),
      department: 'Operations', designation: 'Employee',
      basicSalary: 30000, hra: 6000, da: 3000, grossSalary: 39000
    });
    console.log(`Demo employee created: ${demoEmail}`);
  }
  app.listen(PORT, () => console.log(`Employee Hub API running at http://localhost:${PORT}`));
}

start().catch((error) => {
  console.error('Could not start server:', error.message);
  process.exit(1);
});
