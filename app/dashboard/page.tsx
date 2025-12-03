'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, Loader2, Download, LogOut, User, RefreshCw, Shield, FileImage, Eye, Calendar, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, signOut, UserProfile, hasRole, isApproved } from '@/lib/auth';

interface TransformationResult {
  originalUrl: string;
  transformedUrl: string;
}

interface Consultation {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  treatment_type: string;
  original_image_url: string;
  transformed_image_url: string;
  created_at: string;
  created_by: string | null;
}

const TEETH_SHADES = [
  { value: '0M1', label: '0M1 – brightest bleach' },
  { value: '0M2', label: '0M2 – intense bleach' },
  { value: '0M3', label: '0M3 – natural bleach' },
  { value: 'A1', label: 'A1 – soft reddish brown' },
  { value: 'A2', label: 'A2 – warm natural' },
  { value: 'A3', label: 'A3 – balanced natural' },
  { value: 'A3.5', label: 'A3.5 – deeper natural' },
  { value: 'A4', label: 'A4 – rich brownish' },
  { value: 'B1', label: 'B1 – bright yellowish' },
  { value: 'B2', label: 'B2 – creamy yellowish' },
  { value: 'B3', label: 'B3 – honey yellowish' },
  { value: 'B4', label: 'B4 – golden yellowish' },
  { value: 'C1', label: 'C1 – soft grey' },
  { value: 'C2', label: 'C2 – medium grey' },
  { value: 'C3', label: 'C3 – deep grey' },
  { value: 'C4', label: 'C4 – charcoal grey' },
  { value: 'D2', label: 'D2 – cool reddish-grey' },
  { value: 'D3', label: 'D3 – medium reddish-grey' },
  { value: 'D4', label: 'D4 – deep reddish-grey' },
];

const TEETH_STYLES = [
  'AggressiveStyle',
  'DominantStyle',
  'EnhancedStyle',
  'FocusedStyle',
  'FunctionalStyle',
  'HollywoodStyle',
  'MatureStyle',
  'NaturalStyle',
  'OvalStyle',
  'SoftenedStyle',
  'VigorousStyle',
  'YouthfulStyle',
].map((value) => ({
  value,
  label: value.replace(/([A-Z])/g, ' $1').replace(/Style$/, ' Style').trim(),
}));

const LOGO_URL = '/assets/logo.png';

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [treatmentType, setTreatmentType] = useState<'teeth' | 'hair'>('teeth');
  const [teethShade, setTeethShade] = useState('');
  const [teethStyle, setTeethStyle] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  
  // Process state
  const [processing, setProcessing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TransformationResult[] | null>(null);

  // My consultations state
  const [activeTab, setActiveTab] = useState<'transform' | 'history'>('transform');
  const [myConsultations, setMyConsultations] = useState<Consultation[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchMyConsultations();
    }
  }, [profile]);

  const checkAuth = async () => {
    try {
      const userData = await getCurrentUser();
      
      if (!userData || !userData.profile) {
        setLoading(false);
        router.push('/login');
        return;
      }

      // Check if user has permission to access dashboard
      const allowedRoles = ['sales', 'doctor', 'admin'];
      if (!hasRole(userData.profile, allowedRoles)) {
        setAuthError('You do not have permission to access the dashboard.');
        setLoading(false);
        return;
      }

      // Check if user is approved (for sales)
      if (userData.profile.role === 'sales' && !isApproved(userData.profile)) {
        setAuthError('Your account is pending approval. Please wait for admin approval.');
        setLoading(false);
        return;
      }

      setProfile(userData.profile);
      setLoading(false);
    } catch {
      setLoading(false);
      router.push('/login');
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

  const fetchMyConsultations = async () => {
    setLoadingConsultations(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyConsultations(data || []);
    } catch {
      // Failed to fetch consultations
    } finally {
      setLoadingConsultations(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length > 0) {
      setImages(validFiles);
      
      const previewPromises = validFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      });

      Promise.all(previewPromises).then(setPreviews);
      setError(null);
    }
  };

  const handleTransform = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter patient name');
      return;
    }

    if (images.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    if (treatmentType === 'teeth' && (!teethShade || !teethStyle)) {
      setError('Please select teeth shade and style');
      return;
    }

    setProcessing(true);
    setError(null);
    setResults(null);

    try {
      const transformResults: TransformationResult[] = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const fileExt = image.name.split('.').pop();
        const fileName = `${Date.now()}-${i}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `dashboard/${fileName}`;

        // Upload to Supabase
        const { error: uploadError } = await supabase.storage
          .from('consultation-images')
          .upload(filePath, image);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('consultation-images')
          .getPublicUrl(filePath);

        // Transform with Gemini
        const transformResponse = await fetch('/api/transform-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: publicUrl,
            treatmentType,
            teethShade: treatmentType === 'teeth' ? teethShade : undefined,
            teethStyle: treatmentType === 'teeth' ? teethStyle : undefined,
          }),
        });

        const transformData = await transformResponse.json();

        if (!transformResponse.ok || !transformData.transformedUrl) {
          throw new Error(transformData.error || 'Transform failed');
        }

        transformResults.push({
          originalUrl: publicUrl,
          transformedUrl: transformData.transformedUrl,
        });

        // Save to consultations with created_by
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('consultations').insert({
            first_name: firstName,
            last_name: lastName,
            treatment_type: treatmentType,
            original_image_url: publicUrl,
            transformed_image_url: transformData.transformedUrl,
            created_by: user.id,
          });
        }
      }

      setResults(transformResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!results || results.length === 0) return;

    setDownloading(true);

    try {
      const contactName = `${firstName} ${lastName}`.trim();
      const pdfBlob = await generatePdf(results[0], contactName, treatmentType);
      
      // Sanitize filename
      const sanitizedName = contactName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
        .replace(/ü/g, 'u').replace(/Ü/g, 'U')
        .replace(/ş/g, 's').replace(/Ş/g, 'S')
        .replace(/ı/g, 'i').replace(/İ/g, 'I')
        .replace(/ö/g, 'o').replace(/Ö/g, 'O')
        .replace(/ç/g, 'c').replace(/Ç/g, 'C')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `natural-clinic-${sanitizedName || 'patient'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setFirstName('');
    setLastName('');
    setTeethShade('');
    setTeethStyle('');
    setImages([]);
    setPreviews([]);
    setResults(null);
    setError(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#006069]" />
      </div>
    );
  }

  // Auth error state
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Access Restricted</h1>
          <p className="text-gray-600">{authError}</p>
          <button
            onClick={handleLogout}
            className="w-full py-3 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700';
      case 'doctor': return 'bg-blue-100 text-blue-700';
      case 'sales': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
            <span className="bg-[#006069] text-white text-xs px-2 py-1 rounded-full ml-2">
              Dashboard
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {profile.role === 'admin' && (
              <a
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors text-sm font-medium"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </a>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-5 h-5" />
              <span className="font-medium">{profile.first_name} {profile.last_name}</span>
              <span className={`text-xs px-2 py-1 rounded-full capitalize ${getRoleBadgeColor(profile.role)}`}>
                {profile.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('transform')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'transform'
                ? 'bg-[#006069] text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              New Transformation
            </div>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-[#006069] text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileImage className="w-5 h-5" />
              My Consultations
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === 'history' ? 'bg-white/20' : 'bg-gray-200 text-gray-600'
              }`}>
                {myConsultations.length}
              </span>
            </div>
          </button>
        </div>

        {activeTab === 'transform' && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Patient Transformation</h1>

          {!results ? (
            <div className="space-y-6">
              {/* Patient Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              {/* Treatment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treatment Type
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setTreatmentType('teeth')}
                    className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                      treatmentType === 'teeth'
                        ? 'bg-[#006069] text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Teeth
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreatmentType('hair')}
                    className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                      treatmentType === 'hair'
                        ? 'bg-[#006069] text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Hair
                  </button>
                </div>
              </div>

              {/* Teeth Options */}
              {treatmentType === 'teeth' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teeth Shade
                    </label>
                    <select
                      value={teethShade}
                      onChange={(e) => setTeethShade(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                    >
                      <option value="">Select shade</option>
                      {TEETH_SHADES.map((shade) => (
                        <option key={shade.value} value={shade.value}>
                          {shade.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Smile Style
                    </label>
                    <select
                      value={teethStyle}
                      onChange={(e) => setTeethStyle(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006069] focus:border-[#006069] transition-all"
                    >
                      <option value="">Select style</option>
                      {TEETH_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Photo
                </label>
                <div className="relative">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="image"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all"
                  >
                    {previews.length > 0 ? (
                      <div className="flex gap-4 p-4">
                        {previews.map((preview, index) => (
                          <img
                            key={index}
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-32 w-auto object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-10 h-10 text-[#006069] mb-3" />
                        <p className="text-sm text-gray-600">Click to upload patient photo</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG (MAX. 5MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Transform Button */}
              <button
                onClick={handleTransform}
                disabled={processing}
                className="w-full py-4 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing Transformation...
                  </>
                ) : (
                  'Transform Image'
                )}
              </button>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Transformation Complete for {firstName} {lastName}
                </h2>
              </div>

              {/* Before/After */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">Before</h3>
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={results[0].originalUrl}
                      alt="Before"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 text-center">After</h3>
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={results[0].transformedUrl}
                      alt="After"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="flex-1 py-4 px-6 bg-[#006069] hover:bg-[#004750] text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download PDF
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-4 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <RefreshCw className="w-5 h-5" />
                  New Patient
                </button>
              </div>
            </div>
          )}
        </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">My Consultations</h2>
              <button
                onClick={fetchMyConsultations}
                disabled={loadingConsultations}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingConsultations ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Consultations List */}
            <div className="overflow-x-auto">
              {loadingConsultations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#006069]" />
                </div>
              ) : myConsultations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FileImage className="w-12 h-12 mb-4 text-gray-300" />
                  <p>No consultations yet</p>
                  <p className="text-sm text-gray-400 mt-1">Your transformation history will appear here</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Patient
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Treatment
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myConsultations.map((consultation) => (
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
                              <p className="text-sm text-gray-500">{consultation.email || 'No email'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            consultation.treatment_type === 'teeth' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {consultation.treatment_type === 'teeth' ? '🦷 Teeth' : '💇 Hair'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            {new Date(consultation.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedConsultation(consultation)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#006069]/10 hover:bg-[#006069]/20 text-[#006069] text-sm font-medium rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Consultation Detail Modal */}
        {selectedConsultation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Consultation Details
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedConsultation.first_name} {selectedConsultation.last_name} • {selectedConsultation.treatment_type === 'teeth' ? '🦷 Teeth' : '💇 Hair'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedConsultation(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Patient Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Patient Name</p>
                    <p className="font-medium text-gray-900">{selectedConsultation.first_name} {selectedConsultation.last_name}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Email</p>
                    <p className="font-medium text-gray-900">{selectedConsultation.email || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                    <p className="font-medium text-gray-900">{selectedConsultation.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Treatment Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedConsultation.treatment_type}</p>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Transformation Results</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-2 text-center">Before</p>
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                        {selectedConsultation.original_image_url ? (
                          <img
                            src={selectedConsultation.original_image_url}
                            alt="Before"
                            className="w-full h-auto"
                          />
                        ) : (
                          <div className="h-48 flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2 text-center">After</p>
                      <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                        {selectedConsultation.transformed_image_url ? (
                          <img
                            src={selectedConsultation.transformed_image_url}
                            alt="After"
                            className="w-full h-auto"
                          />
                        ) : (
                          <div className="h-48 flex items-center justify-center text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="text-center text-sm text-gray-500">
                  Created on {new Date(selectedConsultation.created_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// PDF Generation Functions
const imageDataCache = new Map<string, string>();

async function generatePdf(result: TransformationResult, contactName: string, treatmentType: 'teeth' | 'hair') {
  const canvas = await renderResultCanvas(result, contactName, treatmentType);
  return createPdfFromCanvas(canvas);
}

async function renderResultCanvas(result: TransformationResult, contactName: string, treatmentType: 'teeth' | 'hair') {
  const canvas = document.createElement('canvas');
  const width = 1120;
  const height = 1654;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Unable to render PDF');

  const backgroundColor = '#006069';
  const frameColor = '#0b5b64';
  const textColor = '#ffffff';

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  await renderHeader(ctx, width);

  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.font = '32px "Helvetica Neue", Arial, sans-serif';
  const greeting = contactName?.trim() ? `Dear ${contactName},` : 'Dear Guest,';
  ctx.fillText(greeting, 80, 280);

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  const previewText =
    treatmentType === 'hair'
      ? 'Here is your personalized hair transformation preview'
      : 'Here is your personalized smile design preview';
  ctx.fillText(previewText, 80, 320);

  ctx.fillStyle = textColor;
  const margin = 80;
  const gap = 60;
  const panelWidth = (width - margin * 2 - gap) / 2;
  const panelHeight = 900;
  const panelY = 420;
  const beforeX = margin;
  const afterX = margin + panelWidth + gap;

  ctx.font = '24px "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = textColor;
  ctx.fillText('Before', beforeX, panelY - 20);
  ctx.textAlign = 'right';
  ctx.fillText('After', afterX + panelWidth, panelY - 20);

  await Promise.all([
    drawImagePanel(ctx, result.originalUrl, beforeX, panelY, panelWidth, panelHeight, frameColor),
    drawImagePanel(ctx, result.transformedUrl, afterX, panelY, panelWidth, panelHeight, frameColor),
  ]);

  ctx.textAlign = 'center';
  ctx.font = '28px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = textColor;
  ctx.fillText('www.natural.clinic', width / 2, height - 40);

  return canvas;
}

async function renderHeader(ctx: CanvasRenderingContext2D, width: number) {
  try {
    const logo = await loadImageElement(LOGO_URL);
    const maxLogoWidth = 380;
    const maxLogoHeight = 160;
    const scale = Math.min(maxLogoWidth / logo.width, maxLogoHeight / logo.height);
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    
    const totalWidth = logoWidth + 20 + 150;
    const startX = (width - totalWidth) / 2;
    const topMargin = 80;

    ctx.drawImage(logo, startX, topMargin, logoWidth, logoHeight);
    
    ctx.textAlign = 'left';
    ctx.font = 'bold 24px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Design Studio', startX + logoWidth + 15, topMargin + 40);
  } catch {
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Natural Clinic', width / 2, 140);
  }
}

async function drawImagePanel(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, width: number, height: number, frameColor: string) {
  drawRoundedRect(ctx, x, y, width, height, 24, frameColor);

  const innerX = x + 16;
  const innerY = y + 16;
  const innerWidth = width - 32;
  const innerHeight = height - 32;

  if (!src) {
    ctx.fillStyle = '#0d4a51';
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.fill();
    return;
  }

  try {
    const image = await loadImageElement(src);
    ctx.fillStyle = '#ffffff';
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.fill();
    ctx.save();
    roundedRectPath(ctx, innerX, innerY, innerWidth, innerHeight, 16);
    ctx.clip();
    
    const scale = Math.min(innerWidth / image.width, innerHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    const offsetX = innerX + (innerWidth - drawWidth) / 2;
    const offsetY = innerY + (innerHeight - drawHeight) / 2;
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
  } catch {
    // Failed to draw image
  }
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string) {
  ctx.fillStyle = color;
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function createPdfFromCanvas(canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  const binary = atob(base64);
  const imgBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    imgBytes[i] = binary.charCodeAt(i);
  }
  
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  const push = (data: Uint8Array) => { chunks.push(data); currentOffset += data.length; };
  const pushString = (value: string) => push(encoder.encode(value));
  const startObject = () => offsets.push(currentOffset);

  const width = canvas.width;
  const height = canvas.height;

  pushString('%PDF-1.3\n');
  startObject();
  pushString('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObject();
  pushString('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  startObject();
  pushString(`3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${width} ${height}] /Contents 5 0 R >>\nendobj\n`);
  startObject();
  pushString(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
  push(imgBytes);
  pushString('\nendstream\nendobj\n');

  const contentStream = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  startObject();
  pushString(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  push(contentBytes);
  pushString('endstream\nendobj\n');

  const xrefOffset = currentOffset;
  pushString('xref\n0 6\n0000000000 65535 f \n');
  offsets.forEach((offset) => pushString(`${offset.toString().padStart(10, '0')} 00000 n \n`));
  pushString('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n');
  pushString(`${xrefOffset}\n%%EOF`);

  const totalLength = chunks.reduce((acc, arr) => acc + arr.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((arr) => { merged.set(arr, offset); offset += arr.length; });

  return new Blob([merged], { type: 'application/pdf' });
}

async function loadImageElement(src: string) {
  const resolvedSrc = await getImageDataUrl(src);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.crossOrigin = 'anonymous';
    image.src = resolvedSrc;
  });
}

async function getImageDataUrl(src: string) {
  if (!src) throw new Error('Missing image source');
  if (src.startsWith('data:')) return src;

  const cached = imageDataCache.get(src);
  if (cached) return cached;

  try {
    const response = await fetch('/api/image-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: src }),
    });

    if (!response.ok) throw new Error('Failed to proxy image');

    const data = await response.json();
    if (!data.dataUrl) throw new Error('Proxy did not return data URL');

    imageDataCache.set(src, data.dataUrl);
    return data.dataUrl;
  } catch {
    return src;
  }
}
