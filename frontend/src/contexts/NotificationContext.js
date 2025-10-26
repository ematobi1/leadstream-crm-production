import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { SOCKET_URL } from '../config';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Initialize Socket.IO connection
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connected');
      setIsConnected(true);
      toast.success('Real-time updates enabled', { duration: 2000 });
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    // Listen for lead events
    newSocket.on('newLead', (data) => {
      addNotification({
        type: 'lead',
        action: 'created',
        title: 'New Lead',
        message: `${data.name} from ${data.company || 'Unknown Company'}`,
        data,
        timestamp: new Date()
      });
      toast.success(`New lead: ${data.name}`, {
        icon: '🎯',
        duration: 3000
      });
    });

    newSocket.on('leadUpdated', (data) => {
      addNotification({
        type: 'lead',
        action: 'updated',
        title: 'Lead Updated',
        message: `${data.name} - Status: ${data.status}`,
        data,
        timestamp: new Date()
      });
      toast(`Lead updated: ${data.name}`, {
        icon: '✏️',
        duration: 2000
      });
    });

    newSocket.on('leadDeleted', (data) => {
      addNotification({
        type: 'lead',
        action: 'deleted',
        title: 'Lead Deleted',
        message: `${data.name} has been removed`,
        data,
        timestamp: new Date()
      });
      toast.error(`Lead deleted: ${data.name}`, {
        duration: 2000
      });
    });

    newSocket.on('leadNoteAdded', (data) => {
      addNotification({
        type: 'note',
        action: 'added',
        title: 'New Note',
        message: `Note added to ${data.leadName}`,
        data,
        timestamp: new Date()
      });
      toast(`New note on ${data.leadName}`, {
        icon: '📝',
        duration: 2000
      });
    });

    newSocket.on('userTyping', (data) => {
      // Handle typing indicators (don't add to notifications)
      console.log(`${data.userName} is typing...`);
    });

    newSocket.on('userPresence', (data) => {
      if (data.status === 'online') {
        toast(`${data.userName} is now online`, {
          icon: '🟢',
          duration: 2000
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (index) => {
    setNotifications(prev => {
      const updated = [...prev];
      if (!updated[index].read) {
        updated[index] = { ...updated[index], read: true };
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const joinLeadRoom = (leadId) => {
    if (socket) {
      socket.emit('joinLead', leadId);
    }
  };

  const leaveLeadRoom = (leadId) => {
    if (socket) {
      socket.emit('leaveLead', leadId);
    }
  };

  const emitLeadUpdate = (leadData) => {
    if (socket) {
      socket.emit('leadUpdate', leadData);
    }
  };

  const emitTyping = (leadId, isTyping) => {
    if (socket) {
      socket.emit('leadTyping', { leadId, isTyping });
    }
  };

  const value = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    joinLeadRoom,
    leaveLeadRoom,
    emitLeadUpdate,
    emitTyping
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
