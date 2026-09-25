require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3004;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'problem3-development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 60 * 60 * 1000 }
}));

const DEMO_USER = { username: 'student', password: 'student123', name: 'Gun Patel', email: 'gun@example.com' };
function requireLogin(req, res, next) { if (req.session.user) return next(); res.redirect('/login'); }
function redirectIfLoggedIn(req, res, next) { if (req.session.user) return res.redirect('/dashboard'); next(); }

app.get('/login', redirectIfLoggedIn, (req, res) => res.render('login', { error: '' }));
app.post('/login', redirectIfLoggedIn, (req, res) => {
  const { username, password } = req.body;
  if (username !== DEMO_USER.username || password !== DEMO_USER.password) return res.status(401).render('login', { error: 'Invalid username or password.' });
  req.session.user = { name: DEMO_USER.name, email: DEMO_USER.email, username: DEMO_USER.username };
  res.redirect('/dashboard');
});
app.get('/dashboard', requireLogin, (req, res) => res.render('dashboard', { user: req.session.user }));
app.get('/profile', requireLogin, (req, res) => res.render('profile', { user: req.session.user }));
app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));
app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));

async function start() {
  app.listen(PORT, () => console.log(`Problem 3 running at http://localhost:${PORT}`));
}
start().catch(error => { console.error('Could not start:', error.message); process.exit(1); });
