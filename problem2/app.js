const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bcrypt = require('bcryptjs');
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();

// View Engine & Middleware Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// Configure File-based Session Store
app.use(
    session({
        store: new FileStore({
            path: './sessions', // Directory where session files will be saved
            ttl: 3600,          // Time-to-live in seconds (1 hour)
            retries: 0
        }),
        secret: 'super-secret-key-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 3600000, // 1 hour in milliseconds
            httpOnly: true
        }
    })
);

// Mock User Database (Hashed Password for 'password123')
const USERS = [
    {
        id: 1,
        username: 'admin',
        passwordHash: bcrypt.hashSync('password123', 10),
        role: 'Administrator',
        email: 'admin@example.com'
    }
];

// Authentication Middleware
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

const redirectIfAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
};

// Global view variables middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// --- ROUTES ---

// 1. GET Login Form
app.get('/login', redirectIfAuth, (req, res) => {
    res.render('login', { errors: {}, username: '' });
});

// 2. POST Login Process
app.post('/login', redirectIfAuth, [
    body('username').trim().notEmpty().withMessage('Username is required.'),
    body('password').notEmpty().withMessage('Password is required.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMap = {};
        errors.array().forEach(err => { errorMap[err.path] = err.msg; });
        return res.render('login', { errors: errorMap, username: req.body.username });
    }

    const { username, password } = req.body;
    const user = USERS.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.render('login', {
            errors: { auth: 'Invalid username or password.' },
            username
        });
    }

    // Save session payload
    req.session.userId = user.id;
    req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
    };

    req.session.save((err) => {
        if (err) console.error('Session save error:', err);
        res.redirect('/dashboard');
    });
});

// 3. Protected Route 1: Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard');
});

// 4. Protected Route 2: Profile
app.get('/profile', requireAuth, (req, res) => {
    res.render('profile');
});

// 5. Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// Default Route Redirect
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});