import { useAuth } from './AuthContext';

/**
 * Returns the current user's role and helper booleans.
 */
export function useRole() {
  const { user } = useAuth();
  const role = user?.role || 'other';
  return {
    role,
    isAdmin:  role === 'admin',
    isAgent:  role === 'agent',
    isGuide:  role === 'guide',
    isDriver: role === 'driver',
    isClient: role === 'client',
    isUser:   role === 'user',
    // Can the user edit/create/delete records?
    canEdit: role === 'admin' || role === 'user',
    // Can the user edit their own profile only?
    canEditOwn: role === 'driver' || role === 'guide' || role === 'agent',
    // Can the user delete records?
    canDelete: role === 'admin' || role === 'user',
  };
}
