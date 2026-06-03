import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { useRole } from '@/lib/useRole';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DriverScheduler from '@/components/driver/DriverScheduler';
import DriverDocuments from '@/components/driver/DriverDocuments';
import DriverPerformanceCard from '@/components/driver/DriverPerformanceCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Plus, Trash2, Pencil, Search, Filter, Phone, Mail, Calendar, Award, Languages, Car, Star, TrendingUp, AlertTriangle, CheckCircle, Clock, MapPin, FileText, Camera } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

export default function DriversDashboard() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { user } = useAuth();
  const { isDriver, canEdit, canDelete } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('grid');
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    license_number: '',
    license_expiry: '',
    employment_status: 'active',
    availability_status: 'available',
    date_of_hire: '',
    experience_years: '',
    languages_spoken: '',
    is_guide: false,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    certifications: '',
    medical_info: '',
    address: '',
    date_of_birth: '',
    nationality: '',
    profile_image: '',
  });

  const queryClient = useQueryClient();
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => base44.entities.Driver.list('-updated_date'),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['driver-assignments'],
    queryFn: () => base44.entities.ResourceAssignment.list('-updated_date'),
  });

  const { data: feedback = [] } = useQuery({
    queryKey: ['driver-feedback'],
    queryFn: () => base44.entities.Feedback.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Driver.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Driver.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      resetForm();
      setIsOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Driver.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drivers'] }),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
    };
    
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      license_number: '',
      license_expiry: '',
      employment_status: 'active',
      availability_status: 'available',
      date_of_hire: '',
      experience_years: '',
      languages_spoken: '',
      is_guide: false,
      emergency_contact_name: '',
      emergency_contact_phone: '',
      certifications: '',
      medical_info: '',
      address: '',
      date_of_birth: '',
      nationality: '',
      profile_image: '',
    });
    setEditingId(null);
  };

  const handleEdit = (driver) => {
    // Check permission: Only admin/manager or the driver themselves can edit
    if (isDriver && user?.email !== driver.email) {
      alert('You can only edit your own profile');
      return;
    }

    setFormData({
      full_name: driver.full_name,
      phone: driver.phone,
      email: driver.email || '',
      license_number: driver.license_number,
      license_expiry: driver.license_expiry,
      employment_status: driver.employment_status,
      availability_status: driver.availability_status,
      date_of_hire: driver.date_of_hire || '',
      experience_years: driver.experience_years?.toString() || '',
      languages_spoken: driver.languages_spoken || '',
      is_guide: driver.is_guide || false,
      emergency_contact_name: driver.emergency_contact_name || '',
      emergency_contact_phone: driver.emergency_contact_phone || '',
      certifications: driver.certifications || '',
      medical_info: driver.medical_info || '',
      address: driver.address || '',
      date_of_birth: driver.date_of_birth || '',
      nationality: driver.nationality || '',
      profile_image: driver.profile_image || '',
    });
    setEditingId(driver.id);
    setIsOpen(true);
  };

  const getDriverStats = (driverId) => {
    const driverAssignments = assignments.filter((a) => a.driver_id === driverId);
    const driverFeedback = feedback.filter((f) =>
      driverAssignments.some((a) => a.booking_id === f.booking_id)
    );

    const completedTrips = driverAssignments.filter((a) => a.status === 'completed').length;
    const totalTrips = driverAssignments.length;
    const completionRate = totalTrips > 0 ? ((completedTrips / totalTrips) * 100).toFixed(0) : 0;

    const avgRating = driverFeedback.length > 0
      ? (driverFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / driverFeedback.length).toFixed(1)
      : null;

    return {
      totalTrips,
      completedTrips,
      completionRate,
      avgRating,
      feedbackCount: driverFeedback.length,
    };
  };

  // Filter drivers based on role
  const filtered = drivers.filter((d) => {
    // If driver is viewing, only show their own profile
    if (isDriver && user?.email && d.email !== user.email) {
      return false;
    }

    const matchesSearch = d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.phone?.includes(searchTerm) ||
                         d.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.employment_status === statusFilter;
    const matchesAvailability = availabilityFilter === 'all' || d.availability_status === availabilityFilter;

    return matchesSearch && matchesStatus && matchesAvailability;
  });

  // Check if user can perform actions
  const canEditDriver = (driver) => {
    if (canEdit) return true; // Admin/manager
    if (isDriver && user?.email === driver.email) return true; // Driver editing themselves
    return false;
  };

  const canDeleteDriver = () => {
    return canDelete; // Only admin can delete
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {isDriver ? 'My Profile' : 'Driver Management'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isDriver 
              ? 'Update and manage your driver profile information'
              : 'Manage your professional driver team with advanced analytics and performance tracking'
            }
          </p>
        </div>

        {/* Add Driver Button - Only for non-drivers */}
        {!isDriver && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="shadow-lg hover:shadow-xl transition-shadow">
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {editingId ? 'Edit Driver Profile' : 'Add New Driver'}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="professional">Professional</TabsTrigger>
                  <TabsTrigger value="emergency">Emergency</TabsTrigger>
                </TabsList>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="text-sm font-medium mb-2 block">Full Name *</label>
                        <Input
                          placeholder="Enter full name"
                          value={formData.full_name}
                          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Phone *</label>
                        <Input
                          placeholder="+255 XXX XXX XXX"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email</label>
                        <Input
                          type="email"
                          placeholder="driver@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Date of Birth</label>
                        <Input
                          type="date"
                          value={formData.date_of_birth}
                          onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nationality</label>
                        <Input
                          placeholder="Tanzanian"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium mb-2 block">Address</label>
                        <Input
                          placeholder="Full address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="professional" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">License Number *</label>
                        <Input
                          placeholder="TZ XXX XXX XXX"
                          value={formData.license_number}
                          onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">License Expiry *</label>
                        <Input
                          type="date"
                          value={formData.license_expiry}
                          onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Date of Hire</label>
                        <Input
                          type="date"
                          value={formData.date_of_hire}
                          onChange={(e) => setFormData({ ...formData, date_of_hire: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Years of Experience</label>
                        <Input
                          type="number"
                          placeholder="5"
                          value={formData.experience_years}
                          onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Languages Spoken</label>
                        <Input
                          placeholder="Swahili, English"
                          value={formData.languages_spoken}
                          onChange={(e) => setFormData({ ...formData, languages_spoken: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Certifications</label>
                        <Input
                          placeholder="Tour Guide, First Aid"
                          value={formData.certifications}
                          onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Employment Status</label>
                        <Select value={formData.employment_status} onValueChange={(val) => setFormData({ ...formData, employment_status: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Availability Status</label>
                        <Select value={formData.availability_status} onValueChange={(val) => setFormData({ ...formData, availability_status: val })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                            <SelectItem value="sick">Sick</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="emergency" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Emergency Contact Name</label>
                        <Input
                          placeholder="Next of kin name"
                          value={formData.emergency_contact_name}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Emergency Contact Phone</label>
                        <Input
                          placeholder="+255 XXX XXX XXX"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium mb-2 block">Medical Information</label>
                        <Input
                          placeholder="Allergies, medical conditions, blood type"
                          value={formData.medical_info}
                          onChange={(e) => setFormData({ ...formData, medical_info: e.target.value })}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingId ? 'Update Driver' : 'Add Driver'}
                    </Button>
                  </div>
                </form>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Statistics Cards - Only show for admins */}
      {!isDriver && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Drivers</p>
                  <p className="text-3xl font-bold text-blue-900">{drivers.length}</p>
                </div>
                <Car className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Active Drivers</p>
                  <p className="text-3xl font-bold text-green-900">
                    {drivers.filter(d => d.employment_status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700">Available Now</p>
                  <p className="text-3xl font-bold text-orange-900">
                    {drivers.filter(d => d.availability_status === 'available').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Avg Rating</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {drivers.length > 0 ?
                      (drivers.reduce((sum, d) => {
                        const stats = getDriverStats(d.id);
                        return sum + (parseFloat(stats.avgRating) || 0);
                      }, 0) / drivers.length).toFixed(1) : '0'}/5
                  </p>
                </div>
                <Star className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters - Only show for admins */}
      {!isDriver && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search drivers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Employment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Availability</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="on_leave">On Leave</SelectItem>
              <SelectItem value="sick">Sick</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* View Toggle - Grid/List only for admins */}
      {!isDriver ? (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-md ${activeTab === 'grid' ? 'bg-primary text-white' : 'bg-muted'}`}
          >
            Grid View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-md ${activeTab === 'list' ? 'bg-primary text-white' : 'bg-muted'}`}
          >
            List View
          </button>
        </div>
      ) : null}

      {/* Grid/List Display */}
      {activeTab === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((driver) => {
            const stats = getDriverStats(driver.id);
            const isLicenseExpiring = driver.license_expiry && new Date(driver.license_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            return (
              <Card key={driver.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={driver.profile_image} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {driver.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{driver.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{driver.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {canEditDriver(driver) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(driver)}
                          className="h-8 w-8 p-0"
                          title="Edit profile"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeleteDriver() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(driver.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Delete driver"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={driver.employment_status} />
                    <StatusBadge status={driver.availability_status} />
                  </div>

                  {isLicenseExpiring && (
                    <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md text-orange-700 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      License expires {formatDate(driver.license_expiry)}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span>{stats.totalTrips} trips</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span>{stats.completionRate}% rate</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <span>{stats.avgRating || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <span>{driver.experience_years || 0} yrs</span>
                    </div>
                  </div>

                  {driver.languages_spoken && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Languages className="w-4 h-4" />
                      <span>{driver.languages_spoken}</span>
                    </div>
                  )}

                  {driver.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{driver.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && !isDriver && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Driver</th>
                    <th className="text-left p-4 font-medium">Contact</th>
                    <th className="text-left p-4 font-medium">License</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Performance</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((driver) => {
                    const stats = getDriverStats(driver.id);

                    return (
                      <tr key={driver.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={driver.profile_image} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {driver.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{driver.full_name}</p>
                              <p className="text-sm text-muted-foreground">{driver.experience_years} years exp.</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              {driver.phone}
                            </div>
                            {driver.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="w-3.5 h-3.5" />
                                {driver.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{driver.license_number}</p>
                            <p className={`text-xs ${new Date(driver.license_expiry) < new Date() ? 'text-red-500' : 'text-muted-foreground'}`}>
                              Expires {formatDate(driver.license_expiry)}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <StatusBadge status={driver.employment_status} />
                            <StatusBadge status={driver.availability_status} />
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Car className="w-3.5 h-3.5 text-muted-foreground" />
                              {stats.totalTrips} trips
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Star className="w-3.5 h-3.5 text-muted-foreground" />
                              {stats.avgRating || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canEditDriver(driver) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(driver)}
                                className="h-8 w-8 p-0"
                                title="Edit profile"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            {canDeleteDriver() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(driver.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                title="Delete driver"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Car className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No drivers found</h3>
          <p className="text-muted-foreground">
            {isDriver
              ? 'Your profile will appear here'
              : 'Get started by adding your first driver'
            }
          </p>
        </div>
      )}
    </div>
  );
}
