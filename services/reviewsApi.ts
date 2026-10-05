import { api } from './apiClient';

export interface PublicReview {
  id: number;
  rating: number;
  body: string;
  author: string;
  authorLevel: number;
  createdAt: string;
}

export interface ReviewsOverview {
  members: number;
  average: number;
  count: number;
  reviews: PublicReview[];
}

export interface MyReview {
  id: number;
  rating: number;
  body: string;
}

export const fetchReviews = () => api<ReviewsOverview>('GET', '/api/reviews');
export const fetchMyReview = () => api<{ review: MyReview | null }>('GET', '/api/reviews/mine');
export const saveMyReview = (rating: number, body: string) =>
  api<{ ok: true }>('POST', '/api/reviews', { rating, body });
export const deleteMyReview = () => api('DELETE', '/api/reviews');
