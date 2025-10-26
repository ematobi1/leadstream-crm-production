import { API_URL } from '../config';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import {
  Plus, DollarSign, TrendingUp, Calendar, Users, MoreVertical,
  Edit, Trash2, Eye, CheckCircle, Clock, Target, Percent, ChevronRight
} from 'lucide-react';

const fetchDeals = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('${API_URL}/leads?status=proposal,negotiation,qualified', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) throw new Error('Failed to fetch deals');
  const data = await response.json();
  return data.leads || [];
};

const stages = [
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-purple-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'closed_won', name: 'Closed Won', color: 'bg-green-500' },
];

export default function Pipeline() {
  const queryClient = useQueryClient();
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [draggedOverStage, setDraggedOverStage] = useState(null);

  const { data: deals = [], isLoading } = useQuery('deals', fetchDeals);

  const updateDealStage = useMutation(
    async ({ dealId, stage }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/leads/${dealId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: stage })
      });
      if (!response.ok) throw new Error('Failed to update deal');
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('deals');
        toast.success('Deal updated successfully');
      },
      onError: () => toast.error('Failed to update deal'),
    }
  );

  const getDealsByStage = (stage) => {
    return deals.filter(deal => deal.status === stage);
  };

  const calculateStageMetrics = (stage) => {
    const stageDeals = getDealsByStage(stage);
    const totalValue = stageDeals.reduce((sum, deal) => sum + (deal.expectedValue || 0), 0);
    const count = stageDeals.length;
    return { count, totalValue };
  };

  const totalPipelineValue = deals.reduce((sum, deal) => sum + (deal.expectedValue || 0), 0);
  const averageDealSize = deals.length > 0 ? totalPipelineValue / deals.length : 0;

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  const handleStageChange = (dealId, newStage) => {
    updateDealStage.mutate({ dealId, stage: newStage });
  };

  // Drag and Drop handlers
  const handleDragStart = (deal) => {
    setDraggedDeal(deal);
  };

  const handleDragEnd = () => {
    setDraggedDeal(null);
    setDraggedOverStage(null);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    setDraggedOverStage(stageId);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDraggedOverStage(null);
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    if (draggedDeal && draggedDeal.status !== targetStage) {
      handleStageChange(draggedDeal._id, targetStage);
      toast.success(`Deal moved to ${stages.find(s => s.id === targetStage)?.name}`, {
        icon: '🎯',
      });
    }
    setDraggedDeal(null);
    setDraggedOverStage(null);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header with Metrics */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
              <p className="text-gray-600 mt-1">Track and manage your deals through each stage</p>
            </div>
            <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Deal
            </button>
          </div>

          {/* Pipeline Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-green-600 text-sm font-semibold">+12%</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{deals.length}</h3>
              <p className="text-sm text-gray-600">Active Deals</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-green-600 text-sm font-semibold">+23%</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                ${(totalPipelineValue / 1000).toFixed(0)}K
              </h3>
              <p className="text-sm text-gray-600">Pipeline Value</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-green-600 text-sm font-semibold">+8%</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                ${(averageDealSize / 1000).toFixed(0)}K
              </h3>
              <p className="text-sm text-gray-600">Avg Deal Size</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Percent className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-green-600 text-sm font-semibold">+5%</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">34%</h3>
              <p className="text-sm text-gray-600">Win Rate</p>
            </div>
          </div>
        </div>

        {/* Pipeline Board */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading pipeline...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {stages.map((stage) => {
              const metrics = calculateStageMetrics(stage.id);
              const stageDeals = getDealsByStage(stage.id);
              const isDropZone = draggedOverStage === stage.id;
              const isDragging = draggedDeal?.status === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`bg-gray-50 rounded-lg p-4 transition-all ${
                    isDropZone ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {/* Stage Header */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                      <span className="text-sm text-gray-600">{metrics.count}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 rounded-full ${stage.color} flex-1`}></div>
                      <span className="text-xs font-medium text-gray-600">
                        ${(metrics.totalValue / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>

                  {/* Deals in Stage */}
                  <div className={`space-y-3 min-h-[200px] ${isDragging ? 'opacity-50' : ''}`}>
                    {stageDeals.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        {isDropZone ? 'Drop here' : 'No deals in this stage'}
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <DealCard
                          key={deal._id}
                          deal={deal}
                          onClick={() => handleDealClick(deal)}
                          onStageChange={handleStageChange}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          stages={stages}
                          currentStage={stage.id}
                          isDragging={draggedDeal?._id === deal._id}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Deal Detail Modal */}
      {showDetailModal && selectedDeal && (
        <DealDetailModal
          deal={selectedDeal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDeal(null);
          }}
          onStageChange={handleStageChange}
          stages={stages}
        />
      )}
    </Layout>
  );
}

function DealCard({ deal, onClick, onStageChange, onDragStart, onDragEnd, stages, currentStage, isDragging }) {
  const [showMenu, setShowMenu] = useState(false);

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(deal);
      }}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-move ${
        isDragging ? 'opacity-50 rotate-2 scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 text-sm mb-1">{deal.name}</h4>
          <p className="text-xs text-gray-600">{deal.company}</p>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
              <div className="py-1">
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStageChange(deal._id, stage.id);
                      setShowMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      currentStage === stage.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    Move to {stage.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-bold text-gray-900">
          ${(deal.expectedValue || 0).toLocaleString()}
        </div>
        <div className={`w-2 h-2 rounded-full ${getPriorityColor(deal.priority)}`}></div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-gray-600">
          <Users className="w-3 h-3" />
          <span>{deal.assignedTo?.name || 'Unassigned'}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Calendar className="w-3 h-3" />
          <span>{new Date(deal.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">Score</span>
          <span className="font-medium text-gray-900">{deal.score}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-blue-600 h-1.5 rounded-full"
            style={{ width: `${deal.score}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

function DealDetailModal({ deal, onClose, onStageChange, stages }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{deal.name}</h2>
              <p className="text-blue-100 mt-1">{deal.company}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Deal Value & Score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Deal Value</span>
              </div>
              <p className="text-3xl font-bold text-green-900">
                ${(deal.expectedValue || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Lead Score</span>
              </div>
              <p className="text-3xl font-bold text-blue-900">{deal.score}/100</p>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900 mt-1">{deal.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-gray-900 mt-1">{deal.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className="text-gray-900 mt-1 capitalize">{deal.status.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <p className="text-gray-900 mt-1 capitalize">{deal.priority}</p>
              </div>
            </div>
          </div>

          {/* Change Stage */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Change Stage</h3>
            <div className="grid grid-cols-2 gap-3">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => {
                    onStageChange(deal._id, stage.id);
                    onClose();
                  }}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    deal.status === stage.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {stage.name}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
            <div className="space-y-3">
              {deal.activities && deal.activities.length > 0 ? (
                deal.activities.slice(0, 5).map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
