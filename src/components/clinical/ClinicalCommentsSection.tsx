// ============================================================
// Clinical Comments Section Component
// Reusable component for adding post-submission notes/emphasis
// to encounters, investigations, prescriptions, etc.
// ============================================================

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  MessageCircle, 
  Send, 
  AlertCircle, 
  AlertTriangle, 
  Flag,
  CheckCircle2,
  Clock,
  User,
  Reply,
  MoreVertical,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../database/db';
import { ClinicalCommentOps } from '../../database/operations';
import { useAuth } from '../../contexts/AuthContext';
import type { 
  ClinicalComment, 
  CommentableEntityType, 
  CommentPriority 
} from '../../types';

// ============================================================
// PROPS INTERFACE
// ============================================================

interface ClinicalCommentsSectionProps {
  entityType: CommentableEntityType;
  entityId: string;
  patientId: string;
  hospitalId: string;
  title?: string;
  placeholder?: string;
  showResolveOption?: boolean;
  collapsed?: boolean;
}

// ============================================================
// PRIORITY CONFIG
// ============================================================

const PRIORITY_CONFIG: Record<CommentPriority, { 
  label: string; 
  color: string; 
  bgColor: string; 
  icon: React.ComponentType<{ className?: string }>;
}> = {
  normal: {
    label: 'Normal',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: MessageCircle,
  },
  important: {
    label: 'Important',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: Flag,
  },
  urgent: {
    label: 'Urgent',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: AlertCircle,
  },
};

const CATEGORY_OPTIONS = [
  { value: 'clarification', label: 'Clarification' },
  { value: 'update', label: 'Update' },
  { value: 'correction', label: 'Correction' },
  { value: 'follow_up', label: 'Follow-up Required' },
  { value: 'warning', label: 'Warning' },
  { value: 'instruction', label: 'Instruction' },
  { value: 'other', label: 'Other' },
];

// ============================================================
// COMMENT CARD COMPONENT
// ============================================================

interface CommentCardProps {
  comment: ClinicalComment;
  onReply?: (parentId: string) => void;
  onResolve?: (id: string) => void;
  onUnresolve?: (id: string) => void;
  onDelete?: (id: string) => void;
  currentUserId: string;
  replies?: ClinicalComment[];
  level?: number;
}

const CommentCard: React.FC<CommentCardProps> = ({
  comment,
  onReply,
  onResolve,
  onUnresolve,
  onDelete,
  currentUserId,
  replies = [],
  level = 0,
}) => {
  const [showReplies, setShowReplies] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const priorityConfig = PRIORITY_CONFIG[comment.priority];
  const PriorityIcon = priorityConfig.icon;
  const isAuthor = comment.authorId === currentUserId;

  return (
    <div className={`${level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}>
      <div 
        className={`p-3 rounded-lg ${priorityConfig.bgColor} ${
          comment.isResolved ? 'opacity-60' : ''
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <PriorityIcon className={`h-4 w-4 ${priorityConfig.color}`} />
            <span className={`text-xs font-medium ${priorityConfig.color}`}>
              {priorityConfig.label}
            </span>
            {comment.category && (
              <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded">
                {CATEGORY_OPTIONS.find(c => c.value === comment.category)?.label}
              </span>
            )}
            {comment.isResolved && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Resolved
              </span>
            )}
          </div>
          
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-white/50 rounded"
              title="Comment actions"
              aria-label="Comment actions menu"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
            
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white shadow-lg rounded-md py-1 z-20 min-w-[120px]">
                  {!comment.isResolved && onReply && (
                    <button
                      onClick={() => {
                        onReply(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </button>
                  )}
                  {!comment.isResolved && onResolve && (
                    <button
                      onClick={() => {
                        onResolve(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-green-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </button>
                  )}
                  {comment.isResolved && onUnresolve && (
                    <button
                      onClick={() => {
                        onUnresolve(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Unresolve
                    </button>
                  )}
                  {isAuthor && onDelete && (
                    <button
                      onClick={() => {
                        onDelete(comment.id);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                    >
                      <X className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Comment Text */}
        <p className="text-sm text-gray-800 whitespace-pre-wrap mb-2">
          {comment.comment}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span>{comment.authorName}</span>
            <span className="text-gray-400">({comment.authorRole})</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(comment.createdAt), 'dd MMM yyyy, HH:mm')}</span>
          </div>
        </div>

        {/* Resolved Info */}
        {comment.isResolved && comment.resolvedByName && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>
              Resolved by {comment.resolvedByName} on{' '}
              {format(new Date(comment.resolvedAt!), 'dd MMM yyyy, HH:mm')}
            </span>
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
          >
            {showReplies ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          
          {showReplies && (
            <div className="space-y-2">
              {replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onResolve={onResolve}
                  onUnresolve={onUnresolve}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const ClinicalCommentsSection: React.FC<ClinicalCommentsSectionProps> = ({
  entityType,
  entityId,
  patientId,
  hospitalId,
  title = 'Comments & Notes',
  placeholder = 'Add a comment or note...',
  showResolveOption = true,
  collapsed: initialCollapsed = false,
}) => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [comment, setComment] = useState('');
  const [priority, setPriority] = useState<CommentPriority>('normal');
  const [category, setCategory] = useState<ClinicalComment['category']>(undefined);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live query for comments
  const comments = useLiveQuery(
    () => db.clinicalComments
      .where(['entityType', 'entityId'])
      .equals([entityType, entityId])
      .filter(c => !c.parentCommentId) // Only top-level comments
      .reverse()
      .toArray(),
    [entityType, entityId]
  );

  // Get replies for each comment
  const allComments = useLiveQuery(
    () => db.clinicalComments
      .where(['entityType', 'entityId'])
      .equals([entityType, entityId])
      .toArray(),
    [entityType, entityId]
  );

  const getReplies = (parentId: string): ClinicalComment[] => {
    return (allComments || []).filter(c => c.parentCommentId === parentId);
  };

  // Count unresolved comments
  const unresolvedCount = (comments || []).filter(c => !c.isResolved).length;

  // Handle submit
  const handleSubmit = async () => {
    if (!comment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await ClinicalCommentOps.create({
        entityType,
        entityId,
        patientId,
        hospitalId,
        comment: comment.trim(),
        priority,
        category,
        authorId: user.id,
        authorName: `${user.firstName} ${user.lastName}`,
        authorRole: user.role,
        parentCommentId: replyingTo || undefined,
      });

      setComment('');
      setPriority('normal');
      setCategory(undefined);
      setReplyingTo(null);
      toast.success('Comment added');
    } catch (error) {
      console.error('[ClinicalComments] Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resolve
  const handleResolve = async (commentId: string) => {
    if (!user) return;
    try {
      await ClinicalCommentOps.resolve(
        commentId, 
        user.id, 
        `${user.firstName} ${user.lastName}`
      );
      toast.success('Comment marked as resolved');
    } catch (error) {
      console.error('[ClinicalComments] Error resolving comment:', error);
      toast.error('Failed to resolve comment');
    }
  };

  // Handle unresolve
  const handleUnresolve = async (commentId: string) => {
    try {
      await ClinicalCommentOps.unresolve(commentId);
      toast.success('Comment reopened');
    } catch (error) {
      console.error('[ClinicalComments] Error unresolving comment:', error);
      toast.error('Failed to reopen comment');
    }
  };

  // Handle delete
  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      await ClinicalCommentOps.delete(commentId);
      toast.success('Comment deleted');
    } catch (error) {
      console.error('[ClinicalComments] Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-gray-900">{title}</h3>
          {unresolvedCount > 0 && (
            <span className="bg-primary text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {unresolvedCount}
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {!collapsed && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Comment Input */}
          <div className="space-y-3">
            {replyingTo && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                <Reply className="h-4 w-4" />
                <span>Replying to comment</span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-auto text-gray-400 hover:text-gray-600"
                  title="Cancel reply"
                  aria-label="Cancel reply"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
            />

            <div className="flex flex-wrap items-center gap-3">
              {/* Priority Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Priority:</span>
                <div className="flex gap-1">
                  {(Object.keys(PRIORITY_CONFIG) as CommentPriority[]).map((p) => {
                    const config = PRIORITY_CONFIG[p];
                    const Icon = config.icon;
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`p-1.5 rounded transition-colors ${
                          priority === p 
                            ? `${config.bgColor} ${config.color}` 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                        title={config.label}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Selector */}
              <select
                value={category || ''}
                onChange={(e) => setCategory(e.target.value as ClinicalComment['category'] || undefined)}
                className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                title="Comment category"
                aria-label="Select comment category"
              >
                <option value="">Category (optional)</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <div className="flex-1" />

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!comment.trim() || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3">
            {!comments?.length && (
              <div className="text-center py-6 text-gray-500">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet</p>
                <p className="text-xs">Add a comment to provide additional context or emphasis</p>
              </div>
            )}

            {comments?.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                onReply={showResolveOption ? (id) => setReplyingTo(id) : undefined}
                onResolve={showResolveOption ? handleResolve : undefined}
                onUnresolve={showResolveOption ? handleUnresolve : undefined}
                onDelete={handleDelete}
                currentUserId={user?.id || ''}
                replies={getReplies(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalCommentsSection;
