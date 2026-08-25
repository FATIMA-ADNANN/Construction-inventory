const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());


// ================= TEST =================

app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS test');

        res.json({
            success: true,
            message: 'Backend and MySQL are connected',
            result: rows
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
});


// ================= INVENTORY =================

// GET all inventory
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                id,
                project,
                item,
                grade,
                po,
                unit,
                rate,
                demand,
                received,
                updated,
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
});
// ADD inventory record
app.post('/api/inventory', async (req, res) => {
    try {
        const {
            project,
            item,
            grade,
            po,
            unit,
            rate,
            demand,
            received,
            updated,
            remarks
        } = req.body;

        const [result] = await pool.query(`
            INSERT INTO inventory
            (
                project,
                item,
                grade,
                po,
                unit,
                rate,
                demand,
                received,
                updated,
                remarks
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            project || '',
            item || '',
            grade || '',
            po || '',
            unit || '',
            Number(rate) || 0,
            Number(demand) || 0,
            Number(received) || 0,
            updated || null,
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
});
// UPDATE inventory record
app.put('/api/inventory/:id', async (req, res) => {
    try {
        const id = req.params.id;

        const {
            project,
            item,
            grade,
            po,
            unit,
            rate,
            demand,
            received,
            updated,
            remarks
        } = req.body;

        await pool.query(`
            UPDATE inventory
            SET
                project = ?,
                item = ?,
                grade = ?,
                po = ?,
                unit = ?,
                rate = ?,
                demand = ?,
                received = ?,
                updated = ?,
                remarks = ?
            WHERE id = ?
        `, [
            project || '',
            item || '',
            grade || '',
            po || '',
            unit || '',
            Number(rate) || 0,
            Number(demand) || 0,
            Number(received) || 0,
            updated || null,
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
});

// DELETE inventory record
app.delete('/api/inventory/:id', async (req, res) => {
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
});
// ================= PROJECTS =================

// GET projects
app.get('/api/projects', async (req, res) => {
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
});


// ADD project
app.post('/api/projects', async (req, res) => {
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
});


// DELETE project
app.delete('/api/projects/:name', async (req, res) => {
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
});
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

// ================= START SERVER =================

module.exports = app;