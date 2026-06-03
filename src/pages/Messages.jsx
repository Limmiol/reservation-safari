import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Plus, Search, Mail, Reply, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const API = '';

function getToken() {
  return localStorage.getItem('rs_auth_token') || sessionStorage.getItem('rs_auth_token') || '';
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 3600000;
  if (diffH < 1) return `${Math.max(1, Math.round(diffMs / 60000))}m ago`;
  if (diffH < 24) return `${Math.round(diffH)}h ago`;
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const bottomRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 2000),
    refetchInterval: 15000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
  });

  // Group by conversation_id, newest conversation first
  const conversations = useMemo(() => {
    const map = {};
    // Messages come newest-first; reverse so we can build in order
    [...messages].reverse().forEach(msg => {
      const key = msg.conversation_id || msg.id;
      if (!map[key]) {
        map[key] = {
          conversation_id: key,
          client_name : msg.client_name  || msg.sender_name || '(unknown)',
          client_email: msg.client_email || '',
          booking_id  : msg.booking_id   || '',
          booking_ref : msg.booking_ref  || '',
          messages    : [],
          unread      : 0,
          last_date   : msg.created_date,
        };
      }
      map[key].messages.push(msg);
      if (msg.created_date > map[key].last_date) map[key].last_date = msg.created_date;
      if (!msg.is_read && msg.sender_type !== 'admin') map[key].unread++;
    });

    return Object.values(map).sort((a, b) => (b.last_date > a.last_date ? 1 : -1));
  }, [messages]);

  const filtered = conversations.filter(c =>
    (c.client_name  || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.client_email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.booking_ref  || '').toLowerCase().includes(search.toLowerCase())
  );

  const selected = conversations.find(c => c.conversation_id === selectedId) || null;
  // Sort messages oldest→newest in the thread
  const thread = useMemo(() => {
    if (!selected) return [];
    return [...selected.messages].sort((a, b) => (a.created_date > b.created_date ? 1 : -1));
  }, [selected]);

  // Auto-scroll to bottom when thread changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (!selected) return;
    const unreadIds = selected.messages.filter(m => !m.is_read).map(m => m.id);
    if (unreadIds.length === 0) return;
    unreadIds.forEach(id => {
      base44.entities.Message.update(id, { is_read: true }).catch(() => {});
    });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  }, [selectedId]);

  // Reply mutation — posts to /api/messages/reply
  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !replyText.trim()) return;
      const lastMsg = thread[0] || {};
      await apiPost('/api/messages/reply', {
        conversation_id: selected.conversation_id,
        client_email   : selected.client_email,
        client_name    : selected.client_name,
        booking_id     : selected.booking_id,
        booking_ref    : selected.booking_ref,
        subject        : `Re: ${lastMsg.subject || selected.client_name}`,
        body           : replyText,
      });
      setReplyText('');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  // New conversation mutation
  const newConvMutation = useMutation({
    mutationFn: async () => {
      if (!newEmail.trim() || !newBody.trim()) return;
      await apiPost('/api/messages/reply', {
        conversation_id: `client_${newEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
        client_email   : newEmail.trim(),
        client_name    : newName.trim() || newEmail.trim(),
        subject        : newSubject || 'Message from Reservation Safari',
        body           : newBody,
      });
      setShowNewDialog(false);
      setNewEmail(''); setNewName(''); setNewSubject(''); setNewBody('');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  });

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Messages</h1>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">{totalUnread}</Badge>
          )}
        </div>
        <Button onClick={() => setShowNewDialog(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Message
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — conversation list */}
        <div className="w-72 flex-shrink-0 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No conversations yet
              </div>
            ) : filtered.map(conv => {
              const lastMsg = conv.messages.slice().sort((a, b) => b.created_date > a.created_date ? 1 : -1)[0];
              const isActive = conv.conversation_id === selectedId;
              return (
                <button
                  key={conv.conversation_id}
                  onClick={() => setSelectedId(conv.conversation_id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border/50 transition-colors hover:bg-accent/50',
                    isActive && 'bg-accent'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn('text-sm truncate', conv.unread > 0 ? 'font-semibold' : 'font-medium')}>
                            {conv.client_name}
                          </span>
                          {conv.unread > 0 && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {lastMsg?.subject || conv.client_email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
                      {formatDate(conv.last_date)}
                    </span>
                  </div>
                  {conv.booking_ref && (
                    <div className="mt-1 ml-10 text-xs text-muted-foreground/70">#{conv.booking_ref}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thread pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Thread header */}
              <div className="px-6 py-4 border-b border-border bg-background">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-base">{selected.client_name}</h2>
                    <p className="text-sm text-muted-foreground">{selected.client_email}</p>
                  </div>
                  {selected.booking_ref && (
                    <Badge variant="outline" className="text-xs">Booking #{selected.booking_ref}</Badge>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {thread.map(msg => {
                  const isAdmin  = msg.sender_type === 'admin';
                  const isSystem = msg.sender_type === 'system';
                  const isEmail  = msg.message_type === 'email';

                  if (isSystem || isEmail) {
                    // System/automated emails — show as a timeline entry
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="max-w-lg w-full bg-muted/40 border border-border rounded-xl px-4 py-3">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Email Sent</span>
                            <span className="text-xs text-muted-foreground ml-auto">{formatDate(msg.created_date)}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground mb-1">{msg.subject}</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">{msg.body}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-sm rounded-2xl px-4 py-3 text-sm shadow-sm',
                        isAdmin
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      )}>
                        <p className="text-xs font-medium mb-1 opacity-70">{msg.sender_name || (isAdmin ? 'Admin' : 'Client')}</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                        <p className="text-xs mt-1.5 opacity-60 text-right">{formatDate(msg.created_date)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              <div className="px-6 py-4 border-t border-border bg-background">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Type a reply… (sends an email to the client)"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="resize-none h-20 flex-1"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && replyText.trim()) {
                        e.preventDefault();
                        replyMutation.mutate();
                      }
                    }}
                  />
                  <Button
                    onClick={() => replyMutation.mutate()}
                    disabled={!replyText.trim() || replyMutation.isPending}
                    className="self-end gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {replyMutation.isPending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Ctrl+Enter to send · Reply will also be emailed to {selected.client_email}</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
                <p className="text-sm">Select a conversation to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New message dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Client</label>
              <select
                value={newEmail}
                onChange={e => {
                  const c = clients.find(cl => cl.email === e.target.value);
                  setNewEmail(e.target.value);
                  if (c) setNewName(c.full_name || '');
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm mt-1"
              >
                <option value="">Select a client…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.email}>{c.full_name} ({c.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Or enter email manually</label>
              <Input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="client@example.com"
                type="email"
                className="mt-1"
              />
            </div>
            {newEmail && !clients.find(c => c.email === newEmail) && (
              <div>
                <label className="text-sm font-medium">Client name</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name" className="mt-1" />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Subject" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="Type your message… (will also be emailed to the client)"
                className="resize-none h-32 mt-1"
              />
            </div>
            <div className="flex gap-3 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
              <Button
                onClick={() => newConvMutation.mutate()}
                disabled={!newEmail.trim() || !newBody.trim() || newConvMutation.isPending}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {newConvMutation.isPending ? 'Sending…' : 'Send & Email'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
