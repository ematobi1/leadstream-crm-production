import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import NotificationDropdown from './NotificationDropdown';
import {
  LayoutDashboard, Users, Target, CheckSquare, BarChart3,
  Settings, Bell, Search, Menu, X, Zap, LogOut, User
} from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Pipeline', href: '/pipeline', icon: Target },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {/* Futuristic Logo */}
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-lg transform rotate-6 opacity-75 blur-sm"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg">
                <div className="absolute inset-1 border-2 border-white/30 rounded-md"></div>
                <Zap className="w-6 h-6 text-white animate-pulse" />
              </div>
            </div>
            <div>
              <span className="text-xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                LeadStream
              </span>
              <div className="text-[8px] font-semibold text-blue-600 tracking-widest -mt-1">AI POWERED</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Search bar */}
              <div className="hidden sm:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads, contacts..."
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <NotificationDropdown />

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/settings"
                        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Banner with Image/Video */}
        <div className="relative h-48 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-700 overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>

          {/* Floating particles effect */}
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full animate-ping"></div>
            <div className="absolute top-20 right-20 w-3 h-3 bg-cyan-300 rounded-full animate-pulse"></div>
            <div className="absolute bottom-10 left-1/4 w-2 h-2 bg-purple-300 rounded-full animate-bounce"></div>
            <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-white rounded-full animate-ping"></div>
          </div>

          {/* Content */}
          <div className="relative h-full flex items-center justify-between px-8">
            <div className="text-white">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">Welcome Back, {user?.name?.split(' ')[0]}</h1>
                  <p className="text-cyan-100 text-sm font-medium">AI-Powered Lead Intelligence Platform</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 mt-4">
                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <div className="text-xs text-cyan-100 uppercase tracking-wide">Active Leads</div>
                  <div className="text-2xl font-bold">2,547</div>
                </div>
                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <div className="text-xs text-cyan-100 uppercase tracking-wide">Conversion Rate</div>
                  <div className="text-2xl font-bold">24.5%</div>
                </div>
                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                  <div className="text-xs text-cyan-100 uppercase tracking-wide">Revenue</div>
                  <div className="text-2xl font-bold">$456K</div>
                </div>
              </div>
            </div>

            {/* Futuristic illustration/placeholder for image or video */}
            <div className="hidden lg:block relative w-64 h-32">
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-white/30 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs text-white/80">Add your video or image here</p>
                  </div>
                </div>
                {/* You can replace this with: <img src="/your-image.jpg" alt="Hero" className="w-full h-full object-cover" /> */}
                {/* Or: <video src="/your-video.mp4" autoPlay loop muted className="w-full h-full object-cover" /> */}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>

        {/* Footer Signature */}
        <footer className="border-t border-gray-200 bg-white">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="relative group">
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-gradient-to-r from-cyan-50 to-purple-50 border border-cyan-200/50 transition-all duration-300 group-hover:shadow-lg group-hover:scale-105">
                    <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-purple-600 rounded flex items-center justify-center">
                      <span className="text-white font-black text-xs">K</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                        KINGDOM
                      </div>
                      <div className="text-[10px] text-gray-500 -mt-0.5">
                        Crafted by Emmanuel Tobi
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-lg blur opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10"></div>
                </div>
              </div>
              <div className="text-gray-500 text-xs">
                © {new Date().getFullYear()} LeadStream CRM. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
