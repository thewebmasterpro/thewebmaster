"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// BLOG POST CARD
// Individual blog post preview
// =============================================================================

interface Author {
  name: string;
  avatar?: string;
}

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime?: string;
  author?: Author;
  category?: string;
  tags?: string[];
}

interface BlogPostCardProps {
  post: BlogPost;
  variant?: "default" | "horizontal" | "featured" | "minimal";
  className?: string;
}

export function BlogPostCard({
  post,
  variant = "default",
  className,
}: BlogPostCardProps) {
  if (variant === "horizontal") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={cn("group", className)}
      >
        <Link
          href={`/blog/${post.slug}`}
          className="flex gap-6 items-center"
        >
          <div className="relative w-48 h-32 rounded-lg overflow-hidden shrink-0">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          </div>
          <div className="flex-1">
            {post.category && (
              <span className="text-sm text-primary font-medium">
                {post.category}
              </span>
            )}
            <h3 className="text-lg font-semibold mt-1 group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {post.date}
              </span>
              {post.readTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readTime}
                </span>
              )}
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  if (variant === "featured") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={cn("group relative overflow-hidden rounded-2xl", className)}
      >
        <Link href={`/blog/${post.slug}`} className="block">
          <div className="relative aspect-[2/1]">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            {post.category && (
              <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full mb-4">
                {post.category}
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-bold">{post.title}</h2>
            <p className="mt-3 text-white/80 line-clamp-2">{post.excerpt}</p>
            <div className="flex items-center gap-4 mt-4">
              {post.author && (
                <div className="flex items-center gap-2">
                  {post.author.avatar && (
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="text-sm">{post.author.name}</span>
                </div>
              )}
              <span className="text-sm text-white/70">{post.date}</span>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  if (variant === "minimal") {
    return (
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={cn("group", className)}
      >
        <Link href={`/blog/${post.slug}`} className="block py-4 border-b">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{post.date}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </div>
        </Link>
      </motion.article>
    );
  }

  // Default card
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn("group bg-card border rounded-xl overflow-hidden", className)}
    >
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          {post.category && (
            <span className="absolute top-3 left-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
              {post.category}
            </span>
          )}
        </div>
        <div className="p-6">
          <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
          <p className="mt-2 text-muted-foreground text-sm line-clamp-2">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between mt-4">
            {post.author && (
              <div className="flex items-center gap-2">
                {post.author.avatar && (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src={post.author.avatar}
                      alt={post.author.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {post.author.name}
                </span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">{post.date}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

// =============================================================================
// BLOG GRID
// Grid layout for blog posts
// =============================================================================

interface BlogGridProps {
  posts: BlogPost[];
  columns?: 2 | 3;
  featuredFirst?: boolean;
  className?: string;
}

export function BlogGrid({
  posts,
  columns = 3,
  featuredFirst = false,
  className,
}: BlogGridProps) {
  const colStyles = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
  };

  if (featuredFirst && posts.length > 0) {
    const [featured, ...rest] = posts;
    return (
      <div className={className}>
        <BlogPostCard post={featured} variant="featured" className="mb-8" />
        <div className={cn("grid gap-8", colStyles[columns])}>
          {rest.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-8", colStyles[columns], className)}>
      {posts.map((post) => (
        <BlogPostCard key={post.slug} post={post} />
      ))}
    </div>
  );
}

// =============================================================================
// BLOG LIST
// List layout for blog posts
// =============================================================================

interface BlogListProps {
  posts: BlogPost[];
  variant?: "default" | "minimal";
  className?: string;
}

export function BlogList({
  posts,
  variant = "default",
  className,
}: BlogListProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {posts.map((post) => (
        <BlogPostCard
          key={post.slug}
          post={post}
          variant={variant === "minimal" ? "minimal" : "horizontal"}
        />
      ))}
    </div>
  );
}

// =============================================================================
// BLOG SIDEBAR
// Sidebar with widgets
// =============================================================================

interface BlogSidebarProps {
  recentPosts?: BlogPost[];
  categories?: { name: string; count: number; href: string }[];
  tags?: { name: string; href: string }[];
  newsletter?: boolean;
  className?: string;
}

export function BlogSidebar({
  recentPosts,
  categories,
  tags,
  newsletter = true,
  className,
}: BlogSidebarProps) {
  return (
    <aside className={cn("space-y-8", className)}>
      {/* Recent Posts */}
      {recentPosts && recentPosts.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Articles récents</h3>
          <div className="space-y-4">
            {recentPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="flex gap-3 group"
              >
                <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.date}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Catégories</h3>
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category.name}>
                <Link
                  href={category.href}
                  className="flex justify-between items-center py-2 text-sm hover:text-primary transition-colors"
                >
                  <span>{category.name}</span>
                  <span className="text-muted-foreground">({category.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.name}
                href={tag.href}
                className="px-3 py-1 bg-muted text-sm rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Newsletter */}
      {newsletter && (
        <div className="bg-primary text-primary-foreground rounded-xl p-6">
          <h3 className="font-semibold">Newsletter</h3>
          <p className="text-sm text-primary-foreground/80 mt-2">
            Recevez nos derniers articles par email.
          </p>
          <form className="mt-4 space-y-3">
            <input
              type="email"
              placeholder="Votre email"
              className="w-full px-4 py-2 rounded-lg bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-foreground/50"
            />
            <button
              type="submit"
              className="w-full py-2 bg-background text-foreground rounded-lg font-medium hover:bg-background/90 transition-colors"
            >
              S&apos;inscrire
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}

// =============================================================================
// BLOG SECTION
// Full blog section with title
// =============================================================================

interface BlogSectionProps {
  title?: string;
  description?: string;
  posts: BlogPost[];
  columns?: 2 | 3;
  viewAllLink?: string;
  viewAllText?: string;
  className?: string;
}

export function BlogSection({
  title = "Notre Blog",
  description,
  posts,
  columns = 3,
  viewAllLink,
  viewAllText = "Voir tous les articles",
  className,
}: BlogSectionProps) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            {description && (
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              {viewAllText}
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <BlogGrid posts={posts} columns={columns} />
      </div>
    </section>
  );
}
