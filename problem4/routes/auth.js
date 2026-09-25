const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");

const ADMIN_USERNAME = "admin";

const ADMIN_PASSWORD_HASH =
    "$2b$10$2MlyGxVaw/OKA1Rwjdoa1uJ9eeaMnrVzMefhzz6yq91QWNYRfL4de";

// Login page
router.get("/login", (req, res) => {
    res.render("login", {
        error: null
    });
});

// Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (username !== ADMIN_USERNAME) {
        return res.render("login", {
            error: "Invalid username or password"
        });
    }

    const isMatch = await bcrypt.compare(
        password,
        ADMIN_PASSWORD_HASH
    );

    if (!isMatch) {
        return res.render("login", {
            error: "Invalid username or password"
        });
    }

    req.session.admin = {
        username: username
    };

    res.redirect("/employees/dashboard");
});

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

module.exports = router;