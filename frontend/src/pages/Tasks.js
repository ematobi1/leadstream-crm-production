import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import {
  Plus, CheckCircle, Circle, Calendar, Clock, Users, Filter,
  ChevronDown, X, Edit, Trash2, AlertCircle, Star, Zap
} from 'lucide-react';

export default function Tasks() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    type: 'follow_up'
  });

  // Fetch tasks from backend
  const { data: tasks = [], isLoading } = useQuery('tasks', async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/tasks`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }, {
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
  });

  // Create task mutation
  const createTaskMutation = useMutation(
    async (taskData) => {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/tasks`, taskData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task created successfully');
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          dueDate: '',
          priority: 'medium',
          type: 'follow_up'
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create task');
      }
    }
  );

  // Update task mutation
  const updateTaskMutation = useMutation(
    async ({ taskId, updates }) => {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/tasks/${taskId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update task');
      }
    }
  );

  // Delete task mutation
  const deleteTaskMutation = useMutation(
    async (taskId) => {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tasks');
        toast.success('Task deleted');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete task');
      }
    }
  );

  const handleCreateTask = (e) => {
    e.preventDefault();
    createTaskMutation.mutate(formData);
  };

  const handleToggleComplete = (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    updateTaskMutation.mutate({
      taskId,
      updates: { status: newStatus }
    });
  };

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'pending') return task.status === 'pending' || task.status === 'in_progress';
    if (filter === 'automated') return task.type === 'automated' || task.automated;
    if (filter === 'high') return task.priority === 'high' || task.priority === 'urgent';
    return true;
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t =>
    (t.status === 'pending' || t.status === 'in_progress') && new Date(t.dueDate) < new Date()
  ).length;
  const automatedTasks = tasks.filter(t => t.type === 'automated' || t.automated).length;

  const getTimeUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;

    if (diff < 0) return 'Overdue';
    if (diff < 1000 * 60 * 60) return `${Math.floor(diff / (1000 * 60))}m`;
    if (diff < 1000 * 60 * 60 * 24) return `${Math.floor(diff / (1000 * 60 * 60))}h`;
    return `${Math.floor(diff / (1000 * 60 * 60 * 24))}d`;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks & Automation</h1>
              <p className="text-gray-600 mt-1">Manage your tasks and automated workflows</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </div>

          {/* Task Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Circle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{pendingTasks}</h3>
              <p className="text-sm text-gray-600">Pending Tasks</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{completedTasks}</h3>
              <p className="text-sm text-gray-600">Completed</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{overdueTasks}</h3>
              <p className="text-sm text-gray-600">Overdue</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{automatedTasks}</h3>
              <p className="text-sm text-gray-600">Automated</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { id: 'all', label: 'All Tasks', icon: null },
            { id: 'pending', label: 'Pending', icon: Circle },
            { id: 'completed', label: 'Completed', icon: CheckCircle },
            { id: 'automated', label: 'Automated', icon: Zap },
            { id: 'high', label: 'High Priority', icon: AlertCircle },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {f.icon && <f.icon className="w-4 h-4" />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' ? 'Get started by creating your first task' : 'No tasks match this filter'}
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Task
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed';
              const timeUntilDue = getTimeUntilDue(task.dueDate);
              const isAutomated = task.type === 'automated' || task.automated;

              return (
                <div
                  key={task._id}
                  className={`bg-white rounded-lg shadow-sm border p-4 transition-all ${
                    task.status === 'completed'
                      ? 'border-gray-200 opacity-60'
                      : isOverdue
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(task._id, task.status)}
                      className="mt-1 flex-shrink-0"
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400 hover:text-blue-600" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className={`font-semibold text-gray-900 mb-1 ${
                            task.status === 'completed' ? 'line-through' : ''
                          }`}>
                            {task.title}
                            {isAutomated && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <Zap className="w-3 h-3" />
                                Automated
                              </span>
                            )}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-gray-600">{task.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteTask(task._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Task Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {/* Due Date */}
                        <div className={`flex items-center gap-1 ${
                          isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
                        }`}>
                          <Clock className="w-4 h-4" />
                          <span>{timeUntilDue}</span>
                          {!isOverdue && (
                            <span className="text-gray-400">
                              - {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Priority */}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          getPriorityColor(task.priority)
                        }`}>
                          {(task.priority || 'medium').toUpperCase()}
                        </span>

                        {/* Assigned To */}
                        {task.assignedTo && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span>{task.assignedTo.name || task.assignedTo.email}</span>
                          </div>
                        )}

                        {/* Related Lead */}
                        {task.relatedLead && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Star className="w-4 h-4" />
                            <span>{task.relatedLead.name}</span>
                            {task.relatedLead.company && (
                              <span className="text-gray-400">({task.relatedLead.company})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Follow up with client"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add more details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="follow_up">Follow Up</option>
                  <option value="demo">Demo</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
