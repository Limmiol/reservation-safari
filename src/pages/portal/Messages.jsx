import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageSquare, Send, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PortalMessages() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['portal-messages', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.Message.filter({ client_email: user.email }, '-created_date', 1000);
      return all;
    },
    enabled: !!user?.email,
  });

  // Group messages by conversation
  const conversations = useMemo(() => {
    const grouped = {};
    messages.forEach(msg => {
      const key = msg.conversation_id;
      if (!grouped[key]) {
        grouped[key] = {
          conversation_id: msg.conversation_id,
          client_id: msg.client_id,
          client_name: msg.client_name,
          booking_id: msg.booking_id,
          messages: [],
          status: msg.status,
          lastMessage: msg,
        };
      }
      grouped[key].messages.push(msg);
      grouped[key].status = msg.status;
    });
    return Object.values(grouped).sort((a, b) => 
      new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConversation || !newMessage.trim() || !user) return;
      
      await base44.entities.Message.create({
        conversation_id: selectedConversation.conversation_id,
        booking_id: selectedConversation.booking_id,
        client_id: selectedConversation.client_id,
        client_name: selectedConversation.client_name,
        client_email: user.email,
        sender_type: 'client',
        sender_name: user.full_name,
        sender_email: user.email,
        subject: selectedConversation.messages[0]?.subject || 'Re: Message',
        body: newMessage,
        is_read: false,
        status: 'open',
      });
      setNewMessage('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!newBody.trim() || !user) return;

      const conversationId = `${user.email}_${Date.now()}`;

      await base44.entities.Message.create({
        conversation_id: conversationId,
        client_id: user.id,
        client_name: user.full_name,
        client_email: user.email,
        sender_type: 'client',
        sender_name: user.full_name,
        sender_email: user.email,
        subject: newSubject || 'New Message',
        body: newBody,
        is_read: true,
        status: 'open',
      });

      setShowNewDialog(false);
      setNewSubject('');
      setNewBody('');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-messages'] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">Communicate with our team</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversation list */}
        <div className="md:col-span-1 bg-card rounded-lg border border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Conversations</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 p-2">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {messagesLoading ? 'Loading...' : 'No messages yet'}
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.conversation_id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg transition-colors text-sm',
                    selectedConversation?.conversation_id === conv.conversation_id
                      ? 'bg-foreground text-background'
                      : 'hover:bg-accent text-foreground'
                  )}
                >
                  <div className="font-medium truncate">{conv.lastMessage.subject}</div>
                  <div className={cn('text-xs truncate', selectedConversation?.conversation_id === conv.conversation_id ? 'text-background/70' : 'text-muted-foreground')}>
                    {new Date(conv.lastMessage.created_date).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation detail */}
        <div className="md:col-span-2 bg-card rounded-lg border border-border flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-lg">{selectedConversation.lastMessage.subject}</h2>
                <p className="text-sm text-muted-foreground">Status: {selectedConversation.status}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((msg) => (
                  <div key={msg.id} className={cn('flex', msg.sender_type === 'client' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-xs px-4 py-2 rounded-lg',
                        msg.sender_type === 'client'
                          ? 'bg-foreground text-background'
                          : 'bg-accent text-foreground'
                      )}
                    >
                      <p className="text-xs font-medium mb-1">{msg.sender_name}</p>
                      <p className="text-sm">{msg.body}</p>
                      <p className={cn('text-xs mt-1', msg.sender_type === 'client' ? 'text-background/60' : 'text-muted-foreground')}>
                        {new Date(msg.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border space-y-3">
                <Textarea
                  placeholder="Type your reply..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="resize-none h-20"
                />
                <Button
                  onClick={() => sendMessageMutation.mutate()}
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  className="w-full gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-3">
                <MessageSquare className="w-12 h-12 mx-auto opacity-50" />
                <p>Select a conversation or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New message dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to Support</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="What is this about?"
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Type your message..."
                className="resize-none h-32"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
              <Button onClick={() => createConversationMutation.mutate()} disabled={createConversationMutation.isPending}>Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}