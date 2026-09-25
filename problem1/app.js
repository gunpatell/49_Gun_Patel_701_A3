const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { body, validationResult } = require('express-validator');

const app = express();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Storage strategy
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + unique + path.extname(file.originalname).toLowerCase());
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file format for '${file.originalname}'. Only JPG, PNG, GIF, and WEBP allowed.`));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Define profilePic (1 file) and otherPics (up to 10 files)
const cpUpload = upload.fields([
    { name: 'profilePic', maxCount: 1 },
    { name: 'otherPics', maxCount: 10 }
]);

const formatErrors = (errorsArray) => {
    const errs = {};
    errorsArray.forEach(err => {
        if (!errs[err.path]) errs[err.path] = err.msg;
    });
    return errs;
};

// GET: Form
app.get('/', (req, res) => {
    res.render('form', { errors: {}, formData: {} });
});

// POST: Register Route
app.post('/register', 
    (req, res, next) => {
        cpUpload(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
                    req.multerError = 'Maximum 10 extra pictures allowed.';
                } else if (err.code === 'LIMIT_FILE_SIZE') {
                    req.multerError = 'Each file must be under 5MB.';
                } else {
                    req.multerError = err.message;
                }
            } else if (err) {
                req.multerError = err.message;
            }
            next();
        });
    },
    [
        body('username').trim().notEmpty().withMessage('Username is required.')
            .matches(/^[A-Za-z0-9_]{3,16}$/).withMessage('3-16 characters (letters, numbers, underscores).'),
        body('email').trim().notEmpty().withMessage('Email is required.')
            .isEmail().withMessage('Invalid email format.'),
        body('password').notEmpty().withMessage('Password is required.')
            .isLength({ min: 6 }).withMessage('Minimum 6 characters required.'),
        body('confirmPassword').notEmpty().withMessage('Confirm Password is required.')
            .custom((val, { req }) => {
                if (val !== req.body.password) throw new Error('Passwords do not match.');
                return true;
            }),
        body('gender').notEmpty().withMessage('Gender is required.'),
        body('hobbies').notEmpty().withMessage('Select at least one hobby.')
    ],
    (req, res) => {
        const errors = formatErrors(validationResult(req).array());

        if (req.multerError) {
            errors['fileError'] = req.multerError;
        }

        const hasProfilePic = req.files && req.files['profilePic'] && req.files['profilePic'].length > 0;
        if (!hasProfilePic && !errors['profilePic']) {
            errors['profilePic'] = 'Profile picture is required.';
        }

        if (Object.keys(errors).length > 0) {
            if (req.files) {
                Object.values(req.files).flat().forEach(f => fs.unlink(f.path, () => {}));
            }

            const hobbies = Array.isArray(req.body.hobbies) 
                ? req.body.hobbies 
                : (req.body.hobbies ? [req.body.hobbies] : []);

            return res.render('form', {
                errors: errors,
                formData: { 
                    ...req.body, 
                    hobbies: hobbies,
                    password: req.body.password || '', 
                    confirmPassword: req.body.confirmPassword || ''
                }
            });
        }

        // Parse profile picture
        const profilePic = req.files['profilePic'][0].filename;

        // Parse ALL uploaded files under 'otherPics' into an array
        const otherPics = (req.files['otherPics'] || []).map(file => file.filename);

        const hobbies = Array.isArray(req.body.hobbies) ? req.body.hobbies : [req.body.hobbies];

        res.render('result', {
            userData: {
                username: req.body.username,
                email: req.body.email,
                gender: req.body.gender,
                hobbies: hobbies,
                profilePic: profilePic,
                otherPics: otherPics // Array containing all file names
            }
        });
    }
);

app.listen(3000, () => console.log('Server running on http://localhost:3000'));