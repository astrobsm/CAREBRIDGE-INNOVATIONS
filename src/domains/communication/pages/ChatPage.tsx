import { useState, useRef, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  Users,
  User,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Image,
  Smile,
  Check,
  CheckCheck,
  AlertCircle,
  Hash,
  Star,
  Archive,
  X,
  Reply,
  Trash2,
  Edit3,
  Copy,
  ChevronLeft,
  Bell,
  UserPlus,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import type { ChatRoom, ChatMessage, ChatParticipant, UserRole, ChatRoomType } from '../../../types';

// Room type icons and colors
const roomTypeConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  direct: { icon: <User size={16} />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  group: { icon: <Users size={16} />, color: 'text-green-600', bgColor: 'bg-green-100' },
  department: { icon: <Hash size={16} />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  case_discussion: { icon: <MessageSquare size={16} />, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  emergency: { icon: <AlertCircle size={16} />, color: 'text-red-600', bgColor: 'bg-red-100' },
};

// Format message timestamp
function formatMessageTime(date: Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday ' + format(date, 'HH:mm');
  }
  return format(date, 'dd/MM/yy HH:mm');
}

// Format room last message time
function formatLastMessageTime(date: Date): string {
  if (isToday(date)) {
    return format(date, 'HH:mm');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'dd/MM/yy');
}

export default function ChatPage() {
  const { user } = useAuth();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewRoomModal, setShowNewRoomModal] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch chat rooms
  const chatRooms = useLiveQuery(async () => {
    const rooms = await db.chatRooms
      .where('isArchived')
      .equals(0)
      .toArray();
    
    // Filter rooms where user is a participant
    return rooms.filter(room => 
      room.participants.some(p => p.userId === user?.id)
    ).sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [user?.id]);

  // Fetch messages for selected room
  const messages = useLiveQuery(async () => {
    if (!selectedRoomId) return [];
    return db.chatMessages
      .where('roomId')
      .equals(selectedRoomId)
      .sortBy('createdAt');
  }, [selectedRoomId]);

  // Get selected room
  const selectedRoom = useMemo(() => {
    return chatRooms?.find(r => r.id === selectedRoomId);
  }, [chatRooms, selectedRoomId]);

  // Fetch all users for creating new rooms
  const allUsers = useLiveQuery(() => db.users.filter(u => u.isActive === true).toArray());

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter rooms by search
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return chatRooms || [];
    const query = searchQuery.toLowerCase();
    return (chatRooms || []).filter(room =>
      room.name.toLowerCase().includes(query) ||
      room.participants.some(p => p.userName.toLowerCase().includes(query))
    );
  }, [chatRooms, searchQuery]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRoomId || !user) return;

    try {
      const newMessage: ChatMessage = {
        id: uuidv4(),
        roomId: selectedRoomId,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        senderRole: user.role,
        senderAvatar: user.avatar,
        content: messageText.trim(),
        type: 'text',
        replyTo: replyingTo?.id,
        isEdited: false,
        isDeleted: false,
        readBy: [user.id],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.chatMessages.add(newMessage);
      syncRecord('chatMessages', newMessage as unknown as Record<string, unknown>);

      // Update room's last message time
      await db.chatRooms.update(selectedRoomId, {
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      });
      const updatedRoom = await db.chatRooms.get(selectedRoomId);
      if (updatedRoom) syncRecord('chatRooms', updatedRoom as unknown as Record<string, unknown>);

      setMessageText('');
      setReplyingTo(null);
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Handle editing a message
  const handleUpdateMessage = async () => {
    if (!messageText.trim() || !editingMessage) return;

    try {
      await db.chatMessages.update(editingMessage.id, {
        content: messageText.trim(),
        isEdited: true,
        updatedAt: new Date(),
      });
      const updatedMsg = await db.chatMessages.get(editingMessage.id);
      if (updatedMsg) syncRecord('chatMessages', updatedMsg as unknown as Record<string, unknown>);

      setMessageText('');
      setEditingMessage(null);
      toast.success('Message updated');
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  // Handle deleting a message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await db.chatMessages.update(messageId, {
        isDeleted: true,
        content: 'This message was deleted',
        updatedAt: new Date(),
      });
      const deletedMsg = await db.chatMessages.get(messageId);
      if (deletedMsg) syncRecord('chatMessages', deletedMsg as unknown as Record<string, unknown>);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Create new room
  const handleCreateRoom = async (name: string, type: ChatRoomType, participantIds: string[]) => {
    if (!user) return;

    try {
      const participants: ChatParticipant[] = [];
      
      // Add current user
      participants.push({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        avatar: user.avatar,
        joinedAt: new Date(),
        isOnline: true,
      });

      // Add selected participants
      for (const userId of participantIds) {
        const selectedUser = allUsers?.find(u => u.id === userId);
        if (selectedUser) {
          participants.push({
            userId: selectedUser.id,
            userName: `${selectedUser.firstName} ${selectedUser.lastName}`,
            userRole: selectedUser.role,
            avatar: selectedUser.avatar,
            joinedAt: new Date(),
          });
        }
      }

      const newRoom: ChatRoom = {
        id: uuidv4(),
        name,
        type,
        participants,
        admins: [user.id],
        isArchived: false,
        createdBy: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.chatRooms.add(newRoom);
      syncRecord('chatRooms', newRoom as unknown as Record<string, unknown>);
      setSelectedRoomId(newRoom.id);
      setShowNewRoomModal(false);
      toast.success('Chat room created');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  // Get unread count for a room (placeholder - would check messages not read by user)
  const getUnreadCount = (_room: ChatRoom): number => {
    // TODO: Implement actual unread count logic
    return 0;
  };

  // Render message bubble
  const renderMessage = (message: ChatMessage, index: number) => {
    const isOwnMessage = message.senderId === user?.id;
    const showAvatar = index === 0 || messages?.[index - 1]?.senderId !== message.senderId;
    const replyMessage = message.replyTo ? messages?.find(m => m.id === message.replyTo) : null;

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-2 mb-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        {showAvatar && !isOwnMessage ? (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {message.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}

        {/* Message content */}
        <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {/* Sender name for group chats */}
          {showAvatar && !isOwnMessage && selectedRoom?.type !== 'direct' && (
            <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>
          )}

          {/* Reply preview */}
          {replyMessage && (
            <div className={`text-xs p-2 rounded-t-lg border-l-2 ${
              isOwnMessage 
                ? 'bg-blue-100 border-blue-400 text-blue-700' 
                : 'bg-gray-100 border-gray-400 text-gray-600'
            }`}>
              <p className="font-medium">{replyMessage.senderName}</p>
              <p className="truncate">{replyMessage.content}</p>
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`group relative px-4 py-2 rounded-2xl ${
              message.isDeleted
                ? 'bg-gray-100 text-gray-400 italic'
                : isOwnMessage
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-900 rounded-bl-md'
            } ${replyMessage ? 'rounded-t-none' : ''}`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            
            {/* Message meta */}
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              isOwnMessage ? 'text-blue-200 justify-end' : 'text-gray-400'
            }`}>
              <span>{formatMessageTime(new Date(message.createdAt))}</span>
              {message.isEdited && <span>(edited)</span>}
              {isOwnMessage && (
                <CheckCheck size={14} className={message.readBy.length > 1 ? 'text-green-300' : ''} />
              )}
            </div>

            {/* Message actions */}
            {!message.isDeleted && (
              <div className={`absolute top-0 ${isOwnMessage ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} 
                opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2`}>
                <button
                  onClick={() => setReplyingTo(message)}
                  className="p-1.5 hover:bg-gray-200 rounded-full"
                  title="Reply"
                >
                  <Reply size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content);
                    toast.success('Copied to clipboard');
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded-full"
                  title="Copy"
                >
                  <Copy size={14} className="text-gray-500" />
                </button>
                {isOwnMessage && (
                  <>
                    <button
                      onClick={() => {
                        setEditingMessage(message);
                        setMessageText(message.content);
                        messageInputRef.current?.focus();
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded-full"
                      title="Edit"
                    >
                      <Edit3 size={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="p-1.5 hover:bg-red-100 rounded-full"
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)] flex bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Sidebar - Room List */}
      <div className={`w-full sm:w-80 border-r flex flex-col ${selectedRoomId && 'hidden sm:flex'}`}>
        {/* Header */}
        <div className="p-3 sm:p-4 border-b">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">Messages</h1>
            <button
              onClick={() => setShowNewRoomModal(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="New Chat"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No conversations yet</p>
              <p className="text-sm">Start a new chat to begin</p>
            </div>
          ) : (
            filteredRooms.map((room) => {
              const config = roomTypeConfig[room.type];
              const unreadCount = getUnreadCount(room);
              const otherParticipant = room.type === 'direct' 
                ? room.participants.find(p => p.userId !== user?.id)
                : null;

              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors border-b ${
                    selectedRoomId === room.id ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Room Avatar */}
                  <div className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                    {room.type === 'direct' && otherParticipant ? (
                      <span className="text-lg font-semibold text-gray-700">
                        {otherParticipant.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    ) : (
                      <span className={config.color}>{config.icon}</span>
                    )}
                  </div>

                  {/* Room Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {room.type === 'direct' && otherParticipant
                          ? otherParticipant.userName
                          : room.name}
                      </h3>
                      {room.lastMessageAt && (
                        <span className="text-xs text-gray-400">
                          {formatLastMessageTime(new Date(room.lastMessageAt))}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">
                        {room.type !== 'direct' && (
                          <span className="text-gray-400">{room.participants.length} members</span>
                        )}
                      </p>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedRoomId && selectedRoom ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedRoomId(null)}
                className="sm:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className={`w-10 h-10 rounded-full ${roomTypeConfig[selectedRoom.type].bgColor} flex items-center justify-center`}>
                <span className={roomTypeConfig[selectedRoom.type].color}>
                  {roomTypeConfig[selectedRoom.type].icon}
                </span>
              </div>
              
              <div>
                <h2 className="font-semibold text-gray-900">{selectedRoom.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedRoom.participants.length} participants
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Voice Call">
                <Phone size={20} className="text-gray-600" />
              </button>
              <button 
                onClick={() => window.location.href = '/communication/video'}
                className="p-2 hover:bg-gray-100 rounded-lg" 
                title="Video Call"
              >
                <Video size={20} className="text-gray-600" />
              </button>
              <button
                onClick={() => setShowRoomInfo(!showRoomInfo)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Room Info"
              >
                <MoreVertical size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {messages?.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              </div>
            ) : (
              <>
                {messages?.map((message, index) => renderMessage(message, index))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Reply Preview */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 bg-blue-50 border-t border-blue-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply size={16} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        Replying to {replyingTo.senderName}
                      </p>
                      <p className="text-sm text-blue-600 truncate max-w-xs">
                        {replyingTo.content}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 hover:bg-blue-100 rounded"
                  >
                    <X size={16} className="text-blue-600" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Preview */}
          <AnimatePresence>
            {editingMessage && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-4 py-2 bg-amber-50 border-t border-amber-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 size={16} className="text-amber-600" />
                    <p className="text-sm font-medium text-amber-700">Editing message</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingMessage(null);
                      setMessageText('');
                    }}
                    className="p-1 hover:bg-amber-100 rounded"
                  >
                    <X size={16} className="text-amber-600" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message Input */}
          <div className="p-3 sm:p-4 border-t bg-white">
            <div className="flex items-end gap-2 sm:gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Attach File">
                <Paperclip size={20} className="text-gray-500" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Send Image">
                <Image size={20} className="text-gray-500" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={messageInputRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (editingMessage) {
                        handleUpdateMessage();
                      } else {
                        handleSendMessage();
                      }
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full px-4 py-3 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32"
                  rows={1}
                />
              </div>

              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Emoji">
                <Smile size={20} className="text-gray-500" />
              </button>

              <button
                onClick={() => editingMessage ? handleUpdateMessage() : handleSendMessage()}
                disabled={!messageText.trim()}
                className={`p-3 rounded-xl transition-colors ${
                  messageText.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* No Chat Selected */
        <div className="flex-1 hidden sm:flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">AstroHEALTH Messaging</h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-md">
              Select a conversation to start messaging or create a new chat to connect with your team.
            </p>
            <button
              onClick={() => setShowNewRoomModal(true)}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus size={20} />
              Start New Chat
            </button>
          </div>
        </div>
      )}

      {/* Room Info Sidebar */}
      <AnimatePresence>
        {showRoomInfo && selectedRoom && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l bg-white overflow-hidden"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Room Info</h3>
              <button
                onClick={() => setShowRoomInfo(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4">
              <div className={`w-20 h-20 mx-auto rounded-full ${roomTypeConfig[selectedRoom.type].bgColor} flex items-center justify-center mb-4`}>
                <span className={`${roomTypeConfig[selectedRoom.type].color} scale-150`}>
                  {roomTypeConfig[selectedRoom.type].icon}
                </span>
              </div>
              <h2 className="text-xl font-bold text-center text-gray-900">{selectedRoom.name}</h2>
              <p className="text-center text-gray-500 capitalize">{selectedRoom.type.replace('_', ' ')}</p>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-700">Participants</h4>
                  <button className="text-blue-600 text-sm flex items-center gap-1">
                    <UserPlus size={14} />
                    Add
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedRoom.participants.map((participant) => (
                    <div key={participant.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                        {participant.userName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{participant.userName}</p>
                        <p className="text-xs text-gray-500 capitalize">{participant.userRole.replace('_', ' ')}</p>
                      </div>
                      {selectedRoom.admins.includes(participant.userId) && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Admin</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Bell size={18} />
                  <span>Mute Notifications</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Star size={18} />
                  <span>Starred Messages</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Archive size={18} />
                  <span>Archive Chat</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 text-red-600">
                  <LogOut size={18} />
                  <span>Leave Group</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Room Modal */}
      <AnimatePresence>
        {showNewRoomModal && (
          <NewRoomModal
            users={allUsers || []}
            currentUserId={user?.id || ''}
            onClose={() => setShowNewRoomModal(false)}
            onCreate={handleCreateRoom}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// New Room Modal Component
interface NewRoomModalProps {
  users: Array<{ id: string; firstName: string; lastName: string; role: UserRole; avatar?: string }>;
  currentUserId: string;
  onClose: () => void;
  onCreate: (name: string, type: ChatRoomType, participantIds: string[]) => void;
}

function NewRoomModal({ users, currentUserId, onClose, onCreate }: NewRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<ChatRoomType>('group');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(u => 
    u.id !== currentUserId &&
    (`${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = () => {
    if (!roomName.trim() && roomType !== 'direct') {
      toast.error('Please enter a room name');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one participant');
      return;
    }

    const name = roomType === 'direct' 
      ? users.find(u => u.id === selectedUsers[0])?.firstName + ' ' + users.find(u => u.id === selectedUsers[0])?.lastName
      : roomName;

    onCreate(name || 'New Chat', roomType, selectedUsers);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">New Conversation</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Room Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['direct', 'group', 'department', 'case_discussion'] as const).map((type) => {
                const config = roomTypeConfig[type];
                return (
                  <button
                    key={type}
                    onClick={() => setRoomType(type)}
                    className={`p-3 rounded-lg border-2 flex items-center gap-2 transition-colors ${
                      roomType === type
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={config.color}>{config.icon}</span>
                    <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room Name (for non-direct chats) */}
          {roomType !== 'direct' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Room Name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* User Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Participants {selectedUsers.length > 0 && `(${selectedUsers.length} selected)`}
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* User List */}
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              {filteredUsers.length === 0 ? (
                <p className="p-4 text-center text-gray-500">No users found</p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedUsers.includes(u.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-500 capitalize">{u.role.replace('_', ' ')}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedUsers.includes(u.id)
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedUsers.includes(u.id) && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Chat
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
