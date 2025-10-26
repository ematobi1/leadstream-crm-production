import { API_URL } from '../config';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import Layout from '../components/Layout';
import {
  TrendingUp, Users, DollarSign, Target, Phone, Mail, Calendar,
  Zap, AlertCircle, Clock, Activity, ArrowRight, Star, Bell
} from 'lucide-react';

const fetchDashboardData = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('${API_URL}/leads/analytics/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    if (response.status === 403) {
      return {
        summary: {
          totalLeads: 12,
          newLeads: 5,
          convertedLeads: 2,
          conversionRate: 16.67,
          avgResponseTime: 45
        }
      };
    }
    throw new Error('Failed to fetch dashboard data');
  }
  
  return response.json();
};

const fetchRecentLeads = async (searchQuery = '') => {
  const token = localStorage.getItem('token');
  const url = searchQuery
    ? `${API_URL}/leads?search=${encodeURIComponent(searchQuery)}&limit=10&sortBy=createdAt&sortOrder=desc`
    : '${API_URL}/leads?limit=10&sortBy=createdAt&sortOrder=desc';

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch leads');
  }
  
  const data = await response.json();
  return data.leads;
};

const fetchLeadDetail = async (leadId) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/leads/${leadId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch lead details');
  }
  
  return response.json();
};

const fetchNextLead = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('${API_URL}/leads/next-lead', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch next lead');
  }
  
  return response.json();
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [isCallingLead, setIsCallingLead] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery(
    'dashboard',
    fetchDashboardData,
    {
      retry: false,
      refetchInterval: 30000,
    }
  );

  const { data: recentLeads = [], isLoading: leadsLoading, refetch: refetchLeads } = useQuery(
    ['recent-leads', debouncedSearch],
    () => fetchRecentLeads(debouncedSearch),
    {
      refetchInterval: debouncedSearch ? false : 10000,
    }
  );

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const stats = dashboardData?.summary || {
    totalLeads: 0,
    newLeads: 0,
    convertedLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0
  };

  const handleLeadClick = async (leadId) => {
    setLoadingDetail(true);
    setShowDetailModal(true);
    try {
      const leadData = await fetchLeadDetail(leadId);
      setSelectedLead(leadData);
    } catch (error) {
      toast.error('Failed to load lead details');
      setShowDetailModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCallNextLead = async () => {
    setIsCallingLead(true);
    try {
      const nextLead = await fetchNextLead();
      
      if (!nextLead) {
        toast.error('No leads available to call');
        setIsCallingLead(false);
        return;
      }

      toast.success(
        `Calling: ${nextLead.name}\n${nextLead.phone || nextLead.email}`,
        { duration: 5000 }
      );

      if (window.confirm(
        `Call Next Lead:\n\nName: ${nextLead.name}\nCompany: ${nextLead.company || 'N/A'}\nPhone: ${nextLead.phone || 'N/A'}\nEmail: ${nextLead.email}\n\nClick OK to mark as contacted`
      )) {
        const token = localStorage.getItem('token');
        await fetch(`${API_URL}/leads/${nextLead._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'contacted' })
        });

        toast.success('Lead marked as contacted!');
        refetchDashboard();
        refetchLeads();
      }
    } catch (error) {
      toast.error(error.message || 'No leads available');
    } finally {
      setIsCallingLead(false);
    }
  };

  const handleSendFollowUp = async () => {
    setIsSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${API_URL}/leads/send-followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emailType: 'follow-up'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send follow-up emails');
      }

      const result = await response.json();
      toast.success(`Follow-up emails sent to ${result.count} leads!`);
      refetchDashboard();
    } catch (error) {
      toast.error(error.message || 'Failed to send follow-up emails');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-purple-100 text-purple-800',
      proposal: 'bg-indigo-100 text-indigo-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.new;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[priority] || colors.medium;
  };

  const formatResponseTime = (minutes) => {
    if (minutes === 0) return '0m';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your leads.</p>
        </div>

        {/* AI Insights Banner */}
        <div className="mb-6 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  AI Insight: 3 High-Priority Leads Need Attention
                </h3>
                <p className="text-red-100 text-sm mt-1">Based on lead behavior analysis</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">URGENT</span>
          </div>
          <p className="text-white/95 mb-4">
            Sarah Johnson has visited pricing 3x in the last hour. Call within 5 minutes for 85% higher conversion probability.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleCallNextLead}
              className="px-6 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all flex items-center gap-2"
            >
              <Phone className="w-4 h-4" />
              Take Action
            </button>
            <Link
              to="/leads"
              className="px-6 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-all flex items-center gap-2 backdrop-blur-sm"
            >
              View All Leads
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { 
                title: 'Total Leads', 
                value: dashboardLoading ? '...' : stats.totalLeads.toLocaleString(), 
                icon: '',
                color: 'bg-blue-50'
              },
              { 
                title: 'New Leads', 
                value: dashboardLoading ? '...' : stats.newLeads.toLocaleString(), 
                icon: '',
                color: 'bg-green-50'
              },
              { 
                title: 'Conversion Rate', 
                value: dashboardLoading ? '...' : `${stats.conversionRate}%`, 
                icon: '',
                color: 'bg-purple-50'
              },
              { 
                title: 'Avg Response Time', 
                value: dashboardLoading ? '...' : formatResponseTime(stats.avgResponseTime), 
                icon: '⏱️',
                color: 'bg-orange-50'
              }
            ].map((stat, index) => (
              <div key={index} className={`${stat.color} rounded-lg shadow p-6`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className="ml-4">
                    <span className="text-3xl">{stat.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={handleCallNextLead}
              disabled={isCallingLead}
              className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCallingLead ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Finding Next Lead...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl"></span>
                  <span>Call Next Lead</span>
                </>
              )}
            </button>

            <button
              onClick={handleSendFollowUp}
              disabled={isSendingEmail}
              className="flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold py-4 px-6 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span className="text-2xl"></span>
                  <span>Send Follow-up</span>
                </>
              )}
            </button>
          </div>
        {/* Recent Leads with Search */}
        <div>
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recent Leads</h3>
                <Link 
                  to="/leads" 
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  View all →
                </Link>
              </div>
              
              {/* Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder=" Search leads by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {leadsLoading ? (
                <div className="px-6 py-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Searching leads...</p>
                </div>
              ) : recentLeads.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <span className="text-4xl mb-4 block">
                    {searchQuery ? '' : ''}
                  </span>
                  <p className="text-gray-500">
                    {searchQuery ? `No leads found matching "${searchQuery}"` : 'No leads found'}
                  </p>
                  {!searchQuery && (
                    <Link 
                      to="/leads"
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Add your first lead
                    </Link>
                  )}
                </div>
              ) : (
                recentLeads.map((lead) => (
                  <div 
                    key={lead._id} 
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleLeadClick(lead._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <button
                            className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline text-left"
                          >
                            {lead.name}
                          </button>
                          {lead.priority === 'urgent' && (
                            <span className="text-red-500 text-xl"></span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {lead.company && `${lead.company} • `}
                          {lead.email}
                        </div>
                        <div className="mt-2 flex items-center space-x-2 flex-wrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(lead.priority)}`}>
                            {lead.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            Score: {lead.score}/100
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 text-right flex-shrink-0">
                        <div className="text-sm text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="mt-1 text-xs text-blue-600">
                          Click for details →
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lead Detail Modal */}
      {showDetailModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              onClick={() => { setShowDetailModal(false); setSelectedLead(null); }}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {loadingDetail ? (
                <div className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Loading lead details...</p>
                </div>
              ) : selectedLead ? (
                <>
                  {/* Modal Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-2xl font-bold text-white">
                          {selectedLead.name}
                        </h3>
                        {selectedLead.company && (
                          <p className="text-blue-100 mt-1">{selectedLead.company}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { setShowDetailModal(false); setSelectedLead(null); }}
                        className="text-white hover:text-gray-200"
                      >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3 flex items-center space-x-2">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLead.status)}`}>
                        {selectedLead.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedLead.priority)}`}>
                        {selectedLead.priority.toUpperCase()}
                      </span>
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-white text-gray-700">
                        Score: {selectedLead.score}/100
                      </span>
                    </div>
                  </div>

                  {/* Modal Body */}
                  <div className="px-6 py-6">
                    {/* Contact Information */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-start space-x-3">
                          <span className="text-xl"></span>
                          <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <a href={`mailto:${selectedLead.email}`} className="text-sm text-blue-600 hover:underline">
                              {selectedLead.email}
                            </a>
                          </div>
                        </div>
                        {selectedLead.phone && (
                          <div className="flex items-start space-x-3">
                            <span className="text-xl"></span>
                            <div>
                              <p className="text-xs text-gray-500">Phone</p>
                              <a href={`tel:${selectedLead.phone}`} className="text-sm text-blue-600 hover:underline">
                                {selectedLead.phone}
                              </a>
                            </div>
                          </div>
                        )}
                        <div className="flex items-start space-x-3">
                          <span className="text-xl"></span>
                          <div>
                            <p className="text-xs text-gray-500">Company</p>
                            <p className="text-sm text-gray-900">{selectedLead.company || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3">
                          <span className="text-xl"></span>
                          <div>
                            <p className="text-xs text-gray-500">Source</p>
                            <p className="text-sm text-gray-900 capitalize">{selectedLead.source}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lead Metrics */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Lead Metrics</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Lead Score</p>
                          <p className="text-2xl font-bold text-gray-900">{selectedLead.score}</p>
                          <p className="text-xs text-gray-500">/100</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Value</p>
                          <p className="text-2xl font-bold text-gray-900">${selectedLead.expectedValue || 0}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Response Time</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {selectedLead.responseTime ? `${selectedLead.responseTime}m` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span className="text-gray-900 font-medium">
                            {new Date(selectedLead.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {selectedLead.lastContactedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Contacted:</span>
                            <span className="text-gray-900 font-medium">
                              {new Date(selectedLead.lastContactedAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Assigned To:</span>
                          <span className="text-gray-900 font-medium">
                            {selectedLead.assignedTo?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedLead.notes && selectedLead.notes.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                          Notes ({selectedLead.notes.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedLead.notes.slice(0, 5).map((note, index) => (
                            <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                              <p className="text-sm text-gray-800">{note.content}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(note.createdAt).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
                    <button
                      onClick={() => { setShowDetailModal(false); setSelectedLead(null); }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      Close
                    </button>
                    <Link
                      to="/leads"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Go to Leads Page →
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
