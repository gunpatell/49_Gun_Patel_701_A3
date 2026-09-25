const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
    {
        empid: {
            type: String,
            unique: true,
            required: true
        },

        name: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true
        },

        password: {
            type: String,
            required: true
        },

        department: {
            type: String,
            required: true
        },

        designation: {
            type: String,
            required: true
        },

        basicSalary: {
            type: Number,
            required: true
        },

        hra: {
            type: Number,
            required: true
        },

        da: {
            type: Number,
            required: true
        },

        grossSalary: {
            type: Number,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Employee", employeeSchema);