import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import { LoadingIndicator } from "@openai/apps-sdk-ui/components/Indicator";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { useState, useEffect } from "react";

const STORAGE_KEY = "flashcards-view";

type CardStatus = "new" | "learning" | "mastered";

type Card = {
  id: string;
  front: string;
  back: string;
  hint: string;
  status: CardStatus;
};

type Deck = {
  id: string;
  title: string;
  description: string;
  cards: Card[];
  createdAt: string;
  masteredCount?: number;
};

type DeckListView = {
  type: "list";
  decks: Deck[];
  username: string;
};

type StudyView = {
  type: "study";
  deck: Deck;
  username: string;
  deckId: string;
};

type View = DeckListView | StudyView | null;

const STATUS_BADGE: Record<CardStatus, { label: string; color: "secondary" | "success" | "warning" }> = {
  new: { label: "New", color: "secondary" },
  learning: { label: "Learning", color: "warning" },
  mastered: { label: "Mastered", color: "success" },
};

function DeckCard({ deck, onStudy }: { deck: Deck; onStudy: () => void }) {
  const total = deck.cards.length;
  const mastered = deck.masteredCount ?? deck.cards.filter((c) => c.status === "mastered").length;
  const progress = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[var(--color-text-primary)] font-semibold text-sm leading-tight truncate">
            {deck.title}
          </h3>
          <p className="text-[var(--color-text-secondary)] text-xs mt-1 line-clamp-2">
            {deck.description}
          </p>
        </div>
        <Badge color="info" variant="soft" size="sm" pill>
          {total} cards
        </Badge>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-[var(--color-text-secondary)]">
          <span>Progress</span>
          <span>{mastered}/{total} mastered</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-success-base)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <Button color="primary" variant="solid" size="sm" block onClick={onStudy}>
        Study
      </Button>
    </div>
  );
}

function DeckListScreen({ view, onStudy }: { view: DeckListView; onStudy: (deck: Deck) => void }) {
  if (view.decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
        <div className="text-3xl">📚</div>
        <p className="text-[var(--color-text-primary)] font-semibold text-sm">No decks yet</p>
        <p className="text-[var(--color-text-secondary)] text-xs">
          Ask ChatGPT to create a flashcard deck to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[var(--color-text-primary)] font-semibold text-sm">
          {view.username}'s Decks
        </h2>
        <Badge color="secondary" variant="soft" size="sm" pill>
          {view.decks.length}
        </Badge>
      </div>
      <div className="flex flex-col gap-2">
        {view.decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onStudy={() => onStudy(deck)}
          />
        ))}
      </div>
    </div>
  );
}

function FlashCard({
  card,
  index,
  total,
  onMark,
  isMarking,
}: {
  card: Card;
  index: number;
  total: number;
  onMark: (status: "learning" | "mastered") => void;
  isMarking: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const badge = STATUS_BADGE[card.status];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-[var(--color-text-secondary)] text-xs">
          Card {index + 1} of {total}
        </span>
        <Badge color={badge.color} variant="soft" size="sm" pill>
          {badge.label}
        </Badge>
      </div>

      {/* Card face */}
      <div
        className="rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-5 min-h-36 flex flex-col items-center justify-center gap-3 cursor-pointer select-none"
        onClick={() => { setFlipped(!flipped); setShowHint(false); }}
        role="button"
        aria-label={flipped ? "Show question" : "Show answer"}
      >
        {!flipped ? (
          <div className="text-center flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-medium">
              Question
            </p>
            <p className="text-[var(--color-text-primary)] text-sm font-medium leading-relaxed">
              {card.front}
            </p>
            {showHint && (
              <p className="text-[var(--color-text-secondary)] text-xs italic mt-1 px-4">
                💡 {card.hint}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-text-tertiary)] font-medium">
              Answer
            </p>
            <p className="text-[var(--color-text-primary)] text-sm font-medium leading-relaxed">
              {card.back}
            </p>
          </div>
        )}
        {!flipped && (
          <p className="text-[var(--color-text-tertiary)] text-[10px] mt-1">Tap to reveal answer</p>
        )}
      </div>

      {/* Hint & actions */}
      <div className="flex flex-col gap-2">
        {!flipped && card.hint && (
          <Button
            color="secondary"
            variant="ghost"
            size="xs"
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? "Hide hint" : "Show hint 💡"}
          </Button>
        )}
        {flipped && (
          <div className="flex gap-2">
            <div className="flex-1">
              <Button
                color="warning"
                variant="soft"
                size="sm"
                block
                disabled={isMarking}
                onClick={() => onMark("learning")}
              >
                Still Learning
              </Button>
            </div>
            <div className="flex-1">
              <Button
                color="success"
                variant="solid"
                size="sm"
                block
                disabled={isMarking}
                onClick={() => onMark("mastered")}
              >
                Mastered ✓
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StudyScreen({
  view,
  app,
  onStudyUpdate,
}: {
  view: StudyView;
  app: ReturnType<typeof useApp>["app"];
  onStudyUpdate: (deck: Deck) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMarking, setIsMarking] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const { deck, username, deckId } = view;
  const cards = deck.cards;
  const card = cards[currentIndex];

  const mastered = cards.filter((c) => c.status === "mastered").length;
  const learning = cards.filter((c) => c.status === "learning").length;
  const newCount = cards.filter((c) => c.status === "new").length;
  const progress = cards.length > 0 ? Math.round((mastered / cards.length) * 100) : 0;

  async function handleMark(status: "learning" | "mastered") {
    if (!app || isMarking) return;
    setIsMarking(true);
    try {
      await app.callServerTool({
        name: "mark-card",
        arguments: { username, deckId, cardId: card.id, status },
      });
    } finally {
      setIsMarking(false);
      onStudyUpdate({
        ...deck,
        cards: deck.cards.map((c) => (c.id === card.id ? { ...c, status } : c)),
      });
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  }

  async function handleReset() {
    if (!app || isResetting) return;
    setIsResetting(true);
    try {
      const result = await app.callServerTool({
        name: "reset-deck",
        arguments: { username, deckId },
      });
      if (!result.isError && result.structuredContent) {
        const updated = (result.structuredContent as { deck: Deck }).deck;
        onStudyUpdate(updated);
        setCurrentIndex(0);
      }
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Header */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-[var(--color-text-primary)] font-semibold text-sm truncate">
          {deck.title}
        </h2>
        <p className="text-[var(--color-text-secondary)] text-xs line-clamp-1">
          {deck.description}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1 px-1">
        <div className="h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--color-success-base)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-3 text-xs">
          <span className="text-[var(--color-text-secondary)]">
            <span className="text-[var(--color-text-tertiary)]">New</span> {newCount}
          </span>
          <span className="text-[var(--color-warning-base)]">
            <span className="text-[var(--color-text-tertiary)]">Learning</span> {learning}
          </span>
          <span className="text-[var(--color-success-base)]">
            <span className="text-[var(--color-text-tertiary)]">Mastered</span> {mastered}
          </span>
        </div>
      </div>

      {/* Card */}
      {card && (
        <FlashCard
          key={card.id}
          card={card}
          index={currentIndex}
          total={cards.length}
          onMark={handleMark}
          isMarking={isMarking}
        />
      )}

      {/* Navigation */}
      <div className="flex gap-2 px-1">
        <Button
          color="secondary"
          variant="outline"
          size="xs"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
        >
          ← Prev
        </Button>
        <Button
          color="secondary"
          variant="outline"
          size="xs"
          disabled={currentIndex === cards.length - 1}
          onClick={() => setCurrentIndex(currentIndex + 1)}
        >
          Next →
        </Button>
        <div className="flex-1" />
        <Button
          color="danger"
          variant="ghost"
          size="xs"
          loading={isResetting}
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>

      {mastered === cards.length && cards.length > 0 && (
        <div className="rounded-xl bg-[var(--color-success-subtle)] border border-[var(--color-success-border)] p-4 text-center">
          <p className="text-[var(--color-success-base)] font-semibold text-sm">
            🎉 All cards mastered!
          </p>
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">
            Great work. Reset the deck to practice again.
          </p>
        </div>
      )}
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as View) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (view) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(view)); } catch {}
    }
  }, [view]);

  const { app } = useApp({
    appInfo: { name: "Flashcards Client", version: "1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolresult = (result) => {
        const sc = result.structuredContent as Record<string, unknown> | undefined;
        if (!sc) return;

        if ("decks" in sc) {
          setView({
            type: "list",
            decks: sc.decks as Deck[],
            username: sc.username as string,
          });
        } else if ("deck" in sc && "deckId" in sc) {
          setView({
            type: "study",
            deck: sc.deck as Deck,
            username: sc.username as string,
            deckId: sc.deckId as string,
          });
        } else if ("deck" in sc && !("deckId" in sc)) {
          // create-deck returns { deck, username } — go straight to study
          const deck = sc.deck as Deck;
          setView({
            type: "study",
            deck,
            username: sc.username as string,
            deckId: deck.id,
          });
        }
      };
    },
  });

  useHostStyles(app, app?.getHostContext());

  if (!view) {
    return (
      <div className="flex items-center justify-center min-h-16 py-6">
        <LoadingIndicator size={32} />
      </div>
    );
  }

  if (view.type === "list") {
    return (
      <DeckListScreen
        view={view}
        onStudy={(deck) =>
          setView({ type: "study", deck, username: view.username, deckId: deck.id })
        }
      />
    );
  }

  return (
    <StudyScreen
      view={view}
      app={app}
      onStudyUpdate={(updatedDeck) => {
        setView((prev) =>
          prev?.type === "study" ? { ...prev, deck: updatedDeck } : prev
        );
      }}
    />
  );
}

export default App;
