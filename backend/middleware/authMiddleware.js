const jwt = require("jsonwebtoken");

const JWT_SECRET =
    process.env.JWT_SECRET || "construction_inventory_secret";

function authenticateToken(req, res, next) {

    const authHeader = req.headers.authorization;

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please login first."
        });
    }

    jwt.verify(token, JWT_SECRET, (error, user) => {

        if (error) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired token."
            });
        }

        req.user = user;

        next();
    });
}

module.exports = authenticateToken;