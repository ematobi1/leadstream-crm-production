const express = require('express');
const Deal = require('../models/Deal');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all deals
router.get('/', auth, async (req, res) => {
  try {
    const { stage, assignedTo } = req.query;
    
    const filter = {};
    
    if (req.user.role === 'sales_rep') {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }
    
    if (stage) filter.stage = stage;

    const deals = await Deal.find(filter)
      .populate('lead', 'name email company')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name')
      .sort({ expectedCloseDate: 1 });

    res.json(deals);
  } catch (error) {
    logger.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get pipeline statistics
router.get('/pipeline/stats', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'sales_rep') {
      filter.assignedTo = req.user._id;
    }

    const stats = await Deal.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
          avgProbability: { $avg: '$probability' }
        }
      }
    ]);

    const totalValue = await Deal.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    res.json({
      stages: stats,
      totalPipelineValue: totalValue[0]?.total || 0
    });
  } catch (error) {
    logger.error('Error fetching pipeline stats:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline stats' });
  }
});

// Create deal
router.post('/', auth, async (req, res) => {
  try {
    const dealData = {
      ...req.body,
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id
    };

    const deal = new Deal(dealData);
    await deal.save();
    await deal.populate('lead assignedTo createdBy');

    logger.info(`Deal created: ${deal._id}`);
    res.status(201).json(deal);
  } catch (error) {
    logger.error('Error creating deal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update deal
router.put('/:id', auth, async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    
    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Set actual close date if deal is closed
    if (['closed_won', 'closed_lost'].includes(req.body.stage) && !deal.actualCloseDate) {
      req.body.actualCloseDate = new Date();
    }

    Object.assign(deal, req.body);
    await deal.save();
    await deal.populate('lead assignedTo createdBy');

    res.json(deal);
  } catch (error) {
    logger.error('Error updating deal:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete deal
router.delete('/:id', auth, async (req, res) => {
  try {
    await Deal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    logger.error('Error deleting deal:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
