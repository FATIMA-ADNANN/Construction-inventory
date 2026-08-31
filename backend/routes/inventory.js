const express = require("express");
const router = express.Router();

const pool = require("../db");
const authenticateToken = require("../middleware/authMiddleware");
// GET all inventory
router.get("/", authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT * FROM inventory ORDER BY id DESC"
        );

        res.json(rows);
    } catch (error) {
        console.error("Inventory error:", error);

        res.status(500).json({
            message: "Failed to fetch inventory",
            error: error.message
        });
    }
});

module.exports = router;