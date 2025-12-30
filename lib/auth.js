import jwt from 'jsonwebtoken';
import cookie from 'cookie';

function authenticate(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;

  const cookies = cookie.parse(raw);
  const token = cookies.userToken;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

export { authenticate };
