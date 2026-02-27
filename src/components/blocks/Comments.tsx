"use client";

import { useState, FormEvent } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ThumbsUp, MessageSquare, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// COMMENT
// Individual comment component
// =============================================================================

interface CommentAuthor {
  name: string;
  avatar?: string;
}

interface CommentData {
  id: string;
  author: CommentAuthor;
  content: string;
  date: string;
  likes?: number;
  replies?: CommentData[];
}

interface CommentProps {
  comment: CommentData;
  onReply?: (commentId: string, content: string) => void;
  onLike?: (commentId: string) => void;
  depth?: number;
  maxDepth?: number;
  className?: string;
}

export function Comment({
  comment,
  onReply,
  onLike,
  depth = 0,
  maxDepth = 3,
  className,
}: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  const handleReply = (e: FormEvent) => {
    e.preventDefault();
    if (replyContent.trim() && onReply) {
      onReply(comment.id, replyContent);
      setReplyContent("");
      setShowReplyForm(false);
    }
  };

  return (
    <div className={cn("group", className)}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {comment.author.avatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={comment.author.avatar}
                alt={comment.author.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
              {comment.author.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{comment.author.name}</span>
            <span className="text-sm text-muted-foreground">{comment.date}</span>
          </div>

          <p className="mt-2 text-muted-foreground">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => onLike?.(comment.id)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              {comment.likes && comment.likes > 0 && (
                <span>{comment.likes}</span>
              )}
            </button>

            {depth < maxDepth && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Répondre
              </button>
            )}

            <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleReply}
              className="mt-4"
            >
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Votre réponse..."
                className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowReplyForm(false)}
                  className="px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Répondre
                </button>
              </div>
            </motion.form>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-muted space-y-4">
              {comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onLike={onLike}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMMENT FORM
// Form to submit new comment
// =============================================================================

interface CommentFormProps {
  onSubmit: (content: string, author?: { name: string; email: string }) => void;
  requireAuth?: boolean;
  isLoggedIn?: boolean;
  userAvatar?: string;
  placeholder?: string;
  className?: string;
}

export function CommentForm({
  onSubmit,
  requireAuth = false,
  isLoggedIn = false,
  userAvatar,
  placeholder = "Ajouter un commentaire...",
  className,
}: CommentFormProps) {
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (requireAuth && !isLoggedIn) {
      if (!name.trim() || !email.trim()) return;
      onSubmit(content, { name, email });
    } else {
      onSubmit(content);
    }

    setContent("");
    setName("");
    setEmail("");
    setIsFocused(false);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {userAvatar ? (
            <div className="relative w-10 h-10 rounded-full overflow-hidden">
              <Image
                src={userAvatar}
                alt="Your avatar"
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <MessageSquare className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            className="w-full px-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={isFocused ? 3 : 1}
          />

          {/* Guest fields */}
          {isFocused && requireAuth && !isLoggedIn && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="grid md:grid-cols-2 gap-4 mt-4"
            >
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                className="px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                className="px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </motion.div>
          )}

          {/* Submit */}
          {isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end gap-2 mt-4"
            >
              <button
                type="button"
                onClick={() => {
                  setIsFocused(false);
                  setContent("");
                }}
                className="px-4 py-2 text-sm hover:bg-muted rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!content.trim()}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Publier
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </form>
  );
}

// =============================================================================
// COMMENTS SECTION
// Full comments section
// =============================================================================

interface CommentsSectionProps {
  comments: CommentData[];
  onAddComment?: (content: string, author?: { name: string; email: string }) => void;
  onReply?: (commentId: string, content: string) => void;
  onLike?: (commentId: string) => void;
  title?: string;
  requireAuth?: boolean;
  isLoggedIn?: boolean;
  userAvatar?: string;
  className?: string;
}

export function CommentsSection({
  comments,
  onAddComment,
  onReply,
  onLike,
  title = "Commentaires",
  requireAuth = false,
  isLoggedIn = false,
  userAvatar,
  className,
}: CommentsSectionProps) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {title} ({comments.length})
        </h2>
      </div>

      {/* Comment form */}
      {onAddComment && (
        <CommentForm
          onSubmit={onAddComment}
          requireAuth={requireAuth}
          isLoggedIn={isLoggedIn}
          userAvatar={userAvatar}
          className="mb-8"
        />
      )}

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <Comment
              key={comment.id}
              comment={comment}
              onReply={onReply}
              onLike={onLike}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucun commentaire pour l&apos;instant.</p>
          <p className="text-sm mt-1">Soyez le premier à commenter !</p>
        </div>
      )}
    </section>
  );
}
