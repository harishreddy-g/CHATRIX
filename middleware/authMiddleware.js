const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../config/jwt");

const getTokenFromRequest = (req) => {
    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return null;
    }

    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return authHeader;
};

const authMiddleware = (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.status(401).send("Access Denied");
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).send("Invalid Token");
    }
};

const requireAuthPage = (req, res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return res.redirect("/login");
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.clearCookie("token");
        return res.redirect("/login");
    }
};

module.exports = authMiddleware;
module.exports.requireAuthPage = requireAuthPage;
module.exports.getTokenFromRequest = getTokenFromRequest;
