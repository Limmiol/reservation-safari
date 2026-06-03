const TOKEN_KEY = 'rs_auth_token';
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

const buildApiUrl = (path) => API_BASE_URL ? `${API_BASE_URL}${path}` : path;

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

async function apiFetch(path, options = {}) {
  const token = getToken();
  const url = buildApiUrl(`/api${path}`);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Generic entity handler — mirrors Base44 SDK interface
const entityHandler = (name) => ({
  list: (sort = '-created_date', limit = 500) =>
    apiFetch(`/entities/${name}?sort=${encodeURIComponent(sort)}&limit=${limit}`),

  filter: (criteria = {}, sort = '-created_date', limit = 500) =>
    apiFetch(`/entities/${name}/filter`, {
      method: 'POST',
      body: { criteria, sort, limit },
    }),

  create: (data) =>
    apiFetch(`/entities/${name}`, { method: 'POST', body: data }),

  update: (id, data) =>
    apiFetch(`/entities/${name}/${id}`, { method: 'PUT', body: data }),

  delete: (id) =>
    apiFetch(`/entities/${name}/${id}`, { method: 'DELETE' }),

  read: (id) =>
    apiFetch(`/entities/${name}/${id}`),
});

const entityProxy = new Proxy({}, {
  get: (_, name) => entityHandler(name),
});

export const localClient = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    login: async (email, password) => {
      const res = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
      setToken(res.token);
      return res.user;
    },

    register: async (email, password, full_name = '', role = 'admin') => {
      const res = await apiFetch('/auth/register', { method: 'POST', body: { email, password, full_name, role } });
      setToken(res.token);
      return res.user;
    },

    me: () => apiFetch('/auth/me'),

    logout: (redirectUrl) => {
      removeToken();
      window.location.href = '/login';
    },

    redirectToLogin: () => {
      removeToken();
      window.location.href = '/login';
    },

    updateMe: (data) => apiFetch('/auth/me', { method: 'PUT', body: data }),
  },

  // ── Entities ──────────────────────────────────────────────────────────────
  entities: entityProxy,

  // ── Users ─────────────────────────────────────────────────────────────────
  users: {
    list: () => apiFetch('/users'),
    create: (data) => apiFetch('/users', { method: 'POST', body: data }),
    inviteUser: (data) => apiFetch('/users/invite', { method: 'POST', body: data }),
    update: (id, data) => apiFetch(`/users/${id}`, { method: 'PUT', body: data }),
    delete: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  },

  // ── Agents ───────────────────────────────────────────────────────────────────
  agents: {
    createConversation: async (data) =>
      apiFetch(`/agents/conversations`, { method: 'POST', body: data }),
    
    addMessage: async (conversationId, message) =>
      apiFetch(`/agents/conversations/${conversationId}/messages`, { method: 'POST', body: message }),
    
    getConversation: async (conversationId) =>
      apiFetch(`/agents/conversations/${conversationId}`),
    
    listConversations: async (data = {}) => {
      const query = new URLSearchParams();
      if (data.agent_name) query.append('agent_name', data.agent_name);
      const queryStr = query.toString() ? `?${query.toString()}` : '';
      return apiFetch(`/agents/conversations${queryStr}`);
    },
    
    getWhatsAppConnectURL: async (agentName) =>
      apiFetch(`/agents/whatsapp/connect/${agentName}`),
  },

  // ── Functions (stub) ──────────────────────────────────────────────────────
  functions: {
    invoke: async () => ({ success: true }),
  },

  // ── Integrations ─────────────────────────────────────────────────────────
  integrations: {
    Core: {
      SendEmail: async (opts) => {
        console.log('[LocalMode] Email would be sent:', opts);
        return { success: true };
      },
      UploadFile: async ({ file }) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(buildApiUrl('/api/upload'), {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Upload failed');
        }
        return res.json();
      },
    },
  },

  // ── asServiceRole — same as regular for local use ─────────────────────────
  asServiceRole: {
    entities: entityProxy,
    integrations: {
      Core: {
        SendEmail: async (opts) => {
          console.log('[LocalMode] Email would be sent:', opts);
          return { success: true };
        },
        UploadFile: async ({ file }) => localClient.integrations.Core.UploadFile({ file }),
      },
    },
  },
};
