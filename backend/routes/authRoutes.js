const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

const JWT_SECRET =
    process.env.JWT_SECRET || "construction_inventory_secret";


router.post("/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });
        }


        const [users] = await pool.query(
            `SELECT id, username, email, password, role
             FROM users
             WHERE username = ?`,
            [username]
        );


        if (users.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }


        const user = users[0];


        if (password !== user.password) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });
        }


        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );


        res.json({
            success: true,
            message: "Login successful",

            token: token,

            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });


    } catch (error) {

        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Server error during login."
        });
    }

});


module.exports = router;