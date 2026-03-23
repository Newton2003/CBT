export type OptionKey = "A" | "B" | "C" | "D";

export interface Question {
  id?: string;
  subject: string;
  topic: string;
  year: number;
  question: string;
  passage?: string;
  passageTitle?: string;
  options: Record<OptionKey, string>;
  answer: OptionKey | "";
  explanation: string;
  source?: string;
}

export type Mode = "practice" | "exam";
