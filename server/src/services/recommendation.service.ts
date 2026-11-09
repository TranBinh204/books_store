import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { chatJson } from '../lib/ai/groq';
import { buildRecommendMessages, parseRecommendResponse } from '../lib/ai/recommend-prompt';
import * as preferenceRepository from '../repositories/preference.repository';
import * as recommendationRepository from '../repositories/recommendation.repository';
import type { CachedPick } from '../repositories/recommendation.repository';
import type { PublicBookListItem } from '../types/catalog.types';
import { toPublicItem } from './book.service';

// AI gợi ý sách (F20) — docs/03-modules/15-ai.md mục 3.2 & 6
// DB chọn ứng viên → AI chỉ chọn lại & giải thích trong danh sách đó → server lọc lại kết quả AI.

/** Số tên sách "khách đã thích" gửi kèm cho AI */
const LIKED_TITLES_FOR_AI = 10;

export interface Recommendation {
  book: PublicBookListItem;
  /** Lý do AI viết — null khi là kết quả dự phòng */
  reason: string | null;
}

export interface RecommendationResult {
  /** ai: có lý do · fallback: AI lỗi / chưa cấu hình → xếp theo điểm DB */
  source: 'ai' | 'fallback';
  generatedAt: Date;
  items: Recommendation[];
}

/** Hồ sơ sở thích: tự khai + suy từ hành vi */
async function loadProfile(userId: number) {
  const [preference, categories, authors, signals] = await Promise.all([
    preferenceRepository.findByUser(userId),
    preferenceRepository.listCategories(userId),
    preferenceRepository.listAuthors(userId),
    recommendationRepository.findBehaviorSignals(userId),
  ]);
  const likedIds = [
    ...new Set([...signals.boughtIds, ...signals.wishlistIds, ...signals.reviewedIds]),
  ];
  const note = preference?.note ?? '';
  return {
    categories,
    authors,
    note,
    signals,
    likedIds,
    // Hồ sơ hoặc cấu hình đổi → băm khác → không dùng lại cache
    hash: createHash('sha256')
      .update(
        JSON.stringify({
          categoryIds: categories.map((c) => c.id).sort((a, b) => a - b),
          authorIds: authors.map((a) => a.id).sort((a, b) => a - b),
          note,
          signals,
          size: env.RECOMMEND_RESULT_SIZE,
          candidates: env.RECOMMEND_CANDIDATES,
        }),
      )
      .digest('hex'),
  };
}

type Profile = Awaited<ReturnType<typeof loadProfile>>;

/** Đổi danh sách {bookId, reason} → thẻ sách đọc lại từ DB (bỏ sách đã ẩn / hết hàng) */
async function toRecommendations(picks: CachedPick[]): Promise<Recommendation[]> {
  const cards = await recommendationRepository.findPublicCards(picks.map((p) => p.bookId));
  const byId = new Map(cards.map((card) => [card.id, card]));
  return picks.flatMap((pick) => {
    const card = byId.get(pick.bookId);
    return card ? [{ book: toPublicItem(card), reason: pick.reason }] : [];
  });
}

/** Hỏi AI; lỗi / không chọn được cuốn hợp lệ nào → null (dùng dự phòng) */
async function askAi(
  profile: Profile,
  candidates: recommendationRepository.Candidate[],
): Promise<{ picks: CachedPick[]; model: string } | null> {
  if (!env.aiEnabled) return null;
  try {
    const likedTitles = await recommendationRepository.findTitles(
      profile.likedIds,
      LIKED_TITLES_FOR_AI,
    );
    const { content, model } = await chatJson(
      buildRecommendMessages(
        {
          categories: profile.categories.map((c) => c.name),
          authors: profile.authors.map((a) => a.name),
          note: profile.note,
          likedTitles,
        },
        candidates,
        env.RECOMMEND_RESULT_SIZE,
      ),
    );
    const picks = parseRecommendResponse(
      content,
      candidates.map((c) => c.id),
      env.RECOMMEND_RESULT_SIZE,
      env.RECOMMEND_REASON_MAX_LENGTH,
    );
    if (picks.length === 0) {
      console.warn(`AI gợi ý sách (${model}) không trả cuốn hợp lệ nào → dùng dự phòng`);
      return null;
    }
    return { picks, model };
  } catch (err) {
    console.error(
      'AI gợi ý sách thất bại → dùng dự phòng:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function generate(userId: number, profile: Profile): Promise<RecommendationResult> {
  const candidates = await recommendationRepository.listCandidates({
    preferredCategoryIds: profile.categories.map((c) => c.id),
    preferredAuthorIds: profile.authors.map((a) => a.id),
    likedIds: profile.likedIds,
    excludeIds: [...new Set([...profile.signals.boughtIds, ...profile.signals.wishlistIds])],
    limit: env.RECOMMEND_CANDIDATES,
    descriptionMaxLength: env.RECOMMEND_DESCRIPTION_MAX_LENGTH,
  });

  const ai = candidates.length > 0 ? await askAi(profile, candidates) : null;
  if (!ai) {
    // Dự phòng: top ứng viên theo điểm DB, không lưu cache (AI hoạt động lại → có lý do ngay)
    const picks = candidates
      .slice(0, env.RECOMMEND_RESULT_SIZE)
      .map((c) => ({ bookId: c.id, reason: null }));
    return { source: 'fallback', generatedAt: new Date(), items: await toRecommendations(picks) };
  }

  // AI chọn ít hơn số cần → bù ứng viên điểm cao (không có lý do)
  const chosen = new Set(ai.picks.map((p) => p.bookId));
  const picks: CachedPick[] = [
    ...ai.picks,
    ...candidates
      .filter((c) => !chosen.has(c.id))
      .slice(0, Math.max(0, env.RECOMMEND_RESULT_SIZE - ai.picks.length))
      .map((c) => ({ bookId: c.id, reason: null })),
  ];
  const generatedAt = await recommendationRepository.saveCache(userId, {
    profileHash: profile.hash,
    items: picks,
    model: ai.model,
  });
  return { source: 'ai', generatedAt, items: await toRecommendations(picks) };
}

/** Gợi ý của tôi — dùng lại cache khi hồ sơ không đổi & chưa quá RECOMMEND_CACHE_HOURS */
export async function getRecommendations(userId: number): Promise<RecommendationResult> {
  const [profile, cache] = await Promise.all([
    loadProfile(userId),
    recommendationRepository.findCache(userId),
  ]);
  const fresh =
    cache &&
    cache.profileHash === profile.hash &&
    Date.now() - cache.createdAt.getTime() < env.RECOMMEND_CACHE_HOURS * 3600 * 1000;
  if (fresh) {
    return {
      source: 'ai',
      generatedAt: cache.createdAt,
      items: await toRecommendations(cache.items),
    };
  }
  return generate(userId, profile);
}

/** "Gợi ý lại" — bỏ qua cache */
export async function refreshRecommendations(userId: number): Promise<RecommendationResult> {
  return generate(userId, await loadProfile(userId));
}
