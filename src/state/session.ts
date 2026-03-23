import { create } from "zustand";
import { Mode, OptionKey, Question } from "../types";

type QuestionWithId = Question & { id: string };
type AnswerMap = Record<string, OptionKey>;

interface SessionState {
  questions: QuestionWithId[];
  topicsBySubject: Record<string, string[]>;
  loading: boolean;
  subject: string;
  topic: string;
  mode: Mode;
  currentIndex: number;
  answers: AnswerMap;
  setMode: (mode: Mode) => void;
  setFilters: (subject: string, topic: string) => void;
  select: (id: string, choice: OptionKey) => void;
  goTo: (idx: number) => void;
  reset: () => void;
  replaceQuestions: (questions: Question[]) => void;
  loadRemote: () => Promise<void>;
  restoreProgress: (subject: string, topic: string, currentIndex: number, answers: AnswerMap) => void;
}

const hydrate = (raw: Question[]): QuestionWithId[] => raw.map((q, i) => ({ ...q, id: q.id || `q-${i}` }));

export const useSessionStore = create<SessionState>((set, get) => ({
  questions: [],
  topicsBySubject: {},
  loading: false,
  subject: "All",
  topic: "All",
  mode: "practice",
  currentIndex: 0,
  answers: {},
  setMode: (mode) => set({ mode }),
  setFilters: (subject, topic) => set({ subject, topic, currentIndex: 0 }),
  select: (id, choice) =>
    set((state) => ({
      answers: { ...state.answers, [id]: choice }
    })),
  goTo: (idx) => set({ currentIndex: idx }),
  reset: () => set({ currentIndex: 0, answers: {} }),
  replaceQuestions: (questions) =>
    set({
      questions: hydrate(questions),
      currentIndex: 0,
      answers: {}
    }),
  restoreProgress: (subject, topic, currentIndex, answers) =>
    set({
      subject,
      topic,
      currentIndex,
      answers
    }),
  loadRemote: async () => {
    if (get().loading || get().questions.length) return;
    set({ loading: true });
    const [qRes, tRes] = await Promise.all([fetch("/data/questions.json"), fetch("/data/topics.json")]);
    const data = (await qRes.json()) as Question[];
    const topics = (await tRes.json()) as Record<string, string[]>;
    set({
      questions: hydrate(data),
      topicsBySubject: topics || {},
      loading: false,
      currentIndex: 0,
      answers: {}
    });
  }
}));
