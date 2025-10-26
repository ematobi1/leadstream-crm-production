const express = require('express');
const Lead = require('../models/lead');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all leads with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      source
    } = req.query;

    const filter = {};
    
    if (req.user.role === 'sales_rep') {
      filter.assignedTo = req.user._id;
    }
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (source) filter.source = source;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Lead.countDocuments(filter)
    ]);

    res.json({
      leads,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Create new lead
router.post('/', auth, async (req, res) => {
  try {
    const leadData = {
      ...req.body,
      createdBy: req.user._id
    };

    if (!leadData.assignedTo) {
      leadData.assignedTo = req.user._id;
    }

    const lead = new Lead(leadData);
    await lead.save();
    await lead.populate('assignedTo createdBy');

    if (req.io) {
      req.io.emit('newLead', {
        lead: lead.toObject(),
        assignedTo: leadData.assignedTo
      });
    }

    logger.info(`New lead created: ${lead._id}`);
    
    res.status(201).json(lead);
  } catch (error) {
    logger.error('Error creating lead:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get next lead to call (must be before /:id route)
router.get('/next-lead', auth, async (req, res) => {
  try {
    const lead = await Lead.findOne({
      assignedTo: req.user._id,
      status: { $in: ['new', 'contacted'] },
      $or: [
        { phone: { $exists: true, $ne: '' } },
        { email: { $exists: true, $ne: '' } }
      ]
    })
    .sort({ priority: -1, score: -1, createdAt: 1 })
    .populate('assignedTo', 'name email');

    if (!lead) {
      return res.status(404).json({ error: 'No leads available to call' });
    }

    res.json(lead);
  } catch (error) {
    logger.error('Error fetching next lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('notes.createdBy', 'name email')
      .populate('activities.createdBy', 'name email');

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user.role === 'sales_rep' &&
        lead.assignedTo?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(lead);
  } catch (error) {
    logger.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Update lead
router.put('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user.role === 'sales_rep' && 
        lead.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const oldStatus = lead.status;
    const newStatus = req.body.status;

    Object.assign(lead, req.body);

    if (oldStatus !== newStatus && newStatus) {
      lead.activities.push({
        type: 'status_change',
        description: `Status changed from ${oldStatus} to ${newStatus}`,
        createdBy: req.user._id
      });
    }

    if (['contacted', 'qualified'].includes(newStatus)) {
      lead.lastContactedAt = new Date();
      
      if (oldStatus === 'new') {
        lead.responseTime = Math.round((Date.now() - lead.createdAt) / (1000 * 60));
      }
    }

    await lead.save();
    await lead.populate('assignedTo createdBy');

    if (req.io) {
      req.io.emit('leadUpdated', {
        leadId: lead._id,
        changes: req.body,
        updatedBy: req.user._id
      });
    }

    logger.info(`Lead updated: ${lead._id} by ${req.user.name}`);
    
    res.json(lead);
  } catch (error) {
    logger.error('Error updating lead:', error);
    res.status(400).json({ error: error.message });
  }
});

// Bulk update leads
router.post('/bulk/update', auth, async (req, res) => {
  try {
    const { leadIds, updateData } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs are required' });
    }

    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { $set: updateData }
    );

    logger.info(`Bulk update: ${result.modifiedCount} leads updated by ${req.user.name}`);

    res.json({ 
      message: `${result.modifiedCount} leads updated successfully`,
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    logger.error('Error bulk updating leads:', error);
    res.status(400).json({ error: error.message });
  }
});

// Bulk delete leads
router.post('/bulk/delete', auth, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Lead IDs are required' });
    }

    const result = await Lead.deleteMany({ _id: { $in: leadIds } });

    logger.info(`Bulk delete: ${result.deletedCount} leads deleted by ${req.user.name}`);

    res.json({ 
      message: `${result.deletedCount} leads deleted successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    logger.error('Error bulk deleting leads:', error);
    res.status(400).json({ error: error.message });
  }
});

// Export leads to CSV
router.get('/export/csv', auth, async (req, res) => {
  try {
    const { status, priority, startDate, endDate } = req.query;
    
    const filter = {};
    if (req.user.role === 'sales_rep') {
      filter.assignedTo = req.user._id;
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Create CSV
    const csvHeader = 'Name,Email,Phone,Company,Status,Priority,Score,Source,Assigned To,Created Date\n';
    const csvRows = leads.map(lead => 
      `"${lead.name}","${lead.email}","${lead.phone || ''}","${lead.company || ''}","${lead.status}","${lead.priority}",${lead.score},"${lead.source}","${lead.assignedTo?.name || 'Unassigned'}","${new Date(lead.createdAt).toLocaleDateString()}"`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads-export-${Date.now()}.csv"`);
    res.send(csv);

    logger.info(`CSV export by ${req.user.name}: ${leads.length} leads`);
  } catch (error) {
    logger.error('Error exporting leads:', error);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

// Add note to lead
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const note = {
      content: content.trim(),
      createdBy: req.user._id
    };

    lead.notes.push(note);
    
    lead.activities.push({
      type: 'note',
      description: `Added note: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
      createdBy: req.user._id
    });

    await lead.save();
    await lead.populate('notes.createdBy', 'name email');

    if (req.io) {
      req.io.emit('leadNoteAdded', {
        leadId: lead._id,
        note: lead.notes[lead.notes.length - 1],
        addedBy: req.user._id
      });
    }

    res.status(201).json(lead.notes[lead.notes.length - 1]);
  } catch (error) {
    logger.error('Error adding note:', error);
    res.status(400).json({ error: error.message });
  }
});

// Reassign lead
router.put('/:id/reassign', auth, authorize(['manager', 'admin']), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    
    const [lead, newAssignee] = await Promise.all([
      Lead.findById(req.params.id),
      User.findById(assignedTo)
    ]);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!newAssignee) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldAssignee = lead.assignedTo;
    lead.assignedTo = assignedTo;
    
    lead.activities.push({
      type: 'status_change',
      description: `Reassigned to ${newAssignee.name}`,
      createdBy: req.user._id
    });

    await lead.save();
    await lead.populate('assignedTo');

    logger.info(`Lead ${lead._id} reassigned to ${newAssignee.name}`);
    
    res.json(lead);
  } catch (error) {
    logger.error('Error reassigning lead:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete lead
router.delete('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (req.user.role === 'sales_rep' && 
        lead.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Lead.findByIdAndDelete(req.params.id);

    if (req.io) {
      req.io.emit('leadDeleted', {
        leadId: lead._id,
        deletedBy: req.user._id
      });
    }

    logger.info(`Lead deleted: ${lead._id} by ${req.user.name}`);
    
    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    logger.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send email to lead
router.post('/:id/send-email', auth, async (req, res) => {
  try {
    const { subject, body, template } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // In a real app, this would send actual email via nodemailer
    // For now, we'll just log the activity
    lead.activities.push({
      type: 'email',
      description: `Email sent: ${subject}`,
      createdBy: req.user._id,
      metadata: { subject, template }
    });

    lead.lastContactedAt = new Date();
    await lead.save();

    logger.info(`Email sent to lead ${lead._id} by ${req.user.name}`);

    res.json({ message: 'Email sent successfully', lead });
  } catch (error) {
    logger.error('Error sending email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lead analytics
router.get('/analytics/dashboard', auth, authorize(['manager', 'admin']), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const [
      totalLeads,
      newLeads,
      convertedLeads,
      avgResponseTime,
      leadsByStatus,
      leadsBySource
    ] = await Promise.all([
      Lead.countDocuments({ createdAt: { $gte: startDate } }),
      Lead.countDocuments({ 
        createdAt: { $gte: startDate },
        status: 'new'
      }),
      Lead.countDocuments({
        createdAt: { $gte: startDate },
        status: { $in: ['closed_won'] }
      }),
      Lead.aggregate([
        { $match: { responseTime: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgTime: { $avg: '$responseTime' } } }
      ]),
      Lead.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lead.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$source', count: { $sum: 1 } } }
      ])
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
    const avgResponse = avgResponseTime[0]?.avgTime || 0;

    res.json({
      summary: {
        totalLeads,
        newLeads,
        convertedLeads,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgResponseTime: Math.round(avgResponse * 100) / 100
      },
      charts: {
        leadsByStatus,
        leadsBySource
      }
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Send follow-up emails
router.post('/send-followup', auth, async (req, res) => {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const leadsToFollowUp = await Lead.find({
      assignedTo: req.user._id,
      status: { $in: ['contacted', 'qualified'] },
      lastContactedAt: { $lt: threeDaysAgo }
    }).limit(10);

    if (leadsToFollowUp.length === 0) {
      return res.json({ message: 'No leads need follow-up', count: 0 });
    }

    for (const lead of leadsToFollowUp) {
      lead.lastContactedAt = new Date();
      lead.activities.push({
        type: 'email',
        description: 'Follow-up email sent',
        createdBy: req.user._id
      });
      await lead.save();
    }

    logger.info(`Follow-up emails sent to ${leadsToFollowUp.length} leads`);
    
    res.json({ 
      message: 'Follow-up emails sent successfully', 
      count: leadsToFollowUp.length,
      leads: leadsToFollowUp.map(l => ({ id: l._id, name: l.name, email: l.email }))
    });
  } catch (error) {
    logger.error('Error sending follow-up emails:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
