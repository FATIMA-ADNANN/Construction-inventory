const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;

    const token =
        authHeader &&
        authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : null;

    if (!token) {

        return res.status(401).json({
            message:
                "Access denied. Please login first."
        });
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        (error, user) => {

            if (error) {

                return res.status(403).json({
                    message:
                        "Invalid or expired token."
                });
            }

            req.user = user;

            next();
        }
    );
}

module.exports = authenticateToken;