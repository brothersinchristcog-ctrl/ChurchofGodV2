export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type TestamentScope = 'all' | 'ot' | 'nt';

export interface QuizOption {
  id: string; // e.g. 'a', 'b', 'c', 'd'
  text: string;
}

export interface QuizSubcategory {
  id: string; // e.g. 'historical_books', 'fruit_of_spirit'
  name: string; // e.g. 'Historical Books', 'Fruit of the Spirit'
  description?: string;
  topics?: string[];
}

export interface QuizCategory {
  id: string; // e.g. 'ot_studies', 'theology_doctrines'
  title: string;
  subtitle: string;
  icon: string; // Lucide icon name
  color: string; // Accent color hex
  testamentScope: 'all' | 'ot' | 'nt';
  order: number;
  subcategories: QuizSubcategory[];
}

export interface QuizTrack {
  id: string; // e.g. 'kids', 'youth', 'pastors', 'full_mastery'
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  defaultDifficulty: DifficultyLevel | 'mixed';
  recommendedCategoryIds?: string[];
  description: string;
}

export interface BibleQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  book: string;
  chapter: number;
  verse: string; // e.g. "3:16" or "16"
  verseReference: string; // e.g. "John 3:16"
  explanation: string;
  difficulty: DifficultyLevel;
  testament: 'ot' | 'nt';
  topic?: string;
  source?: 'bank' | 'admin' | 'ai';
  language?: 'en' | 'te';
  // Advanced Taxonomy fields
  categoryIds?: string[]; // Overlapping categories supported (e.g. ['bible_characters', 'christian_character'])
  subcategoryId?: string; // Specific subcategory id
  topicId?: string; // Specific topic id
  sourceTranslation?: string; // e.g. 'KJV', 'NKJV', 'NIV', 'ESV', 'Telugu-BSI'
  verificationStatus?: 'verified' | 'pending' | 'community';
}

export interface QuizFilterCriteria {
  testament: TestamentScope;
  book?: string;
  topic?: string;
  categoryId?: string;
  categoryTitle?: string;
  subcategoryId?: string;
  subcategoryTitle?: string;
  trackId?: string;
  difficulty: DifficultyLevel | 'mixed';
  questionCount: number; // 5, 10, 20
  timed?: boolean;
  timeLimitMinutes?: number;
}

export interface QuizAnswerRecord {
  questionId: string;
  questionText: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  options: QuizOption[];
  verseReference: string;
  explanation: string;
  book: string;
  chapter: number;
}

export interface QuizAttempt {
  id: string;
  uid?: string;
  quizId?: string;
  quizTitle: string;
  quizType: 'automatic' | 'daily' | 'admin';
  score: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  durationSeconds: number;
  completedAt: string; // ISO string
  answers: QuizAnswerRecord[];
  filterCriteria?: QuizFilterCriteria;
  memberName?: string;
  memberPhone?: string | null;
  memberPhotoUrl?: string | null;
  churchName?: string;
}

export interface QuizStats {
  totalQuizzesTaken: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalPoints?: number;
  averageAccuracy: number;
  bestScore: number;
  streakDays: number;
  lastPlayedDate: string | null;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  church?: string;
  points: number;
  completedCount: number;
  avatarUrl?: string;
  rank?: number;
  isCurrentUser?: boolean;
  averageAccuracy?: number;
  averageScore?: string;
}
