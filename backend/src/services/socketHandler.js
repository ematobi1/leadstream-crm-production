const jwt = require('jsonwebtoken');
const User = require('../models/user');
const logger = require('../utils/logger');

const socketHandler = (io, redisClient) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-min-32-chars-long');
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    logger.info(`User connected: ${socket.user.name} (${socket.userId})`);
    
    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Update user's online status in Redis
    if (redisClient && redisClient.isOpen) {
      try {
        await redisClient.setEx(`user:${socket.userId}:online`, 300, 'true');
      } catch (error) {
        logger.error('Redis error:', error);
      }
    }
    
    // Update last active timestamp
    socket.user.lastActive = new Date();
    socket.user.save().catch(err => logger.error('Error updating last active:', err));

    // Handle lead-related events
    socket.on('joinLead', (leadId) => {
      socket.join(`lead:${leadId}`);
      logger.debug(`User ${socket.userId} joined lead room: ${leadId}`);
    });

    socket.on('leaveLead', (leadId) => {
      socket.leave(`lead:${leadId}`);
      logger.debug(`User ${socket.userId} left lead room: ${leadId}`);
    });

    // Handle real-time lead updates
    socket.on('leadUpdate', (data) => {
      socket.to(`lead:${data.leadId}`).emit('leadUpdated', {
        ...data,
        updatedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Handle typing indicators
    socket.on('leadTyping', (data) => {
      socket.to(`lead:${data.leadId}`).emit('userTyping', {
        userId: socket.userId,
        userName: socket.user.name,
        leadId: data.leadId,
        isTyping: data.isTyping
      });
    });

    // Handle availability status updates
    socket.on('updateAvailability', async (status) => {
      try {
        if (redisClient && redisClient.isOpen) {
          await redisClient.setEx(`user:${socket.userId}:available`, 3600, status);
        }

        logger.debug(`User ${socket.user.name} availability changed to: ${status}`);
      } catch (error) {
        logger.error('Availability update error:', error);
      }
    });

    // Handle live chat - Join live chat room
    socket.on('joinLiveChat', ({ sessionId }) => {
      socket.join(`chat:${sessionId}`);
      logger.info(`User ${socket.userId} joined live chat: ${sessionId}`);

      // Notify agents that user is in chat room
      io.emit('userJoinedChat', {
        sessionId,
        userId: socket.userId,
        userName: socket.user.name,
        userEmail: socket.user.email,
        timestamp: new Date()
      });
    });

    // Handle chat messages from users
    socket.on('chatMessage', ({ sessionId, message }) => {
      logger.info(`Chat message in session ${sessionId} from ${socket.user.name}: ${message}`);

      // Broadcast to agents in this session
      socket.to(`chat:${sessionId}`).emit('userMessage', {
        sessionId,
        userId: socket.userId,
        userName: socket.user.name,
        message,
        timestamp: new Date()
      });
    });

    // Handle agent joining chat (for admin/support users)
    socket.on('joinAsAgent', ({ sessionId }) => {
      if (socket.user.role === 'admin' || socket.user.role === 'manager') {
        socket.join(`chat:${sessionId}`);
        logger.info(`Agent ${socket.user.name} joined chat session: ${sessionId}`);

        // Notify user that agent has joined
        io.to(`chat:${sessionId}`).emit('agentJoined', {
          sessionId,
          agent: {
            id: socket.userId,
            name: socket.user.name,
            role: socket.user.role
          },
          timestamp: new Date()
        });
      }
    });

    // Handle agent messages
    socket.on('agentMessage', ({ sessionId, message }) => {
      if (socket.user.role === 'admin' || socket.user.role === 'manager') {
        logger.info(`Agent ${socket.user.name} sent message in session ${sessionId}`);

        // Send to user and other agents
        io.to(`chat:${sessionId}`).emit('agentMessage', {
          sessionId,
          agentId: socket.userId,
          agentName: socket.user.name,
          message,
          timestamp: new Date()
        });
      }
    });

    // Handle agent leaving chat
    socket.on('leaveChat', ({ sessionId }) => {
      socket.leave(`chat:${sessionId}`);
      logger.info(`User/Agent ${socket.user.name} left chat session: ${sessionId}`);

      if (socket.user.role === 'admin' || socket.user.role === 'manager') {
        io.to(`chat:${sessionId}`).emit('agentLeft', {
          sessionId,
          agentName: socket.user.name,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${socket.user.name} (${socket.userId})`);
      
      // Remove online status
      if (redisClient && redisClient.isOpen) {
        try {
          await redisClient.del(`user:${socket.userId}:online`);
        } catch (error) {
          logger.error('Redis cleanup error:', error);
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
};

module.exports = socketHandler;