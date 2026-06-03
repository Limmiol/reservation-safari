import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Save, Mail, Shield } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { translate } from '@/lib/translations';

export default function Profile() {
  const { language } = useLanguage();
  const t = (key) => translate(key, language);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFormData({
          full_name: currentUser.full_name || '',
          email: currentUser.email || '',
        });
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.auth.updateMe(formData);
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Unable to load profile</p>
        </Card>
      </div>
    );
  }

  const initials = user.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">{t('my_profile')}</h1>

        {/* Profile Picture */}
        <Card className="mb-6">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">{t('profile_picture')}</h2>
          </div>
          <div className="p-6 flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Upload a profile picture to personalize your account
              </p>
              <Button variant="outline" size="sm">
                {t('choose_photo')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Basic Information */}
        <Card className="mb-6">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">{t('basic_information')}</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('full_name')}</label>
              <Input
                name="full_name"
                value={formData.full_name || ''}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" /> {t('email_address')}
              </label>
              <Input
                name="email"
                type="email"
                value={formData.email || ''}
                disabled
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('email_cannot_change')}</p>
            </div>
          </div>
        </Card>

        {/* Account Role */}
        <Card className="mb-6">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5" /> {t('account_role_label')}
            </h2>
          </div>
          <div className="p-6">
            <div className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium capitalize">
              {user.role || 'User'}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {user.role === 'admin' ? t('admin_access_msg') : t('standard_access_msg')}
            </p>
          </div>
        </Card>

        {/* Security */}
        <Card className="mb-6">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold">{t('security')}</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">{t('sessions')}</p>
              <p className="text-xs text-muted-foreground mb-3">You are currently logged in</p>
              <Button variant="outline" size="sm" onClick={() => base44.auth.logout()}>
                {t('logout')}
              </Button>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            <Save className="w-4 h-4" /> {t('save_changes')}
          </Button>
        </div>
      </div>
    </div>
  );
}