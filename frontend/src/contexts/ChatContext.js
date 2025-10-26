import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from './NotificationContext';
import toast from 'react-hot-toast';
import { API_URL } from '../config';

const ChatContext = createContext();

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isLiveAgent, setIsLiveAgent] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const { socket } = useNotifications();

  // Initialize chat session
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chatSessionId');
    const storedMessages = localStorage.getItem('chatMessages');

    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      localStorage.setItem('chatSessionId', newSessionId);
    }

    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    } else {
      // Welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "👋 Hello! I'm your AI assistant for LeadStream CRM. I can help you with:\n\n• Understanding CRM features\n• Managing leads and pipelines\n• Navigating the platform\n• Troubleshooting issues\n• And much more!\n\nHow can I assist you today?",
        timestamp: new Date()
      }]);
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Listen for live agent messages via Socket.IO
  useEffect(() => {
    if (socket && isLiveAgent) {
      socket.on('agentMessage', (data) => {
        if (data.sessionId === sessionId) {
          addMessage({
            role: 'agent',
            content: data.message,
            agentName: data.agentName
          });
          setIsTyping(false);
        }
      });

      socket.on('agentJoined', (data) => {
        if (data.sessionId === sessionId) {
          setAgentInfo(data.agent);
          addMessage({
            role: 'system',
            content: `${data.agent.name} has joined the chat. They'll assist you shortly.`
          });
        }
      });

      socket.on('agentLeft', (data) => {
        if (data.sessionId === sessionId) {
          setIsLiveAgent(false);
          setAgentInfo(null);
          addMessage({
            role: 'system',
            content: 'The agent has left the chat. You\'re back with AI assistant.'
          });
        }
      });

      return () => {
        socket.off('agentMessage');
        socket.off('agentJoined');
        socket.off('agentLeft');
      };
    }
  }, [socket, isLiveAgent, sessionId]);

  const addMessage = (message) => {
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...message
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const sendMessage = async (content) => {
    // Add user message
    addMessage({
      role: 'user',
      content
    });

    setIsTyping(true);

    try {
      if (isLiveAgent) {
        // Send to live agent via Socket.IO
        if (socket) {
          socket.emit('chatMessage', {
            sessionId,
            message: content
          });
        }
      } else {
        // Send to AI
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/chat/message`,
          {
            sessionId,
            message: content,
            messages: messages.filter(m => m.role !== 'system').slice(-10) // Last 10 messages for context
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const aiResponse = response.data;

        // Check if AI suggests live agent
        if (aiResponse.suggestLiveAgent) {
          addMessage({
            role: 'assistant',
            content: aiResponse.message
          });

          addMessage({
            role: 'system',
            content: '🔄 This question might be better answered by a live agent. Would you like to be transferred?',
            showTransferButton: true
          });
        } else {
          addMessage({
            role: 'assistant',
            content: aiResponse.message,
            confidence: aiResponse.confidence
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        role: 'system',
        content: '⚠️ Sorry, there was an error processing your message. Please try again.'
      });
    } finally {
      setIsTyping(false);
    }
  };

  const transferToLiveAgent = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/chat/transfer-to-agent`,
        {
          sessionId,
          messages: messages.slice(-5) // Send last 5 messages for context
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setIsLiveAgent(true);

        if (response.data.agent) {
          setAgentInfo(response.data.agent);
          addMessage({
            role: 'system',
            content: `✅ You've been connected to ${response.data.agent.name}. They'll be with you shortly.`
          });
        } else {
          addMessage({
            role: 'system',
            content: '✅ Your request has been queued. A live agent will join shortly.'
          });
        }

        // Join socket room for live chat
        if (socket) {
          socket.emit('joinLiveChat', { sessionId });
        }

        toast.success('Transferring to live agent...');
      } else {
        addMessage({
          role: 'system',
          content: '⚠️ No agents are currently available. Please try again later or continue with AI assistant.'
        });
      }
    } catch (error) {
      console.error('Error transferring to agent:', error);
      toast.error('Failed to transfer to live agent');
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat cleared! How can I help you?",
      timestamp: new Date()
    }]);
    localStorage.removeItem('chatMessages');

    // Create new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    localStorage.setItem('chatSessionId', newSessionId);

    setIsLiveAgent(false);
    setAgentInfo(null);
  };

  const value = {
    isOpen,
    setIsOpen,
    messages,
    isTyping,
    sessionId,
    isLiveAgent,
    agentInfo,
    sendMessage,
    transferToLiveAgent,
    clearChat,
    addMessage
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
