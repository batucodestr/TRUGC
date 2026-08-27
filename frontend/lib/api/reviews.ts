// Değerlendirmeler API katmanı — gerçek Django REST endpoint'lerini sarar
// (bkz. lib/endpoints.ts) ve snake_case backend şekillerini uygulamanın
// camelCase `Review` tipine normalize eder.
//
// Bilinen kısıtlama: ReviewViewSet `reviewee`'ye (bir User pk) göre filtreler,
// ancak CreatorSerializer (apps/creators/serializers.py) hem Creator
// profilinin kendi pk'sini hem de ayrıca `user_id`'yi (altta yatan User id'si)
// sunar — bir creator'ın değerlendirmelerini ararken Creator'ın kendi `id`'si
// değil, buradaki `user_id`'yi geçirin.
import { apiClient } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Review } from "@/types";

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ApiReview {
  id: number;
  campaign_id: number;
  reviewer_email: string;
  reviewee_id: number;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
}

function normalizeReview(r: ApiReview): Review {
  return {
    id: String(r.id),
    authorName: r.reviewer_email,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    campaignId: String(r.campaign_id),
    revieweeId: String(r.reviewee_id),
  };
}

export async function listReviewsForReviewee(revieweeId: string | number): Promise<Review[]> {
  const endpoint = `${ENDPOINTS.reviews}?reviewee=${revieweeId}`;
  const page = await apiClient.get<Paginated<ApiReview>>(endpoint);
  return page.results.map(normalizeReview);
}

export async function listReviewsByReviewer(reviewerEmailOrId: string | number): Promise<Review[]> {
  const endpoint = `${ENDPOINTS.reviews}?reviewer=${reviewerEmailOrId}`;
  const page = await apiClient.get<Paginated<ApiReview>>(endpoint);
  return page.results.map(normalizeReview);
}

/**
 * Creates a review. Validated server-side: only an accepted creator on the campaign
 * (reviewing the brand) or the brand that ran the campaign (reviewing an accepted
 * creator) may post — see apps/reviews/serializers.py ReviewSerializer.validate.
 * No dedicated "leave a review" UI slot exists yet in the brand/creator dashboards
 * (no completed-campaign review CTA anywhere) — wiring one in is a UI-design task
 * left for later; this function exists so that UI can call straight into it.
 */
export async function createReview(campaignId: string | number, revieweeId: string | number, rating: number, comment: string): Promise<Review> {
  const created = await apiClient.post<ApiReview>(ENDPOINTS.reviews, {
    campaign_id: campaignId,
    reviewee_id: revieweeId,
    rating,
    comment,
  });
  return normalizeReview(created);
}
