const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: [{
    type: String,
    required: true
  }],
  cc: [String],
  bcc: [String],
  status: {
    type: String,
    enum: ['draft', 'sent', 'failed', 'delivered', 'opened'],
    default: 'draft'
  },
  sentAt: Date,
  openedAt: Date,
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  deal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal'
  },
  template: String,
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attachments: [{
    filename: String,
    url: String,
    size: Number
  }]
}, {
  timestamps: true
});

emailSchema.index({ lead: 1 });
emailSchema.index({ sentBy: 1, createdAt: -1 });

module.exports = mongoose.model('Email', emailSchema);
