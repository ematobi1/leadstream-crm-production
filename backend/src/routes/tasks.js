const express = require('express');
const Task = require('../models/Task');
const { auth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all tasks
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, dueDate, assignedTo } = req.query;
    
    const filter = {};
    
    // Filter by user's tasks if sales_rep
    if (req.user.role === 'sales_rep') {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (dueDate) {
      const date = new Date(dueDate);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      filter.dueDate = { $gte: date, $lt: nextDay };
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('relatedLead', 'name company')
      .populate('createdBy', 'name')
      .sort({ dueDate: 1, priority: -1 });

    res.json(tasks);
  } catch (error) {
    logger.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id,
      assignedTo: req.body.assignedTo || req.user._id
    };

    const task = new Task(taskData);
    await task.save();
    await task.populate('assignedTo relatedLead createdBy');

    logger.info(`Task created: ${task._id}`);
    res.status(201).json(task);
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Mark completed if status changes to completed
    if (req.body.status === 'completed' && task.status !== 'completed') {
      req.body.completedAt = new Date();
    }

    Object.assign(task, req.body);
    await task.save();
    await task.populate('assignedTo relatedLead createdBy');

    res.json(task);
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(400).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
