// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const userRoutes = require('./routes/users');
const taskRoutes = require("./routes/tasks");
const dealRoutes = require("./routes/deals");
const chatRoutes = require('./routes/chat');
const socketHandler = require('./services/socketHandler');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// --- CORS CONFIGURATION ---
const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// --- SOCKET.IO ---
const io = socketIo(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
  },
});

// --- MIDDLEWARE ---
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- RATE LIMITING ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// --- DATABASE CONNECTIONS ---
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leadstream', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => logger.info('✅ Connected to MongoDB'))
  .catch((err) => logger.error('❌ MongoDB connection error:', err));

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient
  .connect()
  .then(() => logger.info('✅ Connected to Redis'))
  .catch((err) => logger.error('❌ Redis connection error:', err));

// --- INJECT IO + REDIS CLIENT INTO REQUEST ---
app.use((req, res, next) => {
  req.io = io;
  req.redisClient = redisClient;
  next();
});

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/advanced', require('./routes/advanced'));

// --- SOCKET HANDLER ---
socketHandler(io, redisClient);

// --- HEALTH CHECK ENDPOINT ---
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    server: 'LeadStream CRM API',
    mongoConnected: mongoose.connection.readyState === 1,
    redisConnected: redisClient.isOpen,
    timestamp: new Date().toISOString(),
  });
});

// --- ERROR HANDLER ---
app.use(errorHandler);

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running at http://localhost:${PORT}`);
  logger.info(`🌐 Accepting requests from: ${allowedOrigin}`);
});

module.exports = app;
