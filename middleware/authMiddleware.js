const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../config/jwt");

const authMiddleware = (req, res, next) => {

    const token = req.headers.authorization;

    if (!token) {
        return res.status(401).send("Access Denied");
    }

    try {

        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).send("Invalid Token");

    }

};

module.exports = authMiddleware;