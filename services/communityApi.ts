import { api } from './apiClient';

export type Topic = 'general' | 'question' | 'astuce' | 'alerte';
export const TOPICS: Topic[] = ['general', 'question', 'astuce', 'alerte'];

export interface LeaderboardEntry {
  rank: number;
  name: string;
  title: string;
  level: number;
  points: number;
  certificates: number;
  isMe: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  me: { rank: number | null; points: number; level: number; visible: boolean };
}

export interface CommunityComment {
  id: number;
  body: string;
  createdAt: string;
  author: string;
  mine: boolean;
}

export interface CommunityPost {
  id: number;
  topic: Topic;
  body: string;
  createdAt: string;
  author: string;
  authorTitle: string;
  authorLevel: number;
  likes: number;
  liked: boolean;
  reportedByMe: boolean;
  /** Nombre de signalements : renseigné uniquement pour les modérateurs. */
  reports?: number;
  mine: boolean;
  comments: CommunityComment[];
}

export const fetchLeaderboard = () => api<LeaderboardResponse>('GET', '/api/leaderboard');

export const setLeaderboardVisibility = (visible: boolean) =>
  api('PATCH', '/api/me', { settings: { showInLeaderboard: visible } });

export const fetchPosts = (topic: Topic | 'all', before?: number) => {
  const params = new URLSearchParams();
  if (topic !== 'all') params.set('topic', topic);
  if (before) params.set('before', String(before));
  const query = params.toString();
  return api<{ posts: CommunityPost[]; canModerate: boolean }>(
    'GET',
    `/api/community/posts${query ? `?${query}` : ''}`,
  );
};

export const createPost = (body: string, topic: Topic) =>
  api<{ id: number }>('POST', '/api/community/posts', { body, topic });

export const createComment = (postId: number, body: string) =>
  api<{ id: number }>('POST', '/api/community/comments', { postId, body });

export const toggleLike = (postId: number) =>
  api<{ liked: boolean; likes: number }>('POST', '/api/community/like', { postId });

export const reportPost = (postId: number) =>
  api<{ reported: boolean }>('POST', '/api/community/report', { postId });

export const deletePost = (id: number) => api('DELETE', `/api/community/posts?id=${id}`);
export const deleteComment = (id: number) => api('DELETE', `/api/community/comments?id=${id}`);
