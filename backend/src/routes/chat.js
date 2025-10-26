const express = require('express');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Knowledge base for the CRM
const knowledgeBase = {
  leads: {
    keywords: ['lead', 'leads', 'create lead', 'add lead', 'new lead', 'contact'],
    answer: `**Managing Leads in LeadStream CRM:**

1. **Create a Lead**: Click the "+ Add New Lead" button on the Leads page
2. **View Leads**: Navigate to the Leads page from the sidebar
3. **Filter Leads**: Use the search bar and filters (status, priority)
4. **Edit Lead**: Click on any lead to view details and edit
5. **Lead Statuses**: New → Contacted → Qualified → Proposal → Negotiation → Closed Won/Lost
6. **Lead Score**: Each lead has an AI-calculated score (0-100) based on engagement and potential

Would you like to know more about a specific aspect?`,
    confidence: 0.95
  },
  pipeline: {
    keywords: ['pipeline', 'deals', 'sales pipeline', 'stages', 'kanban', 'move deal'],
    answer: `**Sales Pipeline Management:**

The Pipeline view uses a Kanban board with 4 stages:
1. **Qualified** - Leads ready for proposals
2. **Proposal** - Proposals sent to clients
3. **Negotiation** - In price/terms discussion
4. **Closed Won** - Successfully closed deals

**Features:**
- Drag & drop deals between stages
- View deal value and metrics per stage
- Track pipeline value and conversion rates
- Filter deals by value or search

Access it from the Pipeline menu in the sidebar.`,
    confidence: 0.95
  },
  tasks: {
    keywords: ['task', 'tasks', 'to-do', 'reminder', 'follow up', 'create task'],
    answer: `**Task Management:**

**Creating Tasks:**
- Click "+ New Task" on the Tasks page
- Set title, description, due date, and priority
- Link tasks to specific leads
- Mark tasks as automated

**Task Types:**
- Call
- Email
- Meeting
- Follow-up
- Demo
- Other

**Priority Levels:** Low, Medium, High, Urgent

Tasks help you stay organized and ensure timely follow-ups with leads!`,
    confidence: 0.95
  },
  analytics: {
    keywords: ['analytics', 'reports', 'dashboard', 'metrics', 'statistics', 'conversion'],
    answer: `**Analytics & Reporting:**

**Dashboard Metrics:**
- Total revenue
- Conversion rates
- Average deal size
- Pipeline value

**Available Reports:**
- Lead source breakdown
- Team performance
- Conversion funnel
- Sales velocity
- Lead by status

**Export Options:**
- CSV, PDF, Excel formats
- Custom date ranges
- Filtered reports

Access Analytics from the sidebar to view detailed insights!`,
    confidence: 0.95
  },
  ai_features: {
    keywords: ['ai', 'artificial intelligence', 'ai score', 'predictions', 'automation'],
    answer: `**AI-Powered Features:**

1. **Lead Scoring**: Automatic 0-100 score based on:
   - Lead source quality
   - Engagement level
   - Response time
   - Activity history

2. **Hot Leads Detection**: AI identifies high-priority leads

3. **Stale Lead Alerts**: Notifies you of inactive leads

4. **Automated Tasks**: System creates follow-up tasks based on lead status

5. **Smart Recommendations**: Suggests next best actions

Our AI continuously learns to help you close more deals!`,
    confidence: 0.95
  },
  notifications: {
    keywords: ['notification', 'notifications', 'alerts', 'real-time'],
    answer: `**Real-Time Notifications:**

You receive notifications for:
- New leads created
- Lead status updates
- Notes added to leads
- Tasks due soon
- Team member activities

**Features:**
- Bell icon shows unread count
- Click to view notification center
- Mark as read individually or all at once
- Live updates via WebSocket

Enable notifications in Settings > Notifications.`,
    confidence: 0.95
  },
  export: {
    keywords: ['export', 'download', 'csv', 'excel', 'pdf'],
    answer: `**Data Export:**

**From Analytics Page:**
- Click "Export" button
- Choose format: CSV, Excel, or PDF
- Select date range
- Download your data

**What You Can Export:**
- Lead lists with all details
- Pipeline reports
- Analytics data
- Team performance metrics
- Task lists

All exports include your current filters and date selections.`,
    confidence: 0.95
  },
  help: {
    keywords: ['help', 'support', 'how to', 'guide', 'tutorial', 'documentation'],
    answer: `**Getting Help:**

**I can help you with:**
- Creating and managing leads
- Using the sales pipeline
- Setting up tasks and reminders
- Understanding analytics
- Configuring settings
- Export and reporting

**For Complex Issues:**
- Click "Transfer to Live Agent" for human support
- Check our documentation (coming soon)
- Email support@leadstream.com

What would you like help with?`,
    confidence: 0.95
  }
};

// Find best matching answer from knowledge base
function findAnswer(message) {
  const messageLower = message.toLowerCase();
  let bestMatch = null;
  let highestConfidence = 0;

  for (const [category, data] of Object.entries(knowledgeBase)) {
    const matchCount = data.keywords.filter(keyword =>
      messageLower.includes(keyword.toLowerCase())
    ).length;

    if (matchCount > 0) {
      const confidence = Math.min(data.confidence * (matchCount / data.keywords.length), 0.98);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          answer: data.answer,
          confidence,
          category
        };
      }
    }
  }

  return bestMatch;
}

// Handle chat message
router.post('/message', auth, async (req, res) => {
  try {
    const { sessionId, message, messages } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    logger.info(`Chat message from ${req.user.name} (session: ${sessionId}): ${message}`);

    // Try to find answer in knowledge base
    const kbMatch = findAnswer(message);

    if (kbMatch && kbMatch.confidence > 0.5) {
      // Good match found in knowledge base
      return res.json({
        message: kbMatch.answer,
        confidence: kbMatch.confidence,
        source: 'knowledge_base',
        category: kbMatch.category,
        suggestLiveAgent: kbMatch.confidence < 0.7
      });
    }

    // If no good match, check if user is asking for live agent
    const liveAgentKeywords = ['human', 'agent', 'person', 'speak to someone', 'real person', 'live support'];
    const wantsLiveAgent = liveAgentKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );

    if (wantsLiveAgent) {
      return res.json({
        message: "I understand you'd like to speak with a live agent. Let me connect you!",
        suggestLiveAgent: true,
        confidence: 0.95
      });
    }

    // Generic helpful response if no match
    const genericResponses = [
      {
        trigger: ['price', 'cost', 'pricing', 'payment'],
        response: "For pricing information, please contact our sales team or check the pricing page. Would you like me to transfer you to a live agent who can discuss pricing options?"
      },
      {
        trigger: ['bug', 'error', 'broken', 'not working', 'issue'],
        response: "I'm sorry you're experiencing an issue. Could you describe what's happening in more detail? If this is urgent, I can connect you with a live agent who can help troubleshoot."
      },
      {
        trigger: ['account', 'login', 'password', 'reset'],
        response: "For account-related issues:\n- Reset password: Use 'Forgot Password' on login page\n- Login issues: Clear browser cache and try again\n- Account settings: Go to Settings > Profile\n\nNeed more help? I can transfer you to support."
      }
    ];

    for (const generic of genericResponses) {
      if (generic.trigger.some(keyword => message.toLowerCase().includes(keyword))) {
        return res.json({
          message: generic.response,
          confidence: 0.6,
          source: 'generic',
          suggestLiveAgent: true
        });
      }
    }

    // Default response
    res.json({
      message: `I'm not entirely sure about that. Here's what I can definitely help with:

• **Leads**: Creating, managing, and organizing leads
• **Pipeline**: Moving deals through sales stages
• **Tasks**: Setting up reminders and follow-ups
• **Analytics**: Understanding your sales metrics
• **Settings**: Configuring your account

Could you rephrase your question, or would you like to speak with a live agent?`,
      confidence: 0.3,
      source: 'fallback',
      suggestLiveAgent: true
    });

  } catch (error) {
    logger.error('Error processing chat message:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: "I apologize, but I'm having trouble processing your request. Would you like to speak with a live agent?"
    });
  }
});

// Transfer to live agent
router.post('/transfer-to-agent', auth, async (req, res) => {
  try {
    const { sessionId, messages } = req.body;

    logger.info(`Transfer to live agent requested by ${req.user.name} (session: ${sessionId})`);

    // In a production system, this would:
    // 1. Check for available agents
    // 2. Assign to agent queue
    // 3. Notify agents via Socket.IO
    // 4. Create a support ticket

    // For MVP, we'll simulate agent availability
    const agentsAvailable = Math.random() > 0.3; // 70% chance agent is available

    if (agentsAvailable) {
      // Emit Socket.IO event to notify available agents
      if (req.io) {
        req.io.emit('newChatRequest', {
          sessionId,
          user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
          },
          messages: messages || [],
          timestamp: new Date()
        });
      }

      res.json({
        success: true,
        agent: {
          name: 'Support Agent',
          status: 'available'
        },
        estimatedWaitTime: 0,
        message: 'Connecting you to a live agent...'
      });
    } else {
      res.json({
        success: false,
        message: 'All agents are currently busy. Please try again in a few minutes.',
        estimatedWaitTime: 300 // 5 minutes
      });
    }

  } catch (error) {
    logger.error('Error transferring to agent:', error);
    res.status(500).json({ error: 'Failed to transfer to agent' });
  }
});

// Get chat history
router.get('/history/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // In production, retrieve from database
    // For now, return empty as client stores locally
    res.json({
      sessionId,
      messages: [],
      message: 'Chat history is stored locally in your browser'
    });

  } catch (error) {
    logger.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

module.exports = router;
