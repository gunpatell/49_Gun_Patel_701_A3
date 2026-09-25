const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// EJS
app.set("view engine", "ejs");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Session
app.use(
    session({
        secret: process.env.SESSION_SECRET || "problem4_secret",
        resave: false,
        saveUninitialized: false
    })
);

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
    })
    .catch((err) => {
        console.log("MongoDB Error:", err);
    });

// Routes
const authRoutes = require("./routes/auth");
const employeeRoutes = require("./routes/employees");

app.use("/", authRoutes);
app.use("/employees", employeeRoutes);

// Home
app.get("/", (req, res) => {
    res.redirect("/login");
});

// Server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});