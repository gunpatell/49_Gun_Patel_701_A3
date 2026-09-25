const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const Employee = require("../models/Employee");

// Authentication middleware
function isAdmin(req, res, next) {
    if (req.session.admin) {
        next();
    } else {
        res.redirect("/login");
    }
}

// Generate Employee ID
function generateEmpId() {
    return "EMP" + Date.now();
}

// Generate random password
function generatePassword() {
    return Math.random().toString(36).slice(-8);
}

// Email configuration
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Dashboard
router.get("/dashboard", isAdmin, async (req, res) => {
    const employees = await Employee.find();

    res.render("dashboard", {
        employees,
        admin: req.session.admin
    });
});

// Display employees
router.get("/", isAdmin, async (req, res) => {
    const employees = await Employee.find();

    res.render("employees", {
        employees
    });
});

// Add employee page
router.get("/add", isAdmin, (req, res) => {
    res.render("add-employee", {
        error: null
    });
});

// Insert employee
router.post("/add", isAdmin, async (req, res) => {
    try {
        const {
            name,
            email,
            department,
            designation,
            basicSalary
        } = req.body;

        // Generate ID
        const empid = generateEmpId();

        // Generate password
        const plainPassword = generatePassword();

        // Encrypt password
        const encryptedPassword = await bcrypt.hash(
            plainPassword,
            10
        );

        // Salary calculation
        const basic = Number(basicSalary);

        const hra = basic * 0.20;
        const da = basic * 0.10;
        const grossSalary = basic + hra + da;

        const employee = new Employee({
            empid,
            name,
            email,
            password: encryptedPassword,
            department,
            designation,
            basicSalary: basic,
            hra,
            da,
            grossSalary
        });

        await employee.save();

        // Send email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "ERP Employee Account",
            text: `
Hello ${name},

Your employee account has been created.

Employee ID: ${empid}
Password: ${plainPassword}

Please keep these credentials safe.

Regards,
ERP Admin
`
        });

        res.redirect("/employees");

    } catch (error) {
        console.log(error);

        res.render("add-employee", {
            error: "Error while adding employee"
        });
    }
});

// Edit page
router.get("/edit/:id", isAdmin, async (req, res) => {
    const employee = await Employee.findById(req.params.id);

    res.render("edit-employee", {
        employee
    });
});

// Update employee
router.post("/edit/:id", isAdmin, async (req, res) => {
    const {
        name,
        email,
        department,
        designation,
        basicSalary
    } = req.body;

    const basic = Number(basicSalary);

    const hra = basic * 0.20;
    const da = basic * 0.10;
    const grossSalary = basic + hra + da;

    await Employee.findByIdAndUpdate(
        req.params.id,
        {
            name,
            email,
            department,
            designation,
            basicSalary: basic,
            hra,
            da,
            grossSalary
        }
    );

    res.redirect("/employees");
});

// Delete employee
router.get("/delete/:id", isAdmin, async (req, res) => {
    await Employee.findByIdAndDelete(req.params.id);

    res.redirect("/employees");
});

module.exports = router;