require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'problem7-development-secret';
app.use(express.json());

const userSchema = new mongoose.Schema({ email: { type: String, unique: true, lowercase: true }, password: String, role: { type: String, enum: ['admin', 'user'], default: 'user' } }, { timestamps: true });
const categorySchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null } }, { timestamps: true });
const productSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, description: String, price: { type: Number, required: true, min: 0 }, stock: { type: Number, default: 0, min: 0 }, category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true } }, { timestamps: true });
const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);

function tokenFor(user) { return jwt.sign({ id: user._id.toString(), role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '4h' }); }
function auth(req, res, next) {
  const value = req.headers.authorization || '';
  try { req.user = jwt.verify(value.startsWith('Bearer ') ? value.slice(7) : '', JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Please log in.' }); }
}
function adminOnly(req, res, next) { if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' }); next(); }

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid email or password.' });
  res.json({ token: tokenFor(user), user: { email: user.email, role: user.role } });
});
app.get('/api/categories', async (req, res) => res.json(await Category.find().sort({ name: 1 })));
app.get('/api/products', async (req, res) => {
  const filter = req.query.category ? { category: req.query.category } : {};
  res.json(await Product.find(filter).populate('category', 'name parent').sort({ createdAt: -1 }));
});
app.post('/api/categories', auth, adminOnly, async (req, res) => {
  const category = await Category.create({ name: req.body.name, parent: req.body.parent || null });
  res.status(201).json(category);
});
app.delete('/api/categories/:id', auth, adminOnly, async (req, res) => {
  await Category.deleteOne({ _id: req.params.id });
  await Product.deleteMany({ category: req.params.id });
  await Category.deleteMany({ parent: req.params.id });
  res.json({ message: 'Category deleted.' });
});
app.post('/api/products', auth, adminOnly, async (req, res) => {
  const product = await Product.create({ name: req.body.name, description: req.body.description, price: req.body.price, stock: req.body.stock, category: req.body.category });
  res.status(201).json(await product.populate('category', 'name parent'));
});
app.delete('/api/products/:id', auth, adminOnly, async (req, res) => { await Product.deleteOne({ _id: req.params.id }); res.json({ message: 'Product deleted.' }); });

app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get('*splat', (req, res) => res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html')));

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/problem7');
  const adminPassword = await bcrypt.hash('admin123', 10);
  await User.updateOne({ email: 'admin@example.com' }, { $setOnInsert: { email: 'admin@example.com', password: adminPassword, role: 'admin' } }, { upsert: true });
  const userPassword = await bcrypt.hash('user123', 10);
  await User.updateOne({ email: 'user@example.com' }, { $setOnInsert: { email: 'user@example.com', password: userPassword, role: 'user' } }, { upsert: true });
  if (await Product.countDocuments() === 0) {
    const electronics = await Category.findOneAndUpdate({ name: 'Electronics', parent: null }, { $setOnInsert: { name: 'Electronics' } }, { upsert: true, new: true });
    const mobiles = await Category.findOneAndUpdate({ name: 'Mobiles', parent: electronics._id }, { $setOnInsert: { name: 'Mobiles', parent: electronics._id } }, { upsert: true, new: true });
    const books = await Category.findOneAndUpdate({ name: 'Books', parent: null }, { $setOnInsert: { name: 'Books' } }, { upsert: true, new: true });
    await Product.insertMany([
      { name: 'Wireless Headphones', description: 'Comfortable Bluetooth headphones.', price: 1499, stock: 12, category: electronics._id },
      { name: 'Smartphone', description: 'A simple everyday smartphone.', price: 12999, stock: 8, category: mobiles._id },
      { name: 'JavaScript Basics', description: 'A beginner-friendly programming book.', price: 599, stock: 20, category: books._id }
    ]);
  }
  app.listen(PORT, () => console.log(`Shopping cart running at http://localhost:${PORT}`));
}
start().catch(error => { console.error('Could not start server:', error.message); process.exit(1); });
