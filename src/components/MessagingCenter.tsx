import React, { useMemo, useState } from 'react';
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Paperclip,
  Reply,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  Conversation,
  DirectMessage,
  PlatformNotification,
  UserRole,
} from '../types/farmfund';

export interface MessageRecipientOption {
  id: string;
  name: string;
  role: UserRole;
  contextTitle: string;
  contextType: Conversation['contextType'];
}

interface MessagingCenterProps {
  currentUserId: string;
  currentUserRole: UserRole;
  conversations: Conversation[];
  messages: DirectMessage[];
  notifications: PlatformNotification[];
  availableRecipients: MessageRecipientOption[];
  onSendMessage: (params: {
    recipientId: string;
    contextType: Conversation['contextType'];
    contextTitle: string;
    body: string;
    attachments?: string[];
    replyToId?: string;
    replyToPreview?: string;
  }) => Promise<void>;
  onMarkConversationRead: (conversationId?: string) => Promise<void>;
}

export const MessagingCenter: React.FC<MessagingCenterProps> = ({
  currentUserId,
  currentUserRole,
  conversations,
  messages,
  notifications,
  availableRecipients,
  onSendMessage,
  onMarkConversationRead,
}) => {
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(
    availableRecipients[0]?.id || ''
  );
  const [messageBody, setMessageBody] = useState('');
  const [attachmentRef, setAttachmentRef] = useState('');
  const [replyTarget, setReplyTarget] = useState<DirectMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const selectedRecipient = useMemo(
    () =>
      availableRecipients.find((r) => r.id === selectedRecipientId) ||
      availableRecipients[0] ||
      null,
    [availableRecipients, selectedRecipientId]
  );

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (sum, c) => sum + (Number(c.unreadByUser?.[currentUserId]) || 0),
        0
      ) + notifications.filter((n) => !n.read).length,
    [conversations, notifications, currentUserId]
  );

  const activeThreadMessages = useMemo(() => {
    if (!selectedRecipient) return messages;
    return messages.filter(
      (m) =>
        (m.senderId === currentUserId && m.recipientId === selectedRecipient.id) ||
        (m.recipientId === currentUserId && m.senderId === selectedRecipient.id)
    );
  }, [messages, currentUserId, selectedRecipient]);

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentRef(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!selectedRecipient) {
      setFeedback({ type: 'err', text: 'Select an authorised recipient first.' });
      return;
    }
    if (!messageBody.trim()) {
      setFeedback({ type: 'err', text: 'Enter a message before sending.' });
      return;
    }
    setSending(true);
    try {
      await onSendMessage({
        recipientId: selectedRecipient.id,
        contextType: selectedRecipient.contextType,
        contextTitle: selectedRecipient.contextTitle,
        body: messageBody.trim(),
        attachments: attachmentRef.trim() ? [attachmentRef.trim()] : [],
        replyToId: replyTarget?.id,
        replyToPreview: replyTarget ? `${replyTarget.senderName}: ${replyTarget.body.slice(0, 60)}` : undefined,
      });
      setMessageBody('');
      setAttachmentRef('');
      setReplyTarget(null);
      setFeedback({ type: 'ok', text: `Message delivered to ${selectedRecipient.name}.` });
    } catch (err: unknown) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to send message.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-900/15 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF6EC] text-[#159B42]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#243629]">
              Authorised Messages &amp; Notifications
            </h2>
            <p className="text-xs text-[#718071]">
              Role-scoped communication for {currentUserRole} workspace ·{' '}
              <span className="font-mono font-bold text-[#116B32]">{totalUnread} unread</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void onMarkConversationRead(conversations[0]?.id)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F5F8F3] px-3.5 py-2 text-xs font-bold text-[#243629] transition-colors hover:bg-[#EAF6EC]"
        >
          <CheckCheck className="h-4 w-4 text-[#159B42]" />
          <span>Mark All Read</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Authorised Conversations & Notifications */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#718071]">
              Authorised Contacts ({availableRecipients.length})
            </h3>
            {availableRecipients.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-[#718071]">
                {currentUserRole === 'Supervisor'
                  ? 'Contacts appear here once you are invited to or accept a project supervision assignment.'
                  : 'No authorised contacts connected yet. Contacts appear when you discover sponsors, post or apply for jobs, or collaborate on an agreement.'}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {availableRecipients.map((rec) => {
                  const isSelected = selectedRecipient?.id === rec.id;
                  const unread = conversations.find((c) => c.participantIds.includes(rec.id))
                    ?.unreadByUser?.[currentUserId] || 0;
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => {
                        setSelectedRecipientId(rec.id);
                        const conv = conversations.find((c) => c.participantIds.includes(rec.id));
                        if (conv && unread > 0) void onMarkConversationRead(conv.id);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors duration-200 ${
                        isSelected
                          ? 'border-[#159B42] bg-[#EAF6EC]'
                          : 'border-slate-200 bg-white hover:bg-[#F5F8F3]'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-[#243629]">{rec.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#718071]">
                          {rec.role} · {rec.contextTitle}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="rounded-md bg-[#159B42] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                          {unread} new
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#159B42]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#718071]">
                Recent Notifications ({notifications.length})
              </h3>
            </div>
            {notifications.length === 0 ? (
              <p className="mt-3 text-xs text-[#718071]">No notifications received yet.</p>
            ) : (
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {notifications.slice(0, 12).map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-3 text-xs ${
                      n.read ? 'border-slate-100 bg-slate-50' : 'border-emerald-200 bg-[#EAF6EC]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#243629]">{n.title}</span>
                      <span className="font-mono text-[10px] text-[#718071]">
                        {n.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#718071]">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Conversation Thread & Composer */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#243629]">
                  {selectedRecipient
                    ? `Conversation with ${selectedRecipient.name}`
                    : 'Message Thread'}
                </h3>
                <p className="text-[11px] text-[#718071]">
                  {selectedRecipient
                    ? `${selectedRecipient.role} · ${selectedRecipient.contextTitle}`
                    : 'Select an authorised participant to view or send messages'}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#116B32]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Participant-Restricted
              </span>
            </div>

            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
              {activeThreadMessages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-[#718071]">
                  No messages exchanged in this conversation yet. Use the composer below to start.
                </div>
              ) : (
                activeThreadMessages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-2xl border p-3.5 text-xs ${
                        isMine
                          ? 'ml-6 border-emerald-200 bg-[#EAF6EC]'
                          : 'mr-6 border-slate-200 bg-[#F5F8F3]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#243629]">
                          {msg.senderName} ({msg.senderRole})
                        </span>
                        <span className="font-mono text-[10px] text-[#718071]">
                          {msg.createdAt.replace('T', ' ').slice(0, 16)}
                        </span>
                      </div>

                      {msg.replyToPreview && (
                        <div className="mt-1.5 rounded-lg border-l-2 border-[#159B42] bg-white/80 px-2.5 py-1 text-[11px] text-[#718071]">
                          Replying to: {msg.replyToPreview}
                        </div>
                      )}

                      <p className="mt-1.5 leading-relaxed text-[#243629]">{msg.body}</p>

                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((att, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-[#243629]"
                            >
                              <Paperclip className="h-3 w-3 text-[#159B42]" />
                              {att}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setReplyTarget(msg)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#116B32] hover:underline"
                        >
                          <Reply className="h-3 w-3" />
                          <span>Reply</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            {replyTarget && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-[#EAF6EC] px-3 py-2 text-xs">
                <span className="truncate text-[#116B32]">
                  Replying to <strong>{replyTarget.senderName}</strong>: {replyTarget.body}
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTarget(null)}
                  className="ml-2 text-[#116B32] hover:text-[#243629]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {feedback && (
              <div
                role={feedback.type === 'err' ? 'alert' : 'status'}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold ${
                  feedback.type === 'err'
                    ? 'bg-red-50 text-red-800'
                    : 'bg-[#EAF6EC] text-[#116B32]'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <textarea
              rows={3}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              disabled={!selectedRecipient || sending}
              placeholder={
                selectedRecipient
                  ? `Write a direct message to ${selectedRecipient.name}...`
                  : 'Connect with a contact to start messaging...'
              }
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs text-[#243629] focus:border-[#159B42] focus:outline-hidden"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F5F8F3] px-3 py-1.5 text-xs font-semibold text-[#243629] hover:bg-[#EAF6EC]">
                  <Paperclip className="h-3.5 w-3.5 text-[#159B42]" />
                  <span>Attach File / Image</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileAttachment}
                    className="hidden"
                  />
                </label>
                {attachmentRef && (
                  <span className="font-mono text-[11px] text-[#116B32]">{attachmentRef}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={!selectedRecipient || sending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#159B42] px-5 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-[#116B32] disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{sending ? 'Sending...' : 'Send Message'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
