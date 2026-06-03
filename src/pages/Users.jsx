import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { celebrate } from '@/lib/confetti';
import { Plus, Mail, Shield, Trash2, Edit2, Users as UsersIcon, Bot, User, Compass, Truck } from 'lucide-react';

const ROLES = ['admin', 'agent', 'guide', 'driver', 'user', 'client'];

const ROLE_META = {
  admin:  { color: 'bg-red-50 text-red-700 border-red-200',     icon: Shield,  label: 'Admin' },
  agent:  { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Bot, label: 'Agent' },
  guide:  { color: 'bg-teal-50 text-teal-700 border-teal-200',  icon: Compass, label: 'Guide' },
  driver: { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Truck, label: 'Driver' },
  user:   { color: 'bg-blue-50 text-blue-700 border-blue-200',  icon: User,   label: 'User' },
  client: { color: 'bg-green-50 text-green-700 border-green-200', icon: User, label: 'Client' },
};

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.user;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.color}`}>
      <Icon className="w-3 h-3" />{m.label}
    </span>
  );
}

export default function Users() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'agent', full_name: '' });
  const [createForm, setCreateForm] = useState({ email: '', password: '', role: 'user', full_name: '' });
  const [editRole, setEditRole] = useState('');
  const [search, setSearch] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  // Role stats
  const roleCounts = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {});

  // Filtered list
  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteForm.email) throw new Error('Email is required');
      await base44.users.inviteUser({ email: inviteForm.email, role: inviteForm.role, full_name: inviteForm.full_name });
    },
    onSuccess: () => {
      celebrate('side');
      toast({ title: 'Invitation sent!', description: `${inviteForm.email} has been invited as ${inviteForm.role}.` });
      setInviteForm({ email: '', role: 'agent', full_name: '' });
      setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast({ title: 'Invite failed', description: err.message, variant: 'destructive' }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createForm.email || !createForm.password) throw new Error('Email and password are required');
      await base44.entities.User.create(createForm);
    },
    onSuccess: () => {
      celebrate('side');
      toast({ title: 'User created!', description: `${createForm.email} has been created as ${createForm.role}.` });
      setCreateForm({ email: '', password: '', role: 'user', full_name: '' });
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast({ title: 'Create failed', description: err.message, variant: 'destructive' }),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.User.update(id, { role }),
    onSuccess: () => {
      toast({ title: 'Role updated' });
      setEditOpen(false);
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      toast({ title: 'User removed' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => toast({ title: 'Delete failed', description: err.message, variant: 'destructive' }),
  });

  const openEdit = (user) => {
    setEditingUser(user);
    setEditRole(user.role || 'user');
    setEditOpen(true);
  };

  const confirmDelete = (user) => {
    if (confirm(`Remove ${user.full_name || user.email} from the system?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const initials = (u) =>
    (u.full_name || u.email || 'U')
      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('users')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('manage_team')} · {users.length} total</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setInviteOpen(true)} variant="outline" className="gap-2">
            <Mail className="w-4 h-4" /> {t('invite_user')}
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> {t('create_user')}
          </Button>
        </div>
      </div>

      {/* Role stats */}
      {users.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {ROLES.filter(r => roleCounts[r] > 0).map(r => {
            const m = ROLE_META[r];
            const Icon = m.icon;
            return (
              <div key={r} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${m.color}`}>
                <Icon className="w-3 h-3" />
                <span>{m.label}</span>
                <span className="font-bold ml-0.5">{roleCounts[r]}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Search */}
      {users.length > 3 && (
        <div className="mb-4 max-w-sm">
          <Input
            placeholder="Search by name, email or role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
      )}

      {/* User list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <UsersIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold mb-1">{search ? 'No users match your search' : t('no_users_yet')}</p>
          {!search && (
            <Button onClick={() => setInviteOpen(true)} className="mt-4 gap-2" variant="outline">
              <Plus className="w-4 h-4" /> {t('invite_user')}
            </Button>
          )}
        </Card>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">User</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-secondary/20 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {user.profile_picture && (
                          <img src={user.profile_picture} alt="" className="h-full w-full object-cover rounded-full" />
                        )}
                        <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{user.full_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.is_active !== false ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {user.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(user)}
                        title="Edit role"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => confirmDelete(user)}
                        disabled={deleteMutation.isPending}
                        title="Remove user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invite_user')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('email_address')} *</label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('role')}</label>
              <select
                value={inviteForm.role}
                onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {inviteForm.role === 'admin' && 'Full access to all features and settings.'}
                {inviteForm.role === 'agent' && 'Can manage bookings, clients, quotes and packages.'}
                {inviteForm.role === 'guide' && 'Can view assigned bookings and vehicles.'}
                {inviteForm.role === 'driver' && 'Access to driver portal and manifests.'}
                {inviteForm.role === 'user' && 'Standard access to bookings and calendar.'}
                {inviteForm.role === 'client' && 'Client portal access only.'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !inviteForm.email}>
              {inviteMutation.isPending ? 'Sending…' : t('send_invite')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">{initials(editingUser)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{editingUser.full_name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{editingUser.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">New Role</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateRoleMutation.mutate({ id: editingUser.id, role: editRole })}
              disabled={updateRoleMutation.isPending || editRole === editingUser?.role}
            >
              {updateRoleMutation.isPending ? 'Saving…' : 'Save Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <Input
                value={createForm.full_name}
                onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <Input
                type="email"
                value={createForm.email}
                onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <Input
                type="password"
                value={createForm.password}
                onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <select
                value={createForm.role}
                onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !createForm.email || !createForm.password}>
              {createMutation.isPending ? 'Creating…' : 'Create User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
