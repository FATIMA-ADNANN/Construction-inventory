require("dotenv").config();

const express = require("express");
const cors = require("cors");

const pool = require("./db");
const authenticateToken = require("./middleware/authMiddleware");
const authorizeRoles = require("./permissionsMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ================= HOME =================

app.get("/", (req, res) => {
    res.send("Construction Inventory Backend is running");
});


// ================= DATABASE TEST =================

app.get("/api/test", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT 1 AS test"
        );

        res.json({
            success: true,
            message: "Backend and MySQL are connected",
            result: rows
        });

    } catch (error) {

        console.error("DATABASE TEST ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});


// ================= LOGIN =================
// We use username + password consistently

app.post("/api/login", async (req, res) => {

    try {

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
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
                message: "Invalid username or password"
            });
        }

        const user = users[0];

        const passwordCorrect =
            await require("bcrypt").compare(
                password,
                user.password
            );

        if (!passwordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const jwt = require("jsonwebtoken");

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            success: true,
            message: `Welcome ${user.username}`,
            token,
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
            message: "Login failed"
        });
    }
});


// ================= GET INVENTORY =================

app.get(
    "/api/inventory",
    authenticateToken,
    authorizeRoles(
        "admin",
        "manager",
        "engineer",
        "viewer"
    ),

    async (req, res) => {

        try {

            const [rows] = await pool.query(`
                SELECT
                    inventory.*,

                    COALESCE(
                        (
                            SELECT SUM(quantity)
                            FROM checkouts
                            WHERE checkouts.inventory_id = inventory.id
                        ),
                        0
                    ) AS checked_out

                FROM inventory

                ORDER BY inventory.id DESC
            `);

            res.json(rows);

        } catch (error) {

            console.error(
                "GET INVENTORY ERROR:",
                error
            );

            res.status(500).json({
                message: "Failed to load inventory"
            });
        }
    }
);


// ================= ADD INVENTORY =================

app.post(
    "/api/inventory",
    authenticateToken,
    authorizeRoles("admin", "manager"),

    async (req, res) => {

        try {

            const {
                project,
                item,
                grade,
                po_reference,
                unit,
                rate,
                demand,
                received,
                remarks
            } = req.body;

            if (!project || !item) {
                return res.status(400).json({
                    message: "Project and item are required"
                });
            }

            const [result] = await pool.query(
                `
                INSERT INTO inventory
                (
                    project,
                    item,
                    grade,
                    po_reference,
                    unit,
                    rate,
                    demand,
                    received,
                    remarks
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    project,
                    item,
                    grade || "",
                    po_reference || "",
                    unit || "",
                    Number(rate) || 0,
                    Number(demand) || 0,
                    Number(received) || 0,
                    remarks || ""
                ]
            );

            res.json({
                success: true,
                id: result.insertId,
                message: "Inventory item added successfully"
            });

        } catch (error) {

            console.error(
                "POST INVENTORY ERROR:",
                error
            );

            res.status(500).json({
                message: "Failed to add inventory"
            });
        }
    }
);


// ================= UPDATE INVENTORY =================

app.put(
    "/api/inventory/:id",
    authenticateToken,
    authorizeRoles("admin", "manager"),

    async (req, res) => {

        try {

            const id = req.params.id;

            const {
                project,
                item,
                grade,
                po_reference,
                unit,
                rate,
                demand,
                received,
                remarks
            } = req.body;

            await pool.query(
                `
                UPDATE inventory

                SET
                    project = ?,
                    item = ?,
                    grade = ?,
                    po_reference = ?,
                    unit = ?,
                    rate = ?,
                    demand = ?,
                    received = ?,
                    remarks = ?

                WHERE id = ?
                `,
                [
                    project || "",
                    item || "",
                    grade || "",
                    po_reference || "",
                    unit || "",
                    Number(rate) || 0,
                    Number(demand) || 0,
                    Number(received) || 0,
                    remarks || "",
                    id
                ]
            );

            res.json({
                success: true,
                message: "Inventory updated successfully"
            });

        } catch (error) {

            console.error(
                "UPDATE INVENTORY ERROR:",
                error
            );

            res.status(500).json({
                message: "Failed to update inventory"
            });
        }
    }
);


// ================= DELETE INVENTORY =================

app.delete(
    "/api/inventory/:id",
    authenticateToken,
    authorizeRoles("admin"),

    async (req, res) => {

        try {

            const id = req.params.id;

            await pool.query(
                "DELETE FROM inventory WHERE id = ?",
                [id]
            );

            res.json({
                success: true,
                message: "Inventory deleted successfully"
            });

        } catch (error) {

            console.error(
                "DELETE INVENTORY ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Cannot delete this item because checkout records may exist."
            });
        }
    }
);


// ================= GET CHECKOUTS =================

app.get(
    "/api/checkouts",
    authenticateToken,

    async (req, res) => {

        try {

            const [rows] = await pool.query(`
                SELECT

                    checkouts.id,
                    checkouts.inventory_id,
                    checkouts.quantity,
                    checkouts.checked_out_to,
                    checkouts.purpose,
                    checkouts.checkout_date,

                    inventory.project,
                    inventory.item,
                    inventory.grade,

                    users.username AS checked_out_by

                FROM checkouts

                JOIN inventory
                    ON inventory.id =
                    checkouts.inventory_id

                JOIN users
                    ON users.id =
                    checkouts.checked_out_by

                ORDER BY
                    checkouts.checkout_date DESC
            `);

            res.json(rows);

        } catch (error) {

            console.error(
                "GET CHECKOUT ERROR:",
                error
            );

            res.status(500).json({
                message: "Failed to load checkouts"
            });
        }
    }
);


// ================= CREATE CHECKOUT =================

app.post(
    "/api/checkouts",
    authenticateToken,
    authorizeRoles(
        "admin",
        "manager",
        "engineer"
    ),

    async (req, res) => {

        const connection =
            await pool.getConnection();

        try {

            const {
                inventory_id,
                quantity,
                checked_out_to,
                purpose
            } = req.body;

            if (
                !inventory_id ||
                !quantity ||
                Number(quantity) <= 0 ||
                !checked_out_to
            ) {
                return res.status(400).json({
                    message:
                        "Invalid checkout information"
                });
            }

            await connection.beginTransaction();

            const [inventoryRows] =
                await connection.query(
                    `
                    SELECT id, received

                    FROM inventory

                    WHERE id = ?

                    FOR UPDATE
                    `,
                    [inventory_id]
                );

            if (inventoryRows.length === 0) {

                await connection.rollback();

                return res.status(404).json({
                    message: "Inventory item not found"
                });
            }

            const inventory =
                inventoryRows[0];

            const [checkoutRows] =
                await connection.query(
                    `
                    SELECT
                        COALESCE(
                            SUM(quantity),
                            0
                        ) AS total_checked_out

                    FROM checkouts

                    WHERE inventory_id = ?
                    `,
                    [inventory_id]
                );

            const alreadyCheckedOut =
                Number(
                    checkoutRows[0]
                        .total_checked_out
                ) || 0;

            const available =
                Number(inventory.received) -
                alreadyCheckedOut;

            if (Number(quantity) > available) {

                await connection.rollback();

                return res.status(400).json({
                    message:
                        `Only ${available} items are available`
                });
            }

            const [result] =
                await connection.query(
                    `
                    INSERT INTO checkouts
                    (
                        inventory_id,
                        quantity,
                        checked_out_to,
                        checked_out_by,
                        purpose
                    )

                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        inventory_id,
                        Number(quantity),
                        checked_out_to,
                        req.user.id,
                        purpose || ""
                    ]
                );

            await connection.commit();

            res.json({
                success: true,
                id: result.insertId,
                message:
                    "Inventory checked out successfully"
            });

        } catch (error) {

            await connection.rollback();

            console.error(
                "CHECKOUT ERROR:",
                error
            );

            res.status(500).json({
                message: "Checkout failed"
            });

        } finally {

            connection.release();
        }
    }
);


// ================= GET PROJECTS =================

app.get(
    "/api/projects",
    authenticateToken,

    async (req, res) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT id, name

                    FROM projects

                    ORDER BY name ASC
                    `
                );

            res.json(rows);

        } catch (error) {

            console.error(
                "GET PROJECTS ERROR:",
                error
            );

            res.status(500).json({
                message: "Failed to load projects"
            });
        }
    }
);


// ================= ADD PROJECT =================

app.post(
    "/api/projects",
    authenticateToken,
    authorizeRoles("admin", "manager"),

    async (req, res) => {

        try {

            const name =
                req.body.name?.trim();

            if (!name) {

                return res.status(400).json({
                    message:
                        "Project name is required"
                });
            }

            const [result] =
                await pool.query(
                    `
                    INSERT INTO projects (name)

                    VALUES (?)
                    `,
                    [name]
                );

            res.json({
                success: true,
                id: result.insertId,
                name
            });

        } catch (error) {

            console.error(
                "ADD PROJECT ERROR:",
                error
            );

            res.status(500).json({
                message:
                    "Failed to add project"
            });
        }
    }
);


// ================= START SERVER =================

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});