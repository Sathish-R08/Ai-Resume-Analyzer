import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
    // Check Authorization header securely
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        const secret = process.env.JWT_SECRET || "fallback_secret";
        const verified = jwt.verify(token, secret);
        req.user = verified;
        next(); // Proceed to the next logic
    } catch (err) {
        res.status(401).json({ error: "Invalid token." });
    }
};

export default authMiddleware;
