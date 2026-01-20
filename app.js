import createError from 'http-errors';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import expressLayouts from 'express-ejs-layouts';
import helmet from 'helmet';
import { logger } from './lib/logger.js';
import { apiLimiter } from './lib/rateLimiter.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import loginRouter from './routes/login.js';
import lobbyRouter from './routes/lobby.js';
import apiRouter from './routes/api.js';
import gameRouter from './routes/game.js';
import mypageRouter from './routes/mypage.js';
import databaseRouter from './routes/database.js';
import rankingsRouter from './routes/rankings.js';
import schoolAdminRouter from './routes/school-admin.js';
import kifuRouter from './routes/kifu.js';
import emailTestRouter from './routes/email-test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Trust proxy for rate limiting and X-Forwarded-For headers
// Required when behind nginx or other reverse proxy
app.set('trust proxy', true);

// Security headers (standard practice)
// Note: We allow unsafe-inline for EJS templates with inline event handlers
// In production, consider refactoring to use addEventListener instead of onclick attributes
const isDevelopment = process.env.NODE_ENV === 'development';

app.use(helmet({
    contentSecurityPolicy: isDevelopment ? false : {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for EJS
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for EJS
            scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers (onclick, etc.)
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
        },
    },
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', false); // Disable layout by default

// Logging middleware
app.use(morgan('combined', {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/domain', express.static(path.join(__dirname, 'domain')));

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/lobby', lobbyRouter);
app.use('/api', apiRouter);
app.use('/game', gameRouter);
app.use('/mypage', mypageRouter);
app.use('/database', databaseRouter);
app.use('/rankings', rankingsRouter);
app.use('/school-admin', schoolAdminRouter);
app.use('/kifu', kifuRouter);
app.use('/email-test', emailTestRouter);

// catch 404
app.use((req, res, next) => {
  next(createError(404));
});

// Health check endpoint (standard practice)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// error handler
app.use((err, req, res, next) => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.locals.message = err.message;
  
  // Don't expose error details in production
  const isDevelopment = req.app.get('env') === 'development';
  res.locals.error = isDevelopment ? err : {};
  
  res.status(err.status || 500);
  
  // If it's an API request, return JSON
  if (req.path.startsWith('/api') || req.path.startsWith('/game')) {
    return res.json({
      error: isDevelopment ? err.message : 'Internal server error',
      ...(isDevelopment && { stack: err.stack })
    });
  }
  
  res.render('error');
});

export default app;
