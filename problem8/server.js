const path = require('path');
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3003;
const sequelize = new Sequelize({ dialect: 'sqlite', storage: path.join(__dirname, 'students.sqlite'), logging: false });

const Student = sequelize.define('Student', {
  rollNo: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  course: { type: DataTypes.STRING, allowNull: false },
  semester: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 12 } }
}, { timestamps: true });

app.use(express.json());

app.get('/api/students', async (req, res) => {
  const students = await Student.findAll({ order: [['createdAt', 'DESC']] });
  res.json(students);
});

app.post('/api/students', async (req, res) => {
  try { res.status(201).json(await Student.create(req.body)); }
  catch (error) { res.status(400).json({ message: error.errors?.[0]?.message || 'Could not add student.' }); }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    await student.update(req.body);
    res.json(student);
  } catch (error) { res.status(400).json({ message: error.errors?.[0]?.message || 'Could not update student.' }); }
});

app.delete('/api/students/:id', async (req, res) => {
  const deleted = await Student.destroy({ where: { id: req.params.id } });
  if (!deleted) return res.status(404).json({ message: 'Student not found.' });
  res.json({ message: 'Student deleted.' });
});

app.use(express.static(path.join(__dirname, 'client', 'dist')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html')));

async function start() {
  await sequelize.sync();
  if (await Student.count() === 0) {
    await Student.create({ rollNo: 'STU001', name: 'Gun Patel', email: 'gun@example.com', course: 'MSc IT', semester: 4 });
  }
  app.listen(PORT, () => console.log(`Student CRUD running at http://localhost:${PORT}`));
}
start().catch(error => { console.error('Could not start server:', error.message); process.exit(1); });
