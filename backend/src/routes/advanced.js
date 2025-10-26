const express = require('express');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Real-time lead activity feed
router.get('/activity-feed', auth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const recentActivities = await Lead.aggregate([
      { $unwind: '$activities' },
      { $sort: { 'activities.createdAt': -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'activities.createdBy',
          foreignField: '_id',
          as: 'activityUser'
        }
      },
      {
        $project: {
          leadName: '$name',
          leadId: '$_id',
          activity: '$activities',
          user: { $arrayElemAt: ['$activityUser', 0] }
        }
      }
    ]);

    res.json(recentActivities);
  } catch (error) {
    logger.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// AI-powered lead scoring
router.post('/ai/score-lead/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // AI scoring algorithm
    let aiScore = 50; // Base score

    // Source scoring
    const sourceScores = {
      referral: 25,
      phone: 20,
      website: 15,
      event: 15,
      social: 10,
      email: 5,
      other: 0
    };
    aiScore += sourceScores[lead.source] || 0;

    // Company presence
    if (lead.company) aiScore += 10;
    if (lead.phone) aiScore += 15;

    // Activity level
    if (lead.activities.length > 0) aiScore += Math.min(lead.activities.length * 2, 20);

    // Recency
    const hoursOld = (Date.now() - lead.createdAt) / (1000 * 60 * 60);
    if (hoursOld < 1) aiScore += 20;
    else if (hoursOld < 24) aiScore += 10;
    else if (hoursOld > 168) aiScore -= 15;

    // Status weight
    const statusWeight = {
      new: 0,
      contacted: 5,
      qualified: 10,
      proposal: 15,
      negotiation: 20,
      closed_won: 30,
      closed_lost: -30
    };
    aiScore += statusWeight[lead.status] || 0;

    // Priority weight
    const priorityWeight = {
      urgent: 15,
      high: 10,
      medium: 5,
      low: 0
    };
    aiScore += priorityWeight[lead.priority] || 0;

    // Normalize score
    aiScore = Math.max(0, Math.min(100, aiScore));

    // Update lead with AI insights
    lead.score = aiScore;
    lead.activities.push({
      type: 'note',
      description: `AI recalculated lead score to ${aiScore}`,
      createdBy: req.user._id
    });

    await lead.save();

    res.json({
      leadId: lead._id,
      previousScore: lead.score,
      newScore: aiScore,
      insights: {
        strengths: getStrengths(lead),
        recommendations: getRecommendations(lead)
      }
    });
  } catch (error) {
    logger.error('Error scoring lead:', error);
    res.status(500).json({ error: 'Failed to score lead' });
  }
});

// Get lead insights
function getStrengths(lead) {
  const strengths = [];
  if (lead.source === 'referral') strengths.push('High-quality referral source');
  if (lead.company) strengths.push('Company identified');
  if (lead.phone) strengths.push('Phone number available');
  if (lead.activities.length > 3) strengths.push('High engagement level');
  if (lead.priority === 'urgent') strengths.push('Marked as urgent priority');
  return strengths;
}

function getRecommendations(lead) {
  const recommendations = [];
  if (!lead.phone) recommendations.push('Collect phone number for better reach');
  if (lead.activities.length === 0) recommendations.push('Make first contact within 24 hours');
  if (lead.status === 'new' && (Date.now() - lead.createdAt) > 86400000) {
    recommendations.push('Lead is over 24 hours old - contact urgently');
  }
  if (lead.expectedValue === 0) recommendations.push('Estimate deal value');
  return recommendations;
}

// Pipeline analytics
router.get('/analytics/pipeline', auth, async (req, res) => {
  try {
    const pipelineData = await Lead.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$expectedValue' },
          avgScore: { $avg: '$score' }
        }
      },
      {
        $project: {
          status: '$_id',
          count: 1,
          totalValue: 1,
          avgScore: { $round: ['$avgScore', 2] }
        }
      }
    ]);

    // Calculate conversion rates
    const totalLeads = await Lead.countDocuments();
    const converted = await Lead.countDocuments({ status: 'closed_won' });
    const lost = await Lead.countDocuments({ status: 'closed_lost' });

    res.json({
      pipeline: pipelineData,
      metrics: {
        totalLeads,
        conversionRate: ((converted / totalLeads) * 100).toFixed(2),
        lossRate: ((lost / totalLeads) * 100).toFixed(2),
        winRate: converted > 0 ? ((converted / (converted + lost)) * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    logger.error('Error fetching pipeline analytics:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline analytics' });
  }
});

// Lead velocity (speed through pipeline)
router.get('/analytics/velocity', auth, async (req, res) => {
  try {
    const velocityData = await Lead.aggregate([
      {
        $match: {
          status: { $in: ['closed_won', 'closed_lost'] },
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $project: {
          daysInPipeline: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          },
          status: 1
        }
      },
      {
        $group: {
          _id: '$status',
          avgDays: { $avg: '$daysInPipeline' },
          minDays: { $min: '$daysInPipeline' },
          maxDays: { $max: '$daysInPipeline' }
        }
      }
    ]);

    res.json(velocityData);
  } catch (error) {
    logger.error('Error fetching velocity:', error);
    res.status(500).json({ error: 'Failed to fetch velocity data' });
  }
});

// Lead distribution by team member
router.get('/analytics/team-performance', auth, authorize(['manager', 'admin']), async (req, res) => {
  try {
    const performance = await Lead.aggregate([
      {
        $group: {
          _id: '$assignedTo',
          totalLeads: { $sum: 1 },
          wonLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'closed_won'] }, 1, 0] }
          },
          lostLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'closed_lost'] }, 1, 0] }
          },
          totalValue: { $sum: '$expectedValue' },
          avgScore: { $avg: '$score' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userName: '$user.name',
          userEmail: '$user.email',
          totalLeads: 1,
          wonLeads: 1,
          lostLeads: 1,
          totalValue: 1,
          avgScore: { $round: ['$avgScore', 2] },
          winRate: {
            $cond: [
              { $gt: [{ $add: ['$wonLeads', '$lostLeads'] }, 0] },
              {
                $multiply: [
                  { $divide: ['$wonLeads', { $add: ['$wonLeads', '$lostLeads'] }] },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    res.json(performance);
  } catch (error) {
    logger.error('Error fetching team performance:', error);
    res.status(500).json({ error: 'Failed to fetch team performance' });
  }
});

// Hot leads (high priority, high score, recent)
router.get('/hot-leads', auth, async (req, res) => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const hotLeads = await Lead.find({
      assignedTo: req.user._id,
      status: { $in: ['new', 'contacted', 'qualified'] },
      $or: [
        { priority: 'urgent' },
        { score: { $gte: 85 } },
        {
          priority: 'high',
          createdAt: { $gte: twoDaysAgo }
        }
      ]
    })
      .sort({ score: -1, priority: -1, createdAt: -1 })
      .limit(10)
      .populate('assignedTo', 'name email');

    res.json(hotLeads);
  } catch (error) {
    logger.error('Error fetching hot leads:', error);
    res.status(500).json({ error: 'Failed to fetch hot leads' });
  }
});

// Stale leads (no activity in X days)
router.get('/stale-leads', auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const staleLeads = await Lead.find({
      assignedTo: req.user._id,
      status: { $in: ['contacted', 'qualified', 'proposal'] },
      $or: [
        { lastContactedAt: { $lt: cutoffDate } },
        { lastContactedAt: null, createdAt: { $lt: cutoffDate } }
      ]
    })
      .sort({ lastContactedAt: 1, createdAt: 1 })
      .limit(20)
      .populate('assignedTo', 'name email');

    res.json(staleLeads);
  } catch (error) {
    logger.error('Error fetching stale leads:', error);
    res.status(500).json({ error: 'Failed to fetch stale leads' });
  }
});

module.exports = router;
