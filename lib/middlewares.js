import jwt from 'jsonwebtoken';

function auth(req, res, next) {
    const token = req.cookies?.userToken;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

function adminAuth(req, res, next) {
    const token = req.cookies?.userToken;
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

function schoolAuth(req, res, next) {
    const schoolToken = req.cookies?.schoolToken;
    if (!schoolToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const decoded = jwt.verify(schoolToken, process.env.JWT_SECRET);
        req.schoolId = decoded.schoolId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

auth.auth = auth;
auth.adminAuth = adminAuth;
auth.schoolAuth = schoolAuth;

export default auth;