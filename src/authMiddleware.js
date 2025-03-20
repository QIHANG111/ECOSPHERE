import jwt from 'jsonwebtoken';
import User from './models/user.model.js'; 

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET); 
        req.user = await User.findById(decoded.userId).select('-password'); 

        if (!req.user) {
            return res.status(401).json({ message: 'User not found, access denied' });
        }

        next();
    } catch (error) {
        console.error('[ERROR] Auth Middleware ->', error);
        return res.status(401).json({ message: 'Invalid authentication token' });
    }
};

export default authMiddleware;
