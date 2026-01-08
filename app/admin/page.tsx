'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Loader2, LogOut, User, CheckCircle, XCircle, Clock, 
  Users, Shield, RefreshCw, Search
} from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { getCurrentUser, signOut, UserProfile, hasRole } from '@/lib/auth';

interface UserWithProfile extends UserProfile {
  // Additional fields if needed
}

export default function AdminPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending');
  const [roleFilter, setRoleFilter] = useState<'all' | 'sales' | 'marketing' | 'admin' | 'doctor'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchUsers();
    }
  }, [profile, filter, roleFilter]);

  const checkAuth = async () => {
    try {
      const userData = await getCurrentUser();
      
      if (!userData || !userData.profile) {
        router.push('/login');
        return;
      }

      // Only admin can access this page
      if (!hasRole(userData.profile, ['admin'])) {
        router.push('/dashboard');
        return;
      }

      setProfile(userData.profile);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const supabase = createClient();
      
      let query = (supabase
        .from('user_profiles') as any)
        .select('id, first_name, last_name, email, phone, role, is_approved, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'pending') {
        query = query.eq('is_approved', false);
      } else if (filter === 'approved') {
        query = query.eq('is_approved', true);
      }

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch {
      // Failed to fetch users
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setProcessingId(userId);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from('user_profiles') as any)
        .update({ is_approved: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_approved: true } : user
      ));
    } catch {
      alert('Failed to approve user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user? This will remove their access.')) {
      return;
    }

    setProcessingId(userId);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from('user_profiles') as any)
        .update({ is_approved: false, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_approved: false } : user
      ));
    } catch {
      alert('Failed to reject user');
    } finally {
      setProcessingId(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    setProcessingId(userId);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from('user_profiles') as any)
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole as any } : user
      ));
    } catch {
      alert('Failed to change role');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch {
      // Logout failed silently
    }
  };

  // Helper function to check if user data should be hidden (test accounts)
  const isTestUserData = (email?: string, firstName?: string, lastName?: string) => {
    if (!email && !firstName && !lastName) return false;
    
    const emailLower = email?.toLowerCase() || '';
    const fullName = `${firstName || ''} ${lastName || ''}`.toLowerCase();
    
    if (emailLower === 'oguzhansivri53@gmail.com') return true;
    if (fullName.includes('oğuzhan sivri') || fullName.includes('oguzhan sivri')) return true;
    
    return false;
  };

  const filteredUsers = users.filter(user => {
    if (isTestUserData(user.email, user.first_name, user.last_name)) return false;
    
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.first_name.toLowerCase().includes(search) ||
      user.last_name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    );
  });

  const realUsers = users.filter(u => !isTestUserData(u.email, u.first_name, u.last_name));
  const pendingCount = realUsers.filter(u => !u.is_approved && (u.role === 'sales' || u.role === 'marketing' || u.role === 'doctor')).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#006069]" />
      </div>
    );
  }

  if (!profile) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'marketing': return 'bg-blue-100 text-blue-700';
      case 'sales': return 'bg-green-100 text-green-700';
      case 'doctor': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadge = (isApproved: boolean) => {
    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp"
              alt="Natural Clinic"
              width={150}
              height={50}
              priority
            />
            <span className="text-[#006069] font-semibold">Design Studio</span>
            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full ml-2">
              Admin Panel
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="/dashboard"
              className="text-gray-600 hover:text-[#006069] transition-colors text-sm"
            >
              ← Back to Dashboard
            </a>
            <div className="flex items-center gap-2 text-gray-600">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="font-medium">{profile.first_name} {profile.last_name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{realUsers.length}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-500">Pending Approval</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {realUsers.filter(u => u.is_approved).length}
                </p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {realUsers.filter(u => u.role === 'sales' || u.role === 'marketing' || u.role === 'doctor').length}
                </p>
                <p className="text-sm text-gray-500">Sales, Marketing & Doctors</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Filters */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069]"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setFilter('pending')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      filter === 'pending' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setFilter('approved')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      filter === 'approved' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Approved
                  </button>
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      filter === 'all' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006069]"
                >
                  <option value="all">All Roles</option>
                  <option value="sales">Sales</option>
                  <option value="marketing">Marketing</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>

                {/* Refresh */}
                <button
                  onClick={fetchUsers}
                  disabled={loadingUsers}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingUsers ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#006069]" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-12 h-12 mb-4 text-gray-300" />
                <p>No users found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#006069] to-[#004750] rounded-full flex items-center justify-center text-white font-semibold">
                            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            {user.phone && (
                              <p className="text-xs text-gray-400">{user.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, e.target.value)}
                          disabled={processingId === user.id || user.id === profile.id}
                          className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer ${getRoleBadgeColor(user.role)} ${
                            user.id === profile.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <option value="sales">Sales</option>
                          <option value="marketing">Marketing</option>
                          <option value="doctor">Doctor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(user.is_approved)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!user.is_approved ? (
                            <button
                              onClick={() => handleApprove(user.id)}
                              disabled={processingId === user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {processingId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReject(user.id)}
                              disabled={processingId === user.id || user.id === profile.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              {processingId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
