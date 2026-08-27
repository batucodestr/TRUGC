// Core domain types for the Influencer Marketplace platform.
// These mirror the shape a future Django REST API is expected to return.

export type UserRole = "brand" | "creator" | "admin";

export type SocialPlatform = "instagram" | "tiktok" | "youtube" | "twitch";

export interface SocialStat {
  platform: SocialPlatform;
  handle: string;
  followers: number;
  engagementRate: number; // percentage, e.g. 4.8
  /** Not present on the real backend's SocialAccount (only `profile_url`, mapped here when set). */
  url?: string;
}

export type CreatorCategory =
  | "Fashion"
  | "Beauty"
  | "Fitness"
  | "Food"
  | "Travel"
  | "Gaming"
  | "Tech"
  | "Lifestyle"
  | "Music"
  | "Comedy"
  | "Business"
  | "Parenting";

export interface PortfolioItem {
  id: string;
  imageUrl?: string;
  title: string;
  brand?: string;
  /** Backend has no like/view counters on portfolio items — cosmetic mock-only stats. */
  likes?: number;
  views?: number;
  /** Present when backed by the real API's PortfolioItem (kind: "portfolio" | "media_kit"). */
  kind?: "portfolio" | "media_kit";
  description?: string;
  externalUrl?: string;
  platform?: SocialPlatform | string;
}

export interface Review {
  id: string;
  authorName: string;
  /** ReviewSerializer exposes no avatar — mock-only. */
  authorAvatar?: string;
  /** ReviewSerializer doesn't tell us whether the reviewer was the brand or the creator. */
  authorRole?: UserRole;
  rating: number; // 1-5
  comment: string;
  createdAt: string; // ISO date
  campaignTitle?: string;
  /** Present when backed by the real API — the campaign/reviewee ids needed to identify the review. */
  campaignId?: string;
  revieweeId?: string;
}

export interface CreatorPackage {
  id: string;
  title: string;
  description: string;
  price: number;
  deliverables: string[];
  turnaroundDays: number;
  popular?: boolean;
}

export interface Creator {
  id: string;
  /** The underlying User id (distinct from `id`, the Creator profile's own pk) — needed to filter reviews by reviewee, since ReviewViewSet filters on the User pk. */
  userId?: string;
  /** No slug on the real backend — set to `String(id)` when backed by the real API, kept as a distinct field so link-building code (`/creators/${creator.slug}`) doesn't need to change. */
  slug: string;
  name: string;
  /** No username field on the backend — derived from the email local-part when backed by the real API. */
  username?: string;
  avatarUrl: string;
  coverUrl: string;
  verified: boolean;
  /** Cosmetic tiering the backend has no concept of. */
  tier?: "new" | "rising" | "top" | "elite";
  categories: CreatorCategory[];
  /** Backend Creator has no location fields. */
  country?: string;
  city?: string;
  bio: string;
  /** Backend has no languages field. */
  languages?: string[];
  /** Backend has no pricing field. */
  startingPrice?: number;
  /** Backend has no response-time field. */
  responseTime?: string;
  /** Backend has no completed-collabs counter. */
  completedCollabs?: number;
  /** Backend has no rating aggregate. */
  rating?: number;
  reviewCount?: number;
  socials: SocialStat[];
  portfolio: PortfolioItem[];
  /** Backend has no packages/pricing-tier concept. */
  packages?: CreatorPackage[];
  /** Reviews live in a separate `apps/reviews` app on the backend, not nested under Creator. */
  reviews?: Review[];
  joinedAt: string;
  featured?: boolean;
  /** Present when backed by the real API. */
  totalFollowers?: number;
  averageEngagementRate?: number;
  isAvailable?: boolean;
}

export interface Brand {
  id: string;
  /** The underlying User id — needed for admin moderation actions (suspend/ban/delete the account). */
  userId?: string;
  email?: string;
  /** No slug on the real backend — set to `String(id)` when backed by the real API. */
  slug: string;
  name: string;
  logoUrl: string;
  coverUrl: string;
  industry: string;
  verified: boolean;
  website: string;
  bio: string;
  /** Backend has no active-campaigns counter on Brand. */
  activeCampaigns?: number;
  /** Backend has no total-spend aggregate. */
  totalSpent?: number;
  /** Backend has no rating aggregate. */
  rating?: number;
  reviewCount?: number;
  /** Backend has `headquarters` instead of a structured country field. */
  country?: string;
  joinedAt: string;
  featured?: boolean;
  /** Present when backed by the real API. */
  companySize?: string;
  foundedYear?: number;
}

// Backend CampaignStatus choices (apps/campaigns/models.py CampaignStatus).
export type CampaignStatus = "draft" | "published" | "in_progress" | "completed" | "cancelled";

export interface CampaignDeliverable {
  id?: number;
  platform: SocialPlatform | "";
  description: string; // e.g. "2x Instagram Reel"
  quantity: number;
  order?: number;
}

export interface CampaignMediaItem {
  id: number;
  url: string;
  caption?: string;
}

export interface Campaign {
  id: string;
  /** No real slug on the backend (numeric id only) — kept as String(id) so existing [slug] routes keep working. */
  slug: string;
  title: string;
  brandId: string;
  brandName: string;
  /** Not returned by CampaignSerializer — the backend has no denormalized brand logo/verified flag here. */
  brandLogoUrl?: string;
  brandVerified?: boolean;
  /** Derived from the first campaign media file, if any were uploaded. */
  coverUrl?: string;
  status: CampaignStatus;
  /** M2M category names (was a single `category` string in the old mock shape). */
  categories: string[];
  /** Campaign.platform is a single choice field on the backend, not an array. */
  platform: SocialPlatform;
  /** Back-compat convenience for UI that iterates multiple platforms; always `[platform]` here. */
  platforms: SocialPlatform[];
  budgetMin: number;
  budgetMax: number;
  description: string;
  /** Plain free-text guidelines field on Campaign (not a list) — split on newlines for bullet display. */
  requirements: string;
  /** Structured deliverables from the CampaignRequirement sub-resource. */
  deliverables: CampaignDeliverable[];
  media: CampaignMediaItem[];
  /** Not exposed by the API — no applicant-count/spots-available aggregate on Campaign. */
  applicantsCount?: number;
  spotsAvailable?: number;
  startDate?: string;
  /** No distinct `end_date` on the backend — deadline doubles as the campaign end. */
  endDate?: string;
  applicationDeadline: string;
  createdAt: string;
  /** Not modeled on the backend. */
  location?: string;
}

// Backend ApplicationStatus choices (apps/applications/models.py ApplicationStatus).
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Application {
  id: string;
  /** ApplicationSerializer only exposes `campaign_id` write-only; no numeric campaign id comes back on read. */
  campaignId?: string;
  campaignTitle: string;
  /** Not returned by the API — no denormalized campaign cover on Application. */
  campaignCoverUrl?: string;
  /** Not returned by the API — only `creator_name` is exposed, no numeric creator id. */
  creatorId?: string;
  creatorName: string;
  /** Not returned by the API. */
  creatorAvatarUrl?: string;
  brandId: string;
  /** Not returned by the API — only `brand_id` is exposed. */
  brandName?: string;
  status: ApplicationStatus;
  proposedPrice?: number;
  message: string;
  appliedAt: string;
  updatedAt?: string;
  reviewedAt?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  /** Absent when the backend can't classify the content type. */
  type?: "image" | "file" | "video";
  url: string;
  /** The real backend doesn't expose a file size, so this is mock-data only. */
  size?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  reacted?: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  /** MessageSerializer exposes `sender_email` only — no numeric sender id, so this is the email. */
  senderId: string;
  senderName: string;
  /** Not returned by MessageSerializer — mock-only, real messages fall back to initials. */
  senderAvatar?: string;
  text: string;
  createdAt: string;
  attachments?: MessageAttachment[];
  /** No reaction concept on the backend — mock-only, purely client-side/ephemeral when live. */
  reactions?: MessageReaction[];
  isOwn?: boolean;
  /** True once loaded via a real fetch (used to gate UI for concepts the backend doesn't support). */
  isRead?: boolean;
}

export interface Conversation {
  id: string;
  /** ConversationSerializer has no single "other participant" concept — the id of whichever participant isn't the current user, once resolved. */
  participantId: string;
  participantName: string;
  /** Not returned by ConversationSerializer — mock-only, real conversations fall back to initials. */
  participantAvatar?: string;
  participantRole: UserRole;
  lastMessage: string;
  lastMessageAt: string;
  /** Not precomputed by the backend. Derived client-side per-conversation is expensive (see lib/api/messages.ts), so this is 0 for real data — no per-conversation unread badge. */
  unreadCount: number;
  /** No presence concept on the backend. */
  online?: boolean;
  /** Conversation.campaign is a nullable FK with no denormalized title on ConversationSerializer. */
  campaignTitle?: string;
  /** Present when backed by the real API — the underlying campaign id, if any. */
  campaignId?: string;
}

export interface Transaction {
  id: string;
  type: "payout" | "payment" | "refund" | "fee";
  amount: number;
  status: "completed" | "pending" | "failed";
  description: string;
  counterparty: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  /** Renamed from the old mock's `description` — matches Notification.body on the backend. */
  body: string;
  createdAt: string;
  /** Renamed from the old mock's `read` — matches Notification.is_read on the backend. */
  isRead: boolean;
  /** Backend NotificationType choices: application/message/campaign/review/payment/system. */
  type: "message" | "application" | "payment" | "system" | "campaign" | "review";
  /** Frontend deep-link path, present on the real API. */
  link?: string;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole | "moderator";
  status: "active" | "suspended" | "pending" | "banned";
  joinedAt: string;
  lastLoginAt: string | null;
  verified: boolean;
  banReason?: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  role: UserRole;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  documentType: string;
}

export interface AdminReport {
  id: string;
  reporterName: string;
  targetName: string;
  targetType: "creator" | "brand" | "campaign" | "message";
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: "month" | "year";
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  avatarUrl: string;
  quote: string;
  rating: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}
