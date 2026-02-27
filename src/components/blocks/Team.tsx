"use client";

import { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Linkedin, Twitter, Github, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TEAM MEMBER
// Individual team member card
// =============================================================================

interface Social {
  type: "linkedin" | "twitter" | "github" | "email" | "custom";
  url: string;
  icon?: ReactNode;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string;
  bio?: string;
  social?: Social[];
}

interface TeamMemberCardProps {
  member: TeamMember;
  variant?: "default" | "horizontal" | "overlay" | "minimal";
  className?: string;
}

const socialIcons = {
  linkedin: Linkedin,
  twitter: Twitter,
  github: Github,
  email: Mail,
};

export function TeamMemberCard({
  member,
  variant = "default",
  className,
}: TeamMemberCardProps) {
  const renderSocial = (social: Social[]) => (
    <div className="flex gap-2">
      {social.map((item, i) => {
        const Icon = item.type === "custom" ? null : socialIcons[item.type];
        return (
          <a
            key={i}
            href={item.type === "email" ? `mailto:${item.url}` : item.url}
            target={item.type !== "email" ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
          >
            {item.icon || (Icon && <Icon className="w-4 h-4" />)}
          </a>
        );
      })}
    </div>
  );

  if (variant === "horizontal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={cn(
          "flex items-center gap-6 p-6 bg-card border rounded-xl",
          className
        )}
      >
        <div className="relative w-24 h-24 rounded-full overflow-hidden shrink-0">
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">{member.name}</h3>
          <p className="text-primary">{member.role}</p>
          {member.bio && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {member.bio}
            </p>
          )}
          {member.social && (
            <div className="mt-3">{renderSocial(member.social)}</div>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === "overlay") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className={cn(
          "relative group overflow-hidden rounded-xl aspect-[3/4]",
          className
        )}
      >
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h3 className="text-xl font-semibold">{member.name}</h3>
          <p className="text-white/80">{member.role}</p>
          {member.social && (
            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {member.social.map((item, i) => {
                const Icon =
                  item.type === "custom" ? null : socialIcons[item.type];
                return (
                  <a
                    key={i}
                    href={
                      item.type === "email" ? `mailto:${item.url}` : item.url
                    }
                    target={item.type !== "email" ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition-colors"
                  >
                    {item.icon || (Icon && <Icon className="w-4 h-4" />)}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  if (variant === "minimal") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={cn("text-center", className)}
      >
        <div className="relative w-32 h-32 rounded-full overflow-hidden mx-auto mb-4">
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="object-cover"
          />
        </div>
        <h3 className="font-semibold">{member.name}</h3>
        <p className="text-sm text-muted-foreground">{member.role}</p>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={cn("bg-card border rounded-xl overflow-hidden", className)}
    >
      <div className="relative aspect-square">
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold">{member.name}</h3>
        <p className="text-primary">{member.role}</p>
        {member.bio && (
          <p className="mt-3 text-sm text-muted-foreground">{member.bio}</p>
        )}
        {member.social && (
          <div className="mt-4 flex justify-center">
            {renderSocial(member.social)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// =============================================================================
// TEAM SECTION
// Full team section
// =============================================================================

interface TeamSectionProps {
  title?: string;
  description?: string;
  members: TeamMember[];
  columns?: 2 | 3 | 4;
  variant?: "default" | "horizontal" | "overlay" | "minimal";
  className?: string;
}

export function TeamSection({
  title = "Notre équipe",
  description,
  members,
  columns = 3,
  variant = "default",
  className,
}: TeamSectionProps) {
  const colStyles = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          )}
          {description && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        <div className={cn("grid gap-8", colStyles[columns])}>
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              variant={variant}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// TEAM CTA
// Team section with hiring CTA
// =============================================================================

interface TeamCTAProps {
  title?: string;
  description?: string;
  members: TeamMember[];
  cta?: { text: string; href: string };
  ctaTitle?: string;
  ctaDescription?: string;
  className?: string;
}

export function TeamCTA({
  title = "Notre équipe",
  description,
  members,
  cta = { text: "Voir les offres", href: "/careers" },
  ctaTitle = "Rejoignez-nous !",
  ctaDescription = "Nous recherchons des talents pour agrandir notre équipe.",
  className,
}: TeamCTAProps) {
  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          )}
          {description && (
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {members.slice(0, 3).map((member) => (
            <TeamMemberCard key={member.id} member={member} variant="minimal" />
          ))}

          {/* CTA Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-primary text-primary-foreground rounded-xl p-8 flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary-foreground/50 flex items-center justify-center text-3xl mb-4">
              +
            </div>
            <h3 className="text-lg font-semibold">{ctaTitle}</h3>
            <p className="mt-2 text-sm text-primary-foreground/80">
              {ctaDescription}
            </p>
            <a
              href={cta.href}
              className="mt-4 px-6 py-2 bg-background text-foreground rounded-lg font-medium hover:bg-background/90 transition-colors"
            >
              {cta.text}
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
