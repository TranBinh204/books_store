'use client';

import { useSnackbar } from 'notistack';
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IconSend } from '@/components/ui/icons';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { CurrentUser } from '@/features/auth';
import { useFetchRecommendations } from '@/features/recommendation';
import { errorMessage } from '@/lib/form';
import { useChatHistory, useClearChat, useSendChatMessage } from '../hooks/useChat';
import type { BubbleSide } from '../hooks/useDraggableBubble';
import type { ChatMessage } from '../types';
import styles from './Chat.module.css';
import { ChatMessageItem, TypingIndicator, type ChatItem } from './ChatMessageItem';

/** Thùng rác nét mảnh */
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);

const RECOMMEND_LABEL = 'Gợi ý sách cho tôi';
const ORDERS_QUESTION = 'Đơn hàng gần đây của tôi';
const BUSY_FALLBACK = 'Trợ lý đang bận một chút, bạn thử lại sau ít phút nhé.';

/** Tin tạm ở client (không lưu DB), hiện ngay sau tin đã lưu có id `afterId` (0 = trước mọi tin) */
interface LocalItem {
  afterId: number;
  item: ChatItem;
}

let localSeq = 0;
const localKey = () => `local-${++localSeq}`;

const toItem = (message: ChatMessage): ChatItem => ({
  key: `msg-${message.id}`,
  role: message.role,
  content: message.content,
  books: message.books,
});

/** Tên gọi trong câu chào: chữ cuối của họ tên ("Bùi Anh Tuấn" → "Tuấn") */
const givenName = (fullName: string) => fullName.trim().split(/\s+/).at(-1) ?? '';

export function ChatPanel({
  user,
  side,
  isMobile,
  onClose,
}: {
  user: CurrentUser;
  side: BubbleSide;
  isMobile: boolean;
  onClose: () => void;
}) {
  const { enqueueSnackbar } = useSnackbar();
  const history = useChatHistory(true);
  const send = useSendChatMessage();
  const clear = useClearChat();
  const fetchRecommendations = useFetchRecommendations();
  const [input, setInput] = useState('');
  const [localItems, setLocalItems] = useState<LocalItem[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  /** Đang tải tin cũ hơn → giữ nguyên chỗ đang đọc thay vì cuộn xuống cuối */
  const keepScroll = useRef<{ height: number; top: number } | null>(null);

  const firstPage = history.data?.pages[0];
  const aiEnabled = firstPage?.aiEnabled ?? true;
  const maxLength = firstPage?.maxMessageLength;
  const serverMessages = (history.data?.pages ?? [])
    .slice()
    .reverse()
    .flatMap((page) => page.messages);
  const lastServerId = serverMessages.at(-1)?.id ?? 0;

  // Ghép tin đã lưu + tin tạm theo đúng thứ tự xuất hiện
  const items: ChatItem[] = [
    ...localItems.filter((local) => local.afterId === 0).map((local) => local.item),
    ...serverMessages.flatMap((message) => [
      toItem(message),
      ...localItems.filter((local) => local.afterId === message.id).map((local) => local.item),
    ]),
  ];
  const pendingText = send.isPending ? send.variables : null;
  const busy = send.isPending || loadingRecommendations;

  const addLocal = (...added: ChatItem[]) =>
    setLocalItems((current) => [
      ...current,
      ...added.map((item) => ({ afterId: lastServerId, item })),
    ]);

  // Tin mới → cuộn xuống cuối · vừa tải tin cũ → giữ chỗ đang đọc
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    if (keepScroll.current) {
      list.scrollTop = list.scrollHeight - keepScroll.current.height + keepScroll.current.top;
      keepScroll.current = null;
    } else {
      list.scrollTop = list.scrollHeight;
    }
  }, [items.length, pendingText, loadingRecommendations]);

  const loadOlder = () => {
    const list = listRef.current;
    if (list) keepScroll.current = { height: list.scrollHeight, top: list.scrollTop };
    void history.fetchNextPage();
  };

  const sendText = (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    send.mutate(message, {
      onSuccess: (result) => {
        if (result.source === 'busy') {
          addLocal(
            { key: localKey(), role: 'user', content: message, books: [], failed: true },
            { key: localKey(), role: 'assistant', content: result.answer.content, books: [] },
          );
        }
      },
      onError: (error) => {
        enqueueSnackbar(errorMessage(error), { variant: 'error' });
        setInput(message);
      },
    });
  };

  const retry = (failed: ChatItem) => {
    // Bỏ tin lỗi + câu "đang bận" ngay sau nó rồi gửi lại
    setLocalItems((current) => {
      const index = current.findIndex((local) => local.item.key === failed.key);
      return index < 0 ? current : current.filter((_, i) => i !== index && i !== index + 1);
    });
    sendText(failed.content);
  };

  const askFaq = (question: string, answer: string) =>
    addLocal(
      { key: localKey(), role: 'user', content: question, books: [] },
      { key: localKey(), role: 'assistant', content: answer, books: [] },
    );

  const askRecommendations = async () => {
    if (busy) return;
    addLocal({ key: localKey(), role: 'user', content: RECOMMEND_LABEL, books: [] });
    setLoadingRecommendations(true);
    try {
      const { items: recommendations } = await fetchRecommendations();
      addLocal({
        key: localKey(),
        role: 'assistant',
        content:
          recommendations.length > 0
            ? 'Đây là những cuốn mình thấy hợp với bạn nè:'
            : 'Chưa có sách phù hợp để gợi ý, bạn khai báo thêm sở thích đọc sách hoặc quay lại sau nhé!',
        books: recommendations.map((recommendation) => recommendation.book),
        reasons: Object.fromEntries(
          recommendations.map((recommendation) => [recommendation.book.id, recommendation.reason]),
        ),
      });
    } catch {
      addLocal({ key: localKey(), role: 'assistant', content: BUSY_FALLBACK, books: [] });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    // Enter gửi · Shift+Enter xuống dòng · đang gõ dấu (Telex / VNI) thì không gửi
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendText(input);
    }
  };

  const closeOnMobile = isMobile ? onClose : undefined;
  const chips = [
    ...(firstPage?.faqs.map((faq) => ({
      key: `faq-${faq.id}`,
      label: faq.question,
      disabled: false,
      onClick: () => askFaq(faq.question, faq.answer),
    })) ?? []),
    {
      key: 'recommend',
      label: RECOMMEND_LABEL,
      disabled: busy,
      onClick: () => void askRecommendations(),
    },
    ...(aiEnabled
      ? [
          {
            key: 'orders',
            label: ORDERS_QUESTION,
            disabled: busy,
            onClick: () => sendText(ORDERS_QUESTION),
          },
        ]
      : []),
  ];

  return (
    <section
      aria-label="Pháp sư thủ thư — trợ lý BookStore"
      className={`${styles.panel} ${side === 'left' ? styles.left : styles.right}`}
    >
      <header className={styles.top}>
        <span className={styles.miniBall} aria-hidden="true" />
        <div>
          <b>Pháp sư thủ thư</b>
          <small>{busy ? 'đang lật sách tìm câu trả lời…' : 'đang chờ câu hỏi của bạn…'}</small>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.topBtn}
            title="Xoá cuộc trò chuyện"
            aria-label="Xoá cuộc trò chuyện"
            disabled={serverMessages.length === 0 && localItems.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <IconTrash />
          </button>
          <button type="button" className={styles.topBtn} aria-label="Đóng" onClick={onClose}>
            ×
          </button>
        </div>
      </header>

      <div ref={listRef} className={styles.body}>
        {history.hasNextPage && (
          <button
            type="button"
            className={styles.older}
            onClick={loadOlder}
            disabled={history.isFetchingNextPage}
          >
            {history.isFetchingNextPage ? 'Đang lật trang cũ…' : 'Xem tin nhắn cũ hơn'}
          </button>
        )}

        <ChatMessageItem
          item={{
            key: 'greeting',
            role: 'assistant',
            content: `Chào lữ khách ${givenName(user.fullName)} ✦ Ta có thể tìm giúp ngươi cuốn sách định mệnh, gợi ý theo sở thích hay xem các đơn hàng gần đây. Hãy hỏi ta.`,
            books: [],
          }}
        />

        {history.isPending && <p className={styles.note}>Đang mở sổ ghi chép…</p>}
        {history.isError && (
          <p className={styles.note}>
            Không tải được cuộc trò chuyện.{' '}
            <button type="button" className={styles.older} onClick={() => void history.refetch()}>
              Thử lại
            </button>
          </p>
        )}

        {items.map((item) => (
          <ChatMessageItem
            key={item.key}
            item={item}
            onRetry={item.failed && aiEnabled ? () => retry(item) : undefined}
            onNavigate={closeOnMobile}
          />
        ))}

        {pendingText && (
          <ChatMessageItem
            item={{ key: 'pending', role: 'user', content: pendingText, books: [] }}
          />
        )}
        {busy && <TypingIndicator />}
      </div>

      <div className={styles.chips}>
        {chips.map((chip) => (
          <button key={chip.key} type="button" disabled={chip.disabled} onClick={chip.onClick}>
            {chip.label}
          </button>
        ))}
      </div>

      {aiEnabled ? (
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            sendText(input);
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Thì thầm câu hỏi…"
            rows={1}
            maxLength={maxLength}
            autoFocus={!isMobile}
            aria-label="Tin nhắn"
          />
          <button
            type="submit"
            className={styles.send}
            aria-label="Gửi"
            disabled={!input.trim() || busy}
          >
            <IconSend />
          </button>
        </form>
      ) : (
        <p className={styles.hint}>
          Pháp sư đang tạm nghỉ — bạn dùng các câu hỏi có sẵn ở trên nhé.
        </p>
      )}
      <p className={styles.hint}>
        Pháp sư có thể nhầm — giá &amp; tồn kho trên thẻ sách là chính xác.
      </p>

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        loading={clear.isPending}
        chapter="✦ Pháp sư thủ thư"
        title={
          <>
            Xoá <em>cuộc trò chuyện</em>?
          </>
        }
        message="Toàn bộ tin nhắn với trợ lý sẽ bị xoá và không khôi phục được."
        onConfirm={() =>
          clear.mutate(undefined, {
            onSuccess: () => {
              setLocalItems([]);
              setConfirmClear(false);
            },
            onError: (error) => enqueueSnackbar(errorMessage(error), { variant: 'error' }),
          })
        }
      />
    </section>
  );
}
