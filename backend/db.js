const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "faisaljewel_faisaljewel",
    password: process.env.DB_PASSWORD || "invuser01!@",
    database: process.env.DB_NAME || "faisaljewel_faisal_town_inventory",

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;