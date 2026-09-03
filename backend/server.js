require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pool = require("./db");

const authenticateToken =
    require("./middleware/authMiddleware");

const authorizeRoles =
    require("./permissionsMiddleware");


const app = express();

const PORT =
    process.env.PORT || 5000;


// =================================================
// ================= MIDDLEWARE =====================
// =================================================

app.use(cors());

app.use(express.json());


// =================================================
// ================= UPLOAD SETUP ==================
// =================================================

const uploadDirectory =
    path.join(
        __dirname,
        "uploads"
    );


if (
    !fs.existsSync(
        uploadDirectory
    )
) {

    fs.mkdirSync(
        uploadDirectory,
        {
            recursive: true
        }
    );
}


const storage =
    multer.diskStorage({

        destination: function (
            req,
            file,
            callback
        ) {

            callback(
                null,
                uploadDirectory
            );
        },


        filename: function (
            req,
            file,
            callback
        ) {

            const uniqueName =
                Date.now() +
                "_" +
                Math.round(
                    Math.random() *
                    1000000
                ) +
                path.extname(
                    file.originalname
                );


            callback(
                null,
                uniqueName
            );
        }
    });


const upload =
    multer({

        storage,

        limits: {

            fileSize:
                10 *
                1024 *
                1024
        },


        fileFilter: function (
            req,
            file,
            callback
        ) {

            const allowedTypes = [

                "image/jpeg",
                "image/png",
                "image/webp",
                "application/pdf"

            ];


            if (
                !allowedTypes.includes(
                    file.mimetype
                )
            ) {

                return callback(
                    new Error(
                        "Only JPG, PNG, WEBP and PDF files are allowed."
                    )
                );
            }


            callback(
                null,
                true
            );
        }
    });


app.use(
    "/uploads",
    express.static(
        uploadDirectory
    )
);


// =================================================
// ================= AUDIT HELPER ==================
// =================================================

async function createAuditLog({

    userId,

    inventoryId = null,

    action,

    entityType = "inventory",

    entityName = "",

    changes = null,

    connection = pool

}) {

    try {

        await connection.query(
            `
            INSERT INTO audit_logs
            (
                user_id,
                inventory_id,
                action,
                entity_type,
                entity_name,
                changes
            )

            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                inventoryId,
                action,
                entityType,
                entityName,

                changes
                    ? JSON.stringify(
                        changes
                    )
                    : null
            ]
        );


    } catch (error) {

        console.error(
            "AUDIT LOG ERROR:",
            error
        );
    }
}


// =================================================
// ================= HOME ==========================
// =================================================

app.get(
    "/",
    (req, res) => {

        res.send(
            "Construction Inventory Backend is running"
        );
    }
);


// =================================================
// ================= DATABASE TEST =================
// =================================================

app.get(
    "/api/test",

    async (req, res) => {

        try {

            const [rows] =
                await pool.query(
                    "SELECT 1 AS test"
                );


            res.json({

                success:
                    true,

                message:
                    "Backend and MySQL are connected",

                result:
                    rows
            });


        } catch (error) {

            console.error(
                "DATABASE TEST ERROR:",
                error
            );


            res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Database connection failed"
            });
        }
    }
);


// =================================================
// ================= LOGIN =========================
// =================================================

app.post(
    "/api/login",

    async (req, res) => {

        try {

            const {
                username,
                password
            } =
                req.body;


            if (
                !username ||
                !password
            ) {

                return res
                    .status(400)
                    .json({

                        success:
                            false,

                        message:
                            "Username and password are required"
                    });
            }


            const [users] =
                await pool.query(
                    `
                    SELECT
                        id,
                        username,
                        email,
                        password,
                        role,
                        is_active

                    FROM users

                    WHERE username = ?
                    `,
                    [
                        username.trim()
                    ]
                );


            if (
                users.length === 0
            ) {

                return res
                    .status(401)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid username or password"
                    });
            }


            const user =
                users[0];


            // ================= ACCOUNT STATUS =================

            if (
                !Number(
                    user.is_active
                )
            ) {

                return res
                    .status(403)
                    .json({

                        success:
                            false,

                        message:
                            "Your account has been disabled. Contact an administrator."
                    });
            }


            // ================= PASSWORD =================

            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (
                !passwordCorrect
            ) {

                return res
                    .status(401)
                    .json({

                        success:
                            false,

                        message:
                            "Invalid username or password"
                    });
            }


            // ================= TOKEN =================

            const token =
                jwt.sign(

                    {

                        id:
                            user.id,

                        username:
                            user.username,

                        email:
                            user.email,

                        role:
                            user.role

                    },

                    process.env.JWT_SECRET,

                    {

                        expiresIn:
                            "8h"

                    }
                );


            res.json({

                success:
                    true,

                message:
                    `Welcome ${user.username}`,

                token,

                user: {

                    id:
                        user.id,

                    username:
                        user.username,

                    email:
                        user.email,

                    role:
                        user.role
                }
            });


        } catch (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            res.status(
                500
            ).json({

                success:
                    false,

                message:
                    "Login failed"
            });
        }
    }
);


// =================================================
// ================= USERS =========================
// =================================================


// ================= GET USERS =================

app.get(
    "/api/users",

    authenticateToken,

    authorizeRoles(
        "admin"
    ),

    async (
        req,
        res
    ) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        id,
                        username,
                        email,
                        role,
                        is_active,
                        created_at,
                        updated_at

                    FROM users

                    ORDER BY

                        FIELD(
                            role,
                            'admin',
                            'manager',
                            'engineer',
                            'viewer'
                        ),

                        username ASC
                    `
                );


            res.json(
                rows
            );


        } catch (error) {

            console.error(
                "GET USERS ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to load users."
            });
        }
    }
);


// ================= CREATE USER =================

app.post(
    "/api/users",

    authenticateToken,

    authorizeRoles(
        "admin"
    ),

    async (
        req,
        res
    ) => {

        try {

            const {

                username,
                email,
                password,
                role

            } =
                req.body;


            if (
                !username ||
                !email ||
                !password ||
                !role
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Username, email, password and role are required."
                    });
            }


            const allowedRoles = [

                "admin",
                "manager",
                "engineer",
                "viewer"

            ];


            if (
                !allowedRoles.includes(
                    role
                )
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid user role."
                    });
            }


            if (
                password.length < 6
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Password must be at least 6 characters."
                    });
            }


            const cleanUsername =
                username.trim();


            const cleanEmail =
                email
                    .trim()
                    .toLowerCase();


            const [existing] =
                await pool.query(
                    `
                    SELECT id

                    FROM users

                    WHERE
                        username = ?
                        OR email = ?
                    `,
                    [
                        cleanUsername,
                        cleanEmail
                    ]
                );


            if (
                existing.length
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Username or email already exists."
                    });
            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            const [result] =
                await pool.query(
                    `
                    INSERT INTO users
                    (
                        username,
                        email,
                        password,
                        role,
                        is_active
                    )

                    VALUES (?, ?, ?, ?, 1)
                    `,
                    [
                        cleanUsername,
                        cleanEmail,
                        hashedPassword,
                        role
                    ]
                );


            // User management audit

            await createAuditLog({

                userId:
                    req.user.id,

                action:
                    "USER_CREATE",

                entityType:
                    "user",

                entityName:
                    cleanUsername,

                changes: {

                    username:
                        cleanUsername,

                    email:
                        cleanEmail,

                    role
                }
            });


            res.status(
                201
            ).json({

                success:
                    true,

                id:
                    result.insertId,

                message:
                    "User created successfully."
            });


        } catch (error) {

            console.error(
                "CREATE USER ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to create user."
            });
        }
    }
);


// ================= CHANGE USER ROLE =================

app.put(
    "/api/users/:id/role",

    authenticateToken,

    authorizeRoles(
        "admin"
    ),

    async (
        req,
        res
    ) => {

        try {

            const userId =
                Number(
                    req.params.id
                );


            const {
                role
            } =
                req.body;


            const allowedRoles = [

                "admin",
                "manager",
                "engineer",
                "viewer"

            ];


            if (
                !Number.isInteger(
                    userId
                ) ||
                userId <= 0
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid user ID."
                    });
            }


            if (
                !allowedRoles.includes(
                    role
                )
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid role."
                    });
            }


            const [users] =
                await pool.query(
                    `
                    SELECT
                        username,
                        role

                    FROM users

                    WHERE id = ?
                    `,
                    [
                        userId
                    ]
                );


            if (
                users.length === 0
            ) {

                return res
                    .status(404)
                    .json({

                        message:
                            "User not found."
                    });
            }


            const oldRole =
                users[0].role;


            // Prevent currently logged in admin
            // from removing their own admin role

            if (
                Number(
                    req.user.id
                ) === userId &&
                role !== "admin"
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "You cannot remove your own admin role."
                    });
            }


            await pool.query(
                `
                UPDATE users

                SET role = ?

                WHERE id = ?
                `,
                [
                    role,
                    userId
                ]
            );


            if (
                oldRole !== role
            ) {

                await createAuditLog({

                    userId:
                        req.user.id,

                    action:
                        "USER_ROLE_CHANGE",

                    entityType:
                        "user",

                    entityName:
                        users[0].username,

                    changes: {

                        role: {

                            old:
                                oldRole,

                            new:
                                role
                        }
                    }
                });
            }


            res.json({

                success:
                    true,

                message:
                    "User role updated."
            });


        } catch (error) {

            console.error(
                "UPDATE USER ROLE ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to update user role."
            });
        }
    }
);


// ================= USER STATUS =================

app.put(
    "/api/users/:id/status",

    authenticateToken,

    authorizeRoles(
        "admin"
    ),

    async (
        req,
        res
    ) => {

        try {

            const userId =
                Number(
                    req.params.id
                );


            const {
                is_active
            } =
                req.body;


            if (
                typeof is_active !==
                "boolean"
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid account status."
                    });
            }


            if (
                Number(
                    req.user.id
                ) === userId &&
                is_active === false
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "You cannot disable your own account."
                    });
            }


            const [users] =
                await pool.query(
                    `
                    SELECT
                        username,
                        is_active

                    FROM users

                    WHERE id = ?
                    `,
                    [
                        userId
                    ]
                );


            if (
                users.length === 0
            ) {

                return res
                    .status(404)
                    .json({

                        message:
                            "User not found."
                    });
            }


            const oldStatus =
                Boolean(
                    Number(
                        users[0]
                            .is_active
                    )
                );


            await pool.query(
                `
                UPDATE users

                SET is_active = ?

                WHERE id = ?
                `,
                [
                    is_active
                        ? 1
                        : 0,

                    userId
                ]
            );


            if (
                oldStatus !==
                is_active
            ) {

                await createAuditLog({

                    userId:
                        req.user.id,

                    action:
                        is_active
                            ? "USER_ENABLED"
                            : "USER_DISABLED",

                    entityType:
                        "user",

                    entityName:
                        users[0]
                            .username,

                    changes: {

                        is_active: {

                            old:
                                oldStatus,

                            new:
                                is_active
                        }
                    }
                });
            }


            res.json({

                success:
                    true,

                message:
                    is_active
                        ? "User enabled."
                        : "User disabled."
            });


        } catch (error) {

            console.error(
                "USER STATUS ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to update user."
            });
        }
    }
);


// ================= RESET PASSWORD =================

app.put(
    "/api/users/:id/password",

    authenticateToken,

    authorizeRoles(
        "admin"
    ),

    async (
        req,
        res
    ) => {

        try {

            const userId =
                Number(
                    req.params.id
                );


            const {
                password
            } =
                req.body;


            if (
                !password ||
                password.length < 6
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Password must be at least 6 characters."
                    });
            }


            const [users] =
                await pool.query(
                    `
                    SELECT username

                    FROM users

                    WHERE id = ?
                    `,
                    [
                        userId
                    ]
                );


            if (
                users.length === 0
            ) {

                return res
                    .status(404)
                    .json({

                        message:
                            "User not found."
                    });
            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    10
                );


            await pool.query(
                `
                UPDATE users

                SET password = ?

                WHERE id = ?
                `,
                [
                    hashedPassword,
                    userId
                ]
            );


            await createAuditLog({

                userId:
                    req.user.id,

                action:
                    "USER_PASSWORD_RESET",

                entityType:
                    "user",

                entityName:
                    users[0]
                        .username,

                changes: {

                    password:
                        "Password reset by administrator"
                }
            });


            res.json({

                success:
                    true,

                message:
                    "Password changed successfully."
            });


        } catch (error) {

            console.error(
                "RESET PASSWORD ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to change password."
            });
        }
    }
);


// =================================================
// ================= INVENTORY =====================
// =================================================


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

    async (
        req,
        res
    ) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        inventory.*,

                        COALESCE(
                            (
                                SELECT
                                    SUM(quantity)

                                FROM checkouts

                                WHERE
                                    checkouts.inventory_id =
                                    inventory.id
                            ),
                            0
                        ) AS checked_out

                    FROM inventory

                    ORDER BY
                        inventory.id DESC
                    `
                );


            res.json(
                rows
            );


        } catch (error) {

            console.error(
                "GET INVENTORY ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to load inventory"
            });
        }
    }
);


// ================= ADD INVENTORY =================

app.post(
    "/api/inventory",

    authenticateToken,

    authorizeRoles(
        "admin",
        "manager"
    ),

    async (
        req,
        res
    ) => {

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

            } =
                req.body;


            if (
                !project ||
                !item
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Project and item are required"
                    });
            }


            const [result] =
                await pool.query(
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


            await createAuditLog({

                userId:
                    req.user.id,

                inventoryId:
                    result.insertId,

                action:
                    "CREATE",

                entityName:
                    item,

                changes: {

                    project,

                    item,

                    grade:
                        grade || "",

                    po_reference:
                        po_reference || "",

                    unit:
                        unit || "",

                    rate:
                        Number(rate) || 0,

                    demand:
                        Number(demand) || 0,

                    received:
                        Number(received) || 0,

                    remarks:
                        remarks || ""
                }
            });


            res.status(
                201
            ).json({

                success:
                    true,

                id:
                    result.insertId,

                message:
                    "Inventory item added successfully"
            });


        } catch (error) {

            console.error(
                "POST INVENTORY ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to add inventory"
            });
        }
    }
);


// ================= UPDATE INVENTORY =================

app.put(
    "/api/inventory/:id",

    authenticateToken,

    authorizeRoles(
        "admin",
        "manager"
    ),

    async (
        req,
        res
    ) => {

        try {

            const id =
                req.params.id;


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

            } =
                req.body;


            if (
                !project ||
                !item
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Project and item are required."
                    });
            }


            const [oldRows] =
                await pool.query(
                    `
                    SELECT *

                    FROM inventory

                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );


            if (
                oldRows.length === 0
            ) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Inventory item not found"
                    });
            }


            const oldRecord =
                oldRows[0];


            const newRecord = {

                project:
                    project || "",

                item:
                    item || "",

                grade:
                    grade || "",

                po_reference:
                    po_reference || "",

                unit:
                    unit || "",

                rate:
                    Number(rate) || 0,

                demand:
                    Number(demand) || 0,

                received:
                    Number(received) || 0,

                remarks:
                    remarks || ""
            };


            const changes = {};


            Object
                .keys(
                    newRecord
                )
                .forEach(
                    field => {

                        let oldValue =
                            oldRecord[
                                field
                            ];

                        let newValue =
                            newRecord[
                                field
                            ];


                        if (
                            [
                                "rate",
                                "demand",
                                "received"
                            ].includes(
                                field
                            )
                        ) {

                            oldValue =
                                Number(
                                    oldValue
                                ) || 0;

                            newValue =
                                Number(
                                    newValue
                                ) || 0;

                        } else {

                            oldValue =
                                String(
                                    oldValue ??
                                    ""
                                );

                            newValue =
                                String(
                                    newValue ??
                                    ""
                                );
                        }


                        if (
                            oldValue !==
                            newValue
                        ) {

                            changes[
                                field
                            ] = {

                                old:
                                    oldValue,

                                new:
                                    newValue
                            };
                        }
                    }
                );


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
                    newRecord.project,
                    newRecord.item,
                    newRecord.grade,
                    newRecord.po_reference,
                    newRecord.unit,
                    newRecord.rate,
                    newRecord.demand,
                    newRecord.received,
                    newRecord.remarks,
                    id
                ]
            );


            if (
                Object.keys(
                    changes
                ).length > 0
            ) {

                await createAuditLog({

                    userId:
                        req.user.id,

                    inventoryId:
                        id,

                    action:
                        "UPDATE",

                    entityName:
                        newRecord.item,

                    changes
                });
            }


            res.json({

                success:
                    true,

                message:
                    "Inventory updated successfully"
            });


        } catch (error) {

            console.error(
                "UPDATE INVENTORY ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to update inventory"
            });
        }
    }
);


// ================= DELETE INVENTORY =================

app.delete(
    "/api/inventory/:id",

    authenticateToken,

    authorizeRoles(
        "admin"
    ),

    async (
        req,
        res
    ) => {

        try {

            const id =
                req.params.id;


            const [rows] =
                await pool.query(
                    `
                    SELECT *

                    FROM inventory

                    WHERE id = ?
                    `,
                    [
                        id
                    ]
                );


            if (
                rows.length === 0
            ) {

                return res
                    .status(404)
                    .json({

                        message:
                            "Inventory item not found"
                    });
            }


            const record =
                rows[0];


            /*
             * Create the audit record before deleting.
             * This keeps the original data available.
             */

            await createAuditLog({

                userId:
                    req.user.id,

                inventoryId:
                    id,

                action:
                    "DELETE",

                entityName:
                    record.item,

                changes: {

                    deleted_record: {

                        project:
                            record.project,

                        item:
                            record.item,

                        grade:
                            record.grade,

                        po_reference:
                            record.po_reference,

                        unit:
                            record.unit,

                        rate:
                            Number(
                                record.rate
                            ),

                        demand:
                            Number(
                                record.demand
                            ),

                        received:
                            Number(
                                record.received
                            ),

                        remarks:
                            record.remarks
                    }
                }
            });


            await pool.query(
                `
                DELETE FROM inventory

                WHERE id = ?
                `,
                [
                    id
                ]
            );


            res.json({

                success:
                    true,

                message:
                    "Inventory deleted successfully"
            });


        } catch (error) {

            console.error(
                "DELETE INVENTORY ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Cannot delete this item because checkout records may exist."
            });
        }
    }
);


// =================================================
// ================= CHECKOUTS =====================
// =================================================


// ================= GET CHECKOUTS =================

app.get(
    "/api/checkouts",

    authenticateToken,

    async (
        req,
        res
    ) => {

        try {

            const [rows] =
                await pool.query(
                    `
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

                        users.username
                            AS checked_out_by

                    FROM checkouts

                    JOIN inventory
                        ON inventory.id =
                        checkouts.inventory_id

                    JOIN users
                        ON users.id =
                        checkouts.checked_out_by

                    ORDER BY
                        checkouts.checkout_date DESC
                    `
                );


            res.json(
                rows
            );


        } catch (error) {

            console.error(
                "GET CHECKOUT ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to load checkouts"
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

    async (
        req,
        res
    ) => {

        const connection =
            await pool.getConnection();


        try {

            const {

                inventory_id,
                quantity,
                checked_out_to,
                purpose

            } =
                req.body;


            if (
                !inventory_id ||
                !quantity ||
                Number(quantity) <= 0 ||
                !checked_out_to
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Invalid checkout information"
                    });
            }


            await connection
                .beginTransaction();


            const [inventoryRows] =
                await connection.query(
                    `
                    SELECT

                        id,
                        project,
                        item,
                        received

                    FROM inventory

                    WHERE id = ?

                    FOR UPDATE
                    `,
                    [
                        inventory_id
                    ]
                );


            if (
                inventoryRows.length === 0
            ) {

                await connection
                    .rollback();


                return res
                    .status(404)
                    .json({

                        message:
                            "Inventory item not found"
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
                    [
                        inventory_id
                    ]
                );


            const alreadyCheckedOut =
                Number(
                    checkoutRows[0]
                        .total_checked_out
                ) || 0;


            const available =
                Number(
                    inventory.received
                ) -
                alreadyCheckedOut;


            if (
                Number(
                    quantity
                ) > available
            ) {

                await connection
                    .rollback();


                return res
                    .status(400)
                    .json({

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

                        Number(
                            quantity
                        ),

                        checked_out_to
                            .trim(),

                        req.user.id,

                        purpose || ""
                    ]
                );


            await createAuditLog({

                userId:
                    req.user.id,

                inventoryId:
                    inventory_id,

                action:
                    "CHECKOUT",

                entityName:
                    inventory.item,

                changes: {

                    quantity:
                        Number(
                            quantity
                        ),

                    checked_out_to:
                        checked_out_to
                            .trim(),

                    purpose:
                        purpose || "",

                    project:
                        inventory.project
                },

                connection
            });


            await connection
                .commit();


            res.status(
                201
            ).json({

                success:
                    true,

                id:
                    result.insertId,

                message:
                    "Inventory checked out successfully"
            });


        } catch (error) {

            await connection
                .rollback();


            console.error(
                "CHECKOUT ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Checkout failed"
            });


        } finally {

            connection.release();
        }
    }
);


// =================================================
// ================= PROJECTS ======================
// =================================================


// ================= GET PROJECTS =================

app.get(
    "/api/projects",

    authenticateToken,

    async (
        req,
        res
    ) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT
                        id,
                        name

                    FROM projects

                    ORDER BY
                        name ASC
                    `
                );


            res.json(
                rows
            );


        } catch (error) {

            console.error(
                "GET PROJECTS ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to load projects"
            });
        }
    }
);


// ================= ADD PROJECT =================

app.post(
    "/api/projects",

    authenticateToken,

    authorizeRoles(
        "admin",
        "manager"
    ),

    async (
        req,
        res
    ) => {

        try {

            const name =
                req.body
                    .name
                    ?.trim();


            if (!name) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Project name is required"
                    });
            }


            const [existing] =
                await pool.query(
                    `
                    SELECT id

                    FROM projects

                    WHERE name = ?
                    `,
                    [
                        name
                    ]
                );


            if (
                existing.length
            ) {

                return res
                    .status(409)
                    .json({

                        message:
                            "Project already exists."
                    });
            }


            const [result] =
                await pool.query(
                    `
                    INSERT INTO projects
                    (
                        name
                    )

                    VALUES (?)
                    `,
                    [
                        name
                    ]
                );


            res.status(
                201
            ).json({

                success:
                    true,

                id:
                    result.insertId,

                name
            });


        } catch (error) {

            console.error(
                "ADD PROJECT ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to add project"
            });
        }
    }
);


// =================================================
// ================= IMPORT ========================
// =================================================

app.post(
    "/api/inventory/import",

    authenticateToken,

    authorizeRoles(
        "admin",
        "manager"
    ),

    async (
        req,
        res
    ) => {

        const rows =
            req.body.rows;


        if (
            !Array.isArray(
                rows
            ) ||
            rows.length === 0
        ) {

            return res
                .status(400)
                .json({

                    message:
                        "No inventory rows supplied"
                });
        }


        if (
            rows.length > 5000
        ) {

            return res
                .status(400)
                .json({

                    message:
                        "Maximum 5000 rows can be imported at once."
                });
        }


        const connection =
            await pool
                .getConnection();


        try {

            await connection
                .beginTransaction();


            let imported =
                0;


            for (
                const row
                of rows
            ) {

                const project =
                    String(
                        row.project ||
                        ""
                    ).trim();


                const item =
                    String(
                        row.item ||
                        ""
                    ).trim();


                if (
                    !project ||
                    !item
                ) {

                    throw new Error(
                        `Project and item are required at row ${imported + 1}`
                    );
                }


                const rate =
                    Number(
                        row.rate
                    ) || 0;


                const demand =
                    Number(
                        row.demand
                    ) || 0;


                const received =
                    Number(
                        row.received
                    ) || 0;


                if (
                    rate < 0 ||
                    demand < 0 ||
                    received < 0
                ) {

                    throw new Error(
                        `Negative values are not allowed at row ${imported + 1}`
                    );
                }


                await connection.query(
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

                        String(
                            row.grade ||
                            ""
                        ).trim(),

                        String(
                            row.po_reference ||
                            ""
                        ).trim(),

                        String(
                            row.unit ||
                            ""
                        ).trim(),

                        rate,

                        demand,

                        received,

                        String(
                            row.remarks ||
                            ""
                        ).trim()
                    ]
                );


                imported++;
            }


            await createAuditLog({

                userId:
                    req.user.id,

                action:
                    "CSV_IMPORT",

                entityType:
                    "inventory_import",

                entityName:
                    "Inventory Import",

                changes: {

                    imported_rows:
                        imported
                },

                connection
            });


            await connection
                .commit();


            res.json({

                success:
                    true,

                imported,

                message:
                    `${imported} rows imported successfully`
            });


        } catch (error) {

            await connection
                .rollback();


            console.error(
                "IMPORT ERROR:",
                error
            );


            res.status(
                400
            ).json({

                message:
                    error.message ||
                    "Import failed"
            });


        } finally {

            connection
                .release();
        }
    }
);


// =================================================
// ================= ATTACHMENTS ===================
// =================================================


// ================= ATTACHMENT TEST =================

app.get(
    "/api/attachment-test",

    (
        req,
        res
    ) => {

        res.json({

            success:
                true,

            message:
                "Attachment routes loaded"
        });
    }
);


// ================= UPLOAD ATTACHMENT =================

app.post(
    "/api/inventory/:id/attachments",

    authenticateToken,

    authorizeRoles(
        "admin",
        "manager"
    ),

    upload.single(
        "attachment"
    ),

    async (
        req,
        res
    ) => {

        try {

            const inventoryId =
                req.params.id;


            if (
                !req.file
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Please select an attachment."
                    });
            }


            const [inventory] =
                await pool.query(
                    `
                    SELECT
                        id,
                        item

                    FROM inventory

                    WHERE id = ?
                    `,
                    [
                        inventoryId
                    ]
                );


            if (
                inventory.length === 0
            ) {

                if (
                    req.file?.path
                ) {

                    fs.unlink(
                        req.file.path,
                        error => {

                            if (
                                error
                            ) {

                                console.error(
                                    "FILE CLEANUP ERROR:",
                                    error
                                );
                            }
                        }
                    );
                }


                return res
                    .status(404)
                    .json({

                        message:
                            "Inventory item not found."
                    });
            }


            const filePath =
                `/uploads/${req.file.filename}`;


            const [result] =
                await pool.query(
                    `
                    INSERT INTO inventory_attachments
                    (
                        inventory_id,
                        file_name,
                        file_path,
                        uploaded_by
                    )

                    VALUES (?, ?, ?, ?)
                    `,
                    [
                        inventoryId,

                        req.file
                            .originalname,

                        filePath,

                        req.user.id
                    ]
                );


            await createAuditLog({

                userId:
                    req.user.id,

                inventoryId,

                action:
                    "ATTACHMENT_UPLOAD",

                entityName:
                    inventory[0]
                        .item,

                changes: {

                    file_name:
                        req.file
                            .originalname,

                    file_path:
                        filePath
                }
            });


            res.status(
                201
            ).json({

                success:
                    true,

                id:
                    result.insertId,

                file_name:
                    req.file
                        .originalname,

                file_path:
                    filePath
            });


        } catch (error) {

            /*
             * If DB insertion fails after upload,
             * remove the uploaded file.
             */

            if (
                req.file?.path &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                fs.unlink(
                    req.file.path,
                    cleanupError => {

                        if (
                            cleanupError
                        ) {

                            console.error(
                                "ATTACHMENT CLEANUP ERROR:",
                                cleanupError
                            );
                        }
                    }
                );
            }


            console.error(
                "ATTACHMENT UPLOAD ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Attachment upload failed."
            });
        }
    }
);


// ================= GET ATTACHMENTS =================

app.get(
    "/api/inventory/:id/attachments",

    authenticateToken,

    async (
        req,
        res
    ) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        inventory_attachments.id,

                        inventory_attachments.file_name,

                        inventory_attachments.file_path,

                        inventory_attachments.uploaded_at,

                        users.username
                            AS uploaded_by

                    FROM inventory_attachments

                    LEFT JOIN users
                        ON users.id =
                        inventory_attachments.uploaded_by

                    WHERE
                        inventory_attachments.inventory_id = ?

                    ORDER BY
                        inventory_attachments.uploaded_at DESC
                    `,
                    [
                        req.params.id
                    ]
                );


            res.json(
                rows
            );


        } catch (error) {

            console.error(
                "GET ATTACHMENTS ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to load attachments."
            });
        }
    }
);


// =================================================
// ================= AUDIT =========================
// =================================================

app.get(
    "/api/audit",

    authenticateToken,

    authorizeRoles(
        "admin"
    ),

    async (
        req,
        res
    ) => {

        try {

            const [rows] =
                await pool.query(
                    `
                    SELECT

                        audit_logs.id,

                        audit_logs.inventory_id,

                        audit_logs.action,

                        audit_logs.entity_type,

                        audit_logs.entity_name,

                        audit_logs.changes,

                        audit_logs.created_at,

                        users.username,

                        users.role

                    FROM audit_logs

                    JOIN users
                        ON users.id =
                        audit_logs.user_id

                    ORDER BY
                        audit_logs.created_at DESC

                    LIMIT 1000
                    `
                );


            res.json(
                rows
            );


        } catch (error) {

            console.error(
                "GET AUDIT ERROR:",
                error
            );


            res.status(
                500
            ).json({

                message:
                    "Failed to load audit history"
            });
        }
    }
);


// =================================================
// ================= MULTER ERROR ==================
// =================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({

                        message:
                            "Attachment must be smaller than 10 MB."
                    });
            }


            return res
                .status(400)
                .json({

                    message:
                        error.message
                });
        }


        if (
            error
        ) {

            console.error(
                "SERVER ERROR:",
                error
            );


            return res
                .status(400)
                .json({

                    message:
                        error.message ||
                        "Request failed."
                });
        }


        next();
    }
);


// =================================================
// ================= START SERVER ==================
// =================================================

app.listen(
    PORT,
    () => {

        console.log(
            `Server running on http://localhost:${PORT}`
        );
    }
);