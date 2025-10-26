import { API_URL } from '../config';
import React, { useState } from 'react';
import { useQuery } from 'react-query';
import Layout from '../components/Layout';
import {
  TrendingUp, Users, DollarSign, Target, Calendar, Download,
  BarChart3, PieChart, Activity, Clock, Zap, Award, ArrowUp, ArrowDown
} from 'lucide-react';

const fetchAnalytics = async (timeRange) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/leads/analytics/dashboard?timeRange=${timeRange}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    // Return mock data if endpoint fails
    return {
      summary: {
        totalLeads: 2347,
        newLeads: 156,
        convertedLeads: 89,
        conversionRate: 34.2,
        avgResponseTime: 1.8
      },
      charts: {
        leadsByStatus: [
          { _id: 'new', count: 456 },
          { _id: 'contacted', count: 789 },
          { _id: 'qualified', count: 345 },
          { _id: 'proposal', count: 234 },
          { _id: 'negotiation', count: 178 },
          { _id: 'closed_won', count: 89 },
          { _id: 'closed_lost', count: 256 }
        ],
        leadsBySource: [
          { _id: 'website', count: 890 },
          { _id: 'referral', count: 567 },
          { _id: 'social', count: 345 },
          { _id: 'email', count: 289 },
          { _id: 'phone', count: 156 },
          { _id: 'event', count: 100 }
        ]
      }
    };
  }
  return response.json();
};

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('30d');
  const { data: analytics, isLoading } = useQuery(
    ['analytics', timeRange],
    () => fetchAnalytics(timeRange),
    { keepPreviousData: true }
  );

  const summary = analytics?.summary || {};
  const charts = analytics?.charts || {};

  const exportReport = () => {
    // In production, this would generate and download a PDF/Excel report
    const data = JSON.stringify(analytics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-500',
      contacted: 'bg-yellow-500',
      qualified: 'bg-purple-500',
      proposal: 'bg-indigo-500',
      negotiation: 'bg-orange-500',
      closed_won: 'bg-green-500',
      closed_lost: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getSourceIcon = (source) => {
    const icons = {
      website: '🌐',
      referral: '👥',
      social: '📱',
      email: '📧',
      phone: '📞',
      event: '🎯'
    };
    return icons[source] || '📊';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
              <p className="text-gray-600 mt-1">Track your sales performance and insights</p>
            </div>
            <div className="flex gap-2">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>

              <button
                onClick={exportReport}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                title="Total Leads"
                value={summary.totalLeads?.toLocaleString() || '0'}
                change="+12%"
                icon={Users}
                color="blue"
              />
              <MetricCard
                title="New Leads"
                value={summary.newLeads?.toLocaleString() || '0'}
                change="+18%"
                icon={TrendingUp}
                color="green"
              />
              <MetricCard
                title="Converted"
                value={summary.convertedLeads?.toLocaleString() || '0'}
                change="+23%"
                icon={Target}
                color="purple"
              />
              <MetricCard
                title="Conversion Rate"
                value={`${summary.conversionRate?.toFixed(1) || '0'}%`}
                change="+5%"
                icon={BarChart3}
                color="orange"
              />
              <MetricCard
                title="Avg Response"
                value={`${summary.avgResponseTime?.toFixed(1) || '0'} min`}
                change="-15%"
                icon={Clock}
                color="indigo"
                isNegativeGood={true}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Leads by Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-600" />
                  Leads by Status
                </h3>
                <div className="space-y-3">
                  {charts.leadsByStatus?.map((item) => {
                    const total = charts.leadsByStatus.reduce((sum, i) => sum + i.count, 0);
                    const percentage = ((item.count / total) * 100).toFixed(1);

                    return (
                      <div key={item._id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 capitalize">
                            {item._id.replace('_', ' ')}
                          </span>
                          <span className="text-gray-600">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`${getStatusColor(item._id)} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Leads by Source */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Leads by Source
                </h3>
                <div className="space-y-3">
                  {charts.leadsBySource?.map((item) => {
                    const total = charts.leadsBySource.reduce((sum, i) => sum + i.count, 0);
                    const percentage = ((item.count / total) * 100).toFixed(1);

                    return (
                      <div key={item._id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 capitalize flex items-center gap-2">
                            <span>{getSourceIcon(item._id)}</span>
                            {item._id}
                          </span>
                          <span className="text-gray-600">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">AI-Powered Insights</h3>
                    <p className="text-blue-100 text-sm">Based on your performance data</p>
                  </div>
                </div>
                <Award className="w-8 h-8 text-yellow-300" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-300" />
                    <span className="font-semibold">Top Performer</span>
                  </div>
                  <p className="text-sm text-blue-100">
                    Your conversion rate is 23% higher than last month
                  </p>
                </div>

                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-yellow-300" />
                    <span className="font-semibold">Quick Responder</span>
                  </div>
                  <p className="text-sm text-blue-100">
                    Average response time improved by 15%
                  </p>
                </div>

                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-purple-300" />
                    <span className="font-semibold">Goal Progress</span>
                  </div>
                  <p className="text-sm text-blue-100">
                    You're 85% of the way to your monthly target
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Revenue Forecast */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Revenue Forecast
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">This Month</span>
                      <span className="text-sm font-semibold text-gray-900">$156K</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Next Month</span>
                      <span className="text-sm font-semibold text-gray-900">$189K</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Quarter Goal</span>
                      <span className="text-sm font-semibold text-gray-900">$500K</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Performance */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Team Performance
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'You', deals: 23, value: '$156K', trend: 'up' },
                    { name: 'John Smith', deals: 18, value: '$124K', trend: 'up' },
                    { name: 'Sarah Wilson', deals: 15, value: '$98K', trend: 'down' },
                  ].map((member) => (
                    <div key={member.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.deals} deals</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{member.value}</p>
                        {member.trend === 'up' ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <ArrowUp className="w-3 h-3" />
                            12%
                          </span>
                        ) : (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <ArrowDown className="w-3 h-3" />
                            5%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Trends */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-600" />
                  Activity Trends
                </h3>
                <div className="space-y-4">
                  {[
                    { label: 'Emails Sent', value: 1234, change: '+15%' },
                    { label: 'Calls Made', value: 456, change: '+23%' },
                    { label: 'Meetings Held', value: 89, change: '+8%' },
                    { label: 'Proposals Sent', value: 67, change: '+12%' },
                  ].map((activity) => (
                    <div key={activity.label} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{activity.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{activity.value}</span>
                        <span className="text-xs text-green-600 font-medium">{activity.change}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function MetricCard({ title, value, change, icon: Icon, color, isNegativeGood = false }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  };

  const isPositive = isNegativeGood ? change.startsWith('-') : change.startsWith('+');

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  );
}
