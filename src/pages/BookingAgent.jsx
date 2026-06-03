import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, MessageSquare, Plus, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import MessageBubble from '@/components/MessageBubble';

export default function BookingAgent() {
  const { toast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  useEffect(() => {
    base44.auth.me()
      .then(() => {
        setIsAuthenticated(true);
        loadConversations();
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, []);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const convos = await base44.agents.listConversations({
        agent_name: "bookingManager"
      });
      setConversations(Array.isArray(convos) ? convos : []);
      if (Array.isArray(convos) && convos.length > 0) {
        setSelectedConversation(convos[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({ title: 'Error loading conversations', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingConversations(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const convo = await base44.agents.createConversation({
        agent_name: "bookingManager",
        metadata: {
          name: `Booking Chat ${new Date().toLocaleDateString()}`,
          description: `Started at ${time}`,
          created_at: new Date().toISOString(),
        }
      });
      setConversations([convo, ...conversations]);
      setSelectedConversation(convo);
      toast({ title: 'New conversation created', description: 'Ready to start chatting' });
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({ title: 'Failed to create conversation', description: error.message, variant: 'destructive' });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation || loading) return;

    const userMessage = messageInput.trim();
    setMessageInput('');
    setLoading(true);

    try {
      // Add user message locally first for instant feedback
      const updatedConvo = {
        ...selectedConversation,
        messages: [
          ...(selectedConversation.messages || []),
          { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
        ]
      };
      setSelectedConversation(updatedConvo);

      // Send to backend and get AI response
      await base44.agents.addMessage(selectedConversation.id, {
        role: "user",
        content: userMessage
      });

      // Fetch updated conversation with AI response
      const updated = await base44.agents.getConversation(selectedConversation.id);
      setSelectedConversation(updated);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({ title: 'Failed to send message', description: error.message, variant: 'destructive' });
      // Reload conversation to sync state
      const synced = await base44.agents.getConversation(selectedConversation.id).catch(() => selectedConversation);
      setSelectedConversation(synced);
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = async () => {
    try {
      const url = await base44.agents.getWhatsAppConnectURL('bookingManager');
      if (url) {
        window.open(url, '_blank');
        toast({ title: 'WhatsApp Connect', description: 'Opening WhatsApp connection...' });
      } else {
        toast({ title: 'WhatsApp Connect', description: 'WhatsApp integration not available', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to get WhatsApp URL:', error);
      toast({ title: 'Failed to connect WhatsApp', description: error.message, variant: 'destructive' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-muted to-background">
        <div className="text-center space-y-4 p-8">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground">Booking Assistant</h2>
          <p className="text-muted-foreground max-w-sm">Please sign in to use the AI booking assistant for managing safari reservations.</p>
          <Button onClick={() => window.location.href = '/login'} className="mt-4">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex-shrink-0 space-y-2">
          <Button onClick={createNewConversation} disabled={loading} className="w-full gap-2" variant="default">
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
          <Button onClick={openWhatsApp} className="w-full gap-2" variant="outline" title="Connect via WhatsApp">
            <ExternalLink className="w-4 h-4" />
            WhatsApp
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-xs text-muted-foreground p-2 text-center py-8">No conversations yet. Start a new chat!</div>
          ) : (
            conversations.map(convo => (
              <button
                key={convo.id}
                onClick={() => setSelectedConversation(convo)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group hover:bg-accent/80",
                  selectedConversation?.id === convo.id 
                    ? "bg-primary text-primary-foreground" 
                    : "text-foreground hover:bg-accent"
                )}
              >
                <div className="truncate font-medium text-xs">{convo.metadata?.name || 'Chat'}</div>
                <div className="text-xs opacity-60 truncate">{convo.metadata?.description || 'No description'}</div>
                <div className="text-[10px] opacity-50 mt-1">{convo.messages?.length || 0} messages</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
              <h2 className="font-semibold text-foreground">{selectedConversation.metadata?.name || 'Chat'}</h2>
              <p className="text-xs text-muted-foreground">{selectedConversation.metadata?.description || ''}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedConversation.messages?.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground space-y-3">
                    <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
                    <div>
                      <p className="font-medium">Welcome to Booking Assistant</p>
                      <p className="text-sm mt-1">Ask me about bookings, packages, or recommendations</p>
                    </div>
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs">Try asking:</p>
                      <ul className="text-xs mt-2 space-y-1 text-muted-foreground/70">
                        <li>\"Show me available packages\"</li>
                        <li>\"Create a booking for John Doe\"</li>
                        <li>\"What's the status of booking #1234?\"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                selectedConversation.messages?.map((msg, idx) => (
                  <MessageBubble key={idx} message={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border bg-card p-4 flex-shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Ask about bookings, packages, or recommendations..."
                  disabled={loading}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={loading || !messageInput.trim()} size="icon">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto opacity-30" />
              <div>
                <p className="font-medium text-lg">No conversation selected</p>
                <p className="text-sm">Create a new chat or select an existing one to get started</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}