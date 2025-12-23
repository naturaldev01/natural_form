'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Loader2, LogOut, Users, Search, RefreshCw, 
  Calendar, Phone, Mail, User, TrendingUp, Clock,
  Download, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, signOut, UserProfile, hasRole } from '@/lib/auth';

interface Consultation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  treatment_type: string;
  created_at: string;
}

// Minimum date for data: December 20, 2025
const MIN_DATE = '2025-12-20T00:00:00+00:00';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'first_name' | 'email'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const itemsPerPage = 20;

  // Date preset helpers
  const getDatePreset = (preset: string) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    switch (preset) {
      case 'today':
        return { from: formatDate(today), to: formatDate(today) };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: formatDate(yesterday), to: formatDate(yesterday) };
      }
      case 'last7days': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        return { from: formatDate(last7), to: formatDate(today) };
      }
      case 'last30days': {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 29);
        return { from: formatDate(last30), to: formatDate(today) };
      }
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
        return { from: formatDate(startOfWeek), to: formatDate(today) };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: formatDate(startOfMonth), to: formatDate(today) };
      }
      case 'lastMonth': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: formatDate(startOfLastMonth), to: formatDate(endOfLastMonth) };
      }
      default:
        return { from: '', to: '' };
    }
  };

  const applyDatePreset = (preset: string) => {
    const { from, to } = getDatePreset(preset);
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1);
    setShowDatePicker(false);
  };

  const getActiveDateLabel = () => {
    if (!dateFrom && !dateTo) return 'Select Date';
    if (dateFrom && dateTo) {
      // Check for presets
      const today = new Date().toISOString().split('T')[0];
      if (dateFrom === today && dateTo === today) return 'Today';
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (dateFrom === yesterdayStr && dateTo === yesterdayStr) return 'Yesterday';
      
      // Format as date range
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      const formatShort = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      
      if (dateFrom === dateTo) return formatShort(fromDate);
      return `${formatShort(fromDate)} - ${formatShort(toDate)}`;
    }
    if (dateFrom) return `From ${new Date(dateFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    if (dateTo) return `Until ${new Date(dateTo).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    return 'Select Date';
  };

  const checkAuth = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      
      if (!userData || !userData.profile) {
        router.push('/login');
        return;
      }

      // Only sales, marketing and admin can access this page
      if (!hasRole(userData.profile, ['admin', 'sales', 'marketing'])) {
        router.push('/');
        return;
      }

      // Check if approved
      if (!userData.profile.is_approved) {
        router.push('/login');
        return;
      }

      setProfile(userData.profile);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchConsultations = useCallback(async () => {
    setLoadingData(true);
    try {
      // Fetch only teeth consultations from December 20, 2025 onwards
      const { data, error } = await supabase
        .from('consultations')
        .select('id, first_name, last_name, email, phone, treatment_type, created_at')
        .eq('treatment_type', 'teeth')
        .gte('created_at', MIN_DATE)
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setConsultations(data || []);
    } catch (err) {
      console.error('Failed to fetch consultations:', err);
    } finally {
      setLoadingData(false);
    }
  }, [sortField, sortOrder]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (profile) {
      fetchConsultations();
    }
  }, [profile, fetchConsultations]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch {
      // Logout failed silently
    }
  };

  const handleSort = (field: 'created_at' | 'first_name' | 'email') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Helper function to check if data should be hidden (test data)
  const isTestData = (email?: string, firstName?: string, lastName?: string) => {
    if (!email && !firstName && !lastName) return false;
    
    const emailLower = email?.toLowerCase() || '';
    const fullName = `${firstName || ''} ${lastName || ''}`.toLowerCase();
    
    // Hide test data
    if (emailLower.includes('@natural.clinic')) return true;
    if (emailLower.includes('@naturalclinic.tr')) return true;
    if (emailLower === 'oguzhansivri53@gmail.com') return true;
    if (fullName.includes('oğuzhan sivri') || fullName.includes('oguzhan sivri')) return true;
    
    return false;
  };

  const filteredConsultations = consultations.filter(consultation => {
    // Hide test data
    if (isTestData(consultation.email, consultation.first_name, consultation.last_name)) return false;
    
    // Date filter
    const consultationDate = new Date(consultation.created_at);
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (consultationDate < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (consultationDate > toDate) return false;
    }
    
    // Search filter
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      consultation.first_name?.toLowerCase().includes(search) ||
      consultation.last_name?.toLowerCase().includes(search) ||
      consultation.email?.toLowerCase().includes(search) ||
      consultation.phone?.includes(search)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredConsultations.length / itemsPerPage);
  const paginatedData = filteredConsultations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Date'];
    const csvData = filteredConsultations.map(c => [
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      new Date(c.created_at).toLocaleString()
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `teeth_consultations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Admin' };
      case 'sales': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Sales' };
      case 'marketing': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Marketing' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', label: role };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#006069]" />
      </div>
    );
  }

  if (!profile) return null;

  const roleBadge = getRoleBadge(profile.role);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://natural.clinic/wp-content/uploads/2023/07/Natural_logo_green-01.png.webp"
              alt="Natural Clinic"
              width={150}
              height={50}
              priority
            />
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-gray-300">|</span>
              <span className="text-[#006069] font-semibold">Dashboard</span>
              <span className={`${roleBadge.bg} ${roleBadge.text} text-xs px-2 py-1 rounded-full font-medium`}>
                {roleBadge.label}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {profile.role === 'admin' && (
              <a
                href="/admin"
                className="text-sm text-gray-600 hover:text-[#006069] transition-colors"
              >
                Admin Panel →
              </a>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-5 h-5" />
              <span className="font-medium hidden sm:inline">{profile.first_name} {profile.last_name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#006069]/10 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[#006069]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{filteredConsultations.length}</p>
                <p className="text-sm text-gray-500">Total Teeth Consultations</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {filteredConsultations.filter(c => {
                    const date = new Date(c.created_at);
                    const today = new Date();
                    return date.toDateString() === today.toDateString();
                  }).length}
                </p>
                <p className="text-sm text-gray-500">Today's Leads</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">
                  {filteredConsultations.filter(c => {
                    const date = new Date(c.created_at);
                    const now = new Date();
                    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                    return diffHours <= 24;
                  }).length}
                </p>
                <p className="text-sm text-gray-500">Last 24 Hours</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Table Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Teeth Consultation Leads</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Data from December 20, 2025 onwards • {filteredConsultations.length} records
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] w-64"
                  />
                </div>

                {/* Date Filters */}
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                      dateFrom || dateTo 
                        ? 'bg-[#006069]/10 border-[#006069] text-[#006069]' 
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">{getActiveDateLabel()}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Date Picker Dropdown */}
                  {showDatePicker && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowDatePicker(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-20 w-80">
                        {/* Quick Presets */}
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Select</p>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => applyDatePreset('today')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
                            >
                              Today
                            </button>
                            <button
                              onClick={() => applyDatePreset('yesterday')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
                            >
                              Yesterday
                            </button>
                            <button
                              onClick={() => applyDatePreset('last7days')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
                            >
                              Last 7 Days
                            </button>
                            <button
                              onClick={() => applyDatePreset('last30days')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
                            >
                              Last 30 Days
                            </button>
                            <button
                              onClick={() => applyDatePreset('thisWeek')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
                            >
                              This Week
                            </button>
                            <button
                              onClick={() => applyDatePreset('thisMonth')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left"
                            >
                              This Month
                            </button>
                            <button
                              onClick={() => applyDatePreset('lastMonth')}
                              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-left col-span-2"
                            >
                              Last Month
                            </button>
                          </div>
                        </div>

                        {/* Custom Date Range */}
                        <div className="border-t border-gray-100 pt-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Custom Range</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">From</label>
                              <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                  setDateFrom(e.target.value);
                                  setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069]"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">To</label>
                              <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                  setDateTo(e.target.value);
                                  setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069]"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setDateFrom('');
                              setDateTo('');
                              setCurrentPage(1);
                              setShowDatePicker(false);
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => setShowDatePicker(false)}
                            className="px-4 py-2 bg-[#006069] hover:bg-[#004750] text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Export */}
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-[#006069] hover:bg-[#004750] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>

                {/* Refresh */}
                <button
                  onClick={fetchConsultations}
                  disabled={loadingData}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingData ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#006069]" />
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Users className="w-12 h-12 mb-4 text-gray-300" />
                <p>No consultations found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <button 
                        onClick={() => handleSort('first_name')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      >
                        Name
                        {sortField === 'first_name' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button 
                        onClick={() => handleSort('email')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      >
                        Email
                        {sortField === 'email' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left">
                      <button 
                        onClick={() => handleSort('created_at')}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                      >
                        Date
                        {sortField === 'created_at' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedData.map((consultation) => (
                    <tr key={consultation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#006069] to-[#004750] rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {consultation.first_name?.charAt(0) || '?'}{consultation.last_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {consultation.first_name} {consultation.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <a 
                            href={`mailto:${consultation.email}`}
                            className="text-sm text-gray-600 hover:text-[#006069] transition-colors"
                          >
                            {consultation.email || '-'}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <a 
                            href={`tel:${consultation.phone}`}
                            className="text-sm text-gray-600 hover:text-[#006069] transition-colors"
                          >
                            {consultation.phone || '-'}
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {new Date(consultation.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredConsultations.length)} of {filteredConsultations.length} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

