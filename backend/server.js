require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('./db');
const authenticateToken = require('./middleware/authMiddleware');
const authorizeRoles = require('./permissionsMiddleware');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ================= HOME =================

app.get('/', (req, res) => {
    res.send('Construction Inventory Backend is running');
});


// ================= DATABASE TEST =================

app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT 1 AS test'
        );

        res.json({
            success: true,
            message: 'Backend and MySQL are connected',
            result: rows
        });

    } catch (error) {
        console.error('DATABASE TEST ERROR:', error);

        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
});


// ================= LOGIN =================

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = users[0];

       const passwordCorrect = await bcrypt.compare(
        password,
        user.password
    );

        if (!passwordCorrect) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('LOGIN ERROR:', error);

        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});


// ================= INVENTORY =================


// GET all inventory
// All logged-in users can read

app.get(
    '/api/inventory',
    authenticateToken,
    authorizeRoles('admin', 'manager', 'engineer', 'viewer'),
    async (req, res) => {

        try {

            const [rows] = await pool.query(`
                SELECT
                    id,
                    project,
                    item,
                    grade,
                    po_reference,
                    unit,
                    rate,
                    demand,
                    received,
                    updated_at,
                    remarks
                FROM inventory
                ORDER BY id DESC
            `);

            res.json(rows);

        } catch (error) {

            console.error('GET INVENTORY ERROR:', error);

            res.status(500).json({
                message: 'Failed to load inventory'
            });
        }
    }
);


// ADD inventory record
// Admin and Manager only

app.post(
    '/api/inventory',
    authenticateToken,
    authorizeRoles('admin', 'manager'),
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
                updated_at,
                remarks
            } = req.body;

            const [result] = await pool.query(`
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
                    updated_at,
                    remarks
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                project || '',
                item || '',
                grade || '',
                po_reference || '',
                unit || '',
                Number(rate) || 0,
                Number(demand) || 0,
                Number(received) || 0,
                updated_at || null,
                remarks || ''
            ]);

            res.json({
                success: true,
                id: result.insertId
            });

        } catch (error) {

            console.error('POST INVENTORY ERROR:', error);

            res.status(500).json({
                message: 'Failed to add inventory record'
            });
        }
    }
);


// UPDATE inventory record
// Admin and Manager only

app.put(
    '/api/inventory/:id',
    authenticateToken,
    authorizeRoles('admin', 'manager'),
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
                updated_at,
                remarks
            } = req.body;

            await pool.query(`
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
                    updated_at = ?,
                    remarks = ?
                WHERE id = ?
            `, [
                project || '',
                item || '',
                grade || '',
                po_reference || '',
                unit || '',
                Number(rate) || 0,
                Number(demand) || 0,
                Number(received) || 0,
                updated_at|| null,
                remarks || '',
                id
            ]);

            res.json({
                success: true
            });

        } catch (error) {

            console.error('PUT INVENTORY ERROR:', error);

            res.status(500).json({
                message: 'Failed to update inventory record'
            });
        }
    }
);


// DELETE inventory record
// Admin only

app.delete(
    '/api/inventory/:id',
    authenticateToken,
    authorizeRoles('admin'),
    async (req, res) => {

        try {

            const id = req.params.id;

            await pool.query(
                'DELETE FROM inventory WHERE id = ?',
                [id]
            );

            res.json({
                success: true
            });

        } catch (error) {

            console.error('DELETE INVENTORY ERROR:', error);

            res.status(500).json({
                message: 'Failed to delete inventory record'
            });
        }
    }
);


// ================= PROJECTS =================


// GET projects
// All logged-in users can view

app.get(
    '/api/projects',
    authenticateToken,
    authorizeRoles('admin', 'manager', 'engineer', 'viewer'),
    async (req, res) => {

        try {

            const [rows] = await pool.query(
                'SELECT id, name FROM projects ORDER BY name ASC'
            );

            res.json(rows);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: 'Failed to load projects'
            });
        }
    }
);


// ADD project
// Admin and Manager only

app.post(
    '/api/projects',
    authenticateToken,
    authorizeRoles('admin', 'manager'),
    async (req, res) => {

        try {

            const name = req.body.name?.trim();

            if (!name) {
                return res.status(400).json({
                    message: 'Project name is required'
                });
            }

            const [result] = await pool.query(
                'INSERT INTO projects (name) VALUES (?)',
                [name]
            );

            res.json({
                success: true,
                id: result.insertId,
                name
            });

        } catch (error) {

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    message: 'Project already exists'
                });
            }

            console.error(error);

            res.status(500).json({
                message: 'Failed to add project'
            });
        }
    }
);


// DELETE project
// Admin only

app.delete(
    '/api/projects/:name',
    authenticateToken,
    authorizeRoles('admin'),
    async (req, res) => {

        try {

            const name = req.params.name;

            const [used] = await pool.query(
                'SELECT id FROM inventory WHERE project = ? LIMIT 1',
                [name]
            );

            if (used.length > 0) {
                return res.status(400).json({
                    message: 'Project still has inventory records'
                });
            }

            await pool.query(
                'DELETE FROM projects WHERE name = ?',
                [name]
            );

            res.json({
                success: true
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: 'Failed to delete project'
            });
        }
    }
);


// ================= CREATE ADMIN =================
// Temporary route. Remove this after creating admin accounts.

app.post('/api/create-admin', async (req, res) => {

    try {

        const {
            username,
            email,
            password
        } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email and password are required'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

       const [result] = await pool.query(
        `INSERT INTO users
        (username, email, password, role)
        VALUES (?, ?, ?, 'admin')`,
        [
            username,
            email,
            passwordHash
        ]
    );

        res.json({
            success: true,
            message: 'Admin created successfully',
            id: result.insertId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Failed to create admin'
        });
    }
});


// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});