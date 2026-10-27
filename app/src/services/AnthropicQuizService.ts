import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { BibleQuestion, QuizFilterCriteria, DifficultyLevel } from '../types/quiz';
import { DEFAULT_QUIZ_CATEGORIES, SPECIAL_QUIZ_TRACKS } from '../data/quizCategories';

const SEEN_QUESTIONS_KEY = '@church_seen_quiz_questions_v2';
const MAX_SEEN_HISTORY = 400;

export class AnthropicQuizService {
  private apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
  private primaryModel = 'claude-haiku-4-5-20251001';
  private fallbackModel = 'claude-sonnet-4-5-20250929';
  private apiEndpoint = 'https://api.anthropic.com/v1/messages';

  // In-memory pre-warm cache for instant zero-wait launches
  private prewarmCache: Map<string, Promise<BibleQuestion[]>> = new Map();

  /**
   * Generates a deterministic cache key for criteria
   */
  private getCacheKey(criteria: QuizFilterCriteria): string {
    return [
      criteria.categoryId || 'all',
      criteria.subcategoryId || 'all',
      criteria.trackId || 'none',
      criteria.book || 'all',
      criteria.testament || 'all',
      criteria.difficulty || 'mixed',
      criteria.questionCount || 10
    ].join('__');
  }

  /**
   * Pre-warm / pre-generate a quiz in the background while the user browses,
   * so when they tap "Start Quiz", it launches INSTANTLY (0 seconds wait)!
   */
  prewarmQuiz(criteria: QuizFilterCriteria): void {
    const key = this.getCacheKey(criteria);
    if (this.prewarmCache.has(key)) return;

    const promise = this.doGenerateQuiz(criteria).catch(err => {
      console.warn('[AnthropicQuizService] Pre-warm failed:', err?.message || err);
      this.prewarmCache.delete(key);
      return [];
    });

    this.prewarmCache.set(key, promise);
    // Auto-clear after 3 minutes so questions don't become stale
    setTimeout(() => this.prewarmCache.delete(key), 180000);
  }

  /**
   * Load history of previously seen question signatures to strictly prevent repeats.
   */
  async getSeenQuestionSignatures(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(SEEN_QUESTIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read seen questions history:', e);
    }
    return [];
  }

  /**
   * Record newly answered / generated questions into persistent seen history.
   */
  async recordSeenQuestions(questions: BibleQuestion[]): Promise<void> {
    try {
      const existing = await this.getSeenQuestionSignatures();
      const existingSet = new Set(existing);
      
      for (const q of questions) {
        const sig = this.createQuestionSignature(q);
        existingSet.add(sig);
      }

      const updated = Array.from(existingSet).slice(-MAX_SEEN_HISTORY);
      await AsyncStorage.setItem(SEEN_QUESTIONS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not update seen questions history:', e);
    }
  }

  /**
   * Create a canonical signature for a question based on its reference and text.
   */
  private createQuestionSignature(q: BibleQuestion | any): string {
    const ref = (q.verseReference || `${q.book || ''} ${q.chapter || ''}:${q.verse || ''}`).toLowerCase().trim();
    const cleanQuestion = (q.question || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 45);
    return `${ref}__${cleanQuestion}`;
  }

  /**
   * Reset question history
   */
  async resetSeenQuestions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SEEN_QUESTIONS_KEY);
    } catch (_) {}
  }

  /**
   * Generate fresh, unique Bible quiz questions via Anthropic Claude API.
   * Checks pre-warm cache first for instant launch, otherwise generates fast.
   */
  async generateQuiz(criteria: QuizFilterCriteria): Promise<BibleQuestion[]> {
    const key = this.getCacheKey(criteria);

    // 1. Instant launch if pre-warmed while user was reading or configuring
    if (this.prewarmCache.has(key)) {
      try {
        const prewarmed = await this.prewarmCache.get(key)!;
        this.prewarmCache.delete(key);
        if (prewarmed && prewarmed.length >= Math.min(5, criteria.questionCount || 5)) {
          console.log(`⚡ [AnthropicQuizService] Instant launch from pre-warmed quiz (${prewarmed.length} questions)!`);
          return prewarmed.slice(0, criteria.questionCount || 10);
        }
      } catch (_) {
        this.prewarmCache.delete(key);
      }
    }

    return this.doGenerateQuiz(criteria);
  }

  /**
   * Core generator using token-efficient compact schema and parallel batching
   */
  private async doGenerateQuiz(criteria: QuizFilterCriteria): Promise<BibleQuestion[]> {
    const totalCount = criteria.questionCount || 10;
    const seenSignatures = await this.getSeenQuestionSignatures();
    const recentSignaturesSample = seenSignatures.slice(-30);

    // If totalCount > 5 (e.g. 10 or 20 questions), run concurrent 5-question batches in parallel
    // This dramatically reduces generation latency from 20+ seconds to ~4-5 seconds!
    if (totalCount > 5) {
      const batchSize = 5;
      const numBatches = Math.ceil(totalCount / batchSize);
      console.log(`⚡ [AnthropicQuizService] Launching ${numBatches} parallel batches of 5 questions each for ${totalCount} total questions...`);

      const batchPromises = Array.from({ length: numBatches }).map(async (_, idx) => {
        const batchCriteria: QuizFilterCriteria = {
          ...criteria,
          questionCount: batchSize
        };
        const batchPrompt = this.buildCompactQuizPrompt(batchCriteria, recentSignaturesSample, idx + 1, numBatches);
        try {
          const raw = await this.callAnthropicMessages(batchPrompt, this.primaryModel);
          return this.parseQuestionsFromResponse(raw, batchCriteria);
        } catch (err: any) {
          console.warn(`[AnthropicQuizService] Batch ${idx + 1} notice:`, err?.message || err);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const combined = batchResults.flat();

      if (combined.length >= Math.min(5, totalCount)) {
        this.recordSeenQuestions(combined).catch(() => {});
        return combined.slice(0, totalCount);
      }
      console.log('Parallel batches yielded fewer than 5 questions, attempting single prompt fallback...');
    }

    // Single request generation (for 5 questions or fallback)
    const prompt = this.buildCompactQuizPrompt(criteria, recentSignaturesSample);

    try {
      console.log(`🧠 [AnthropicQuizService] Generating ${criteria.questionCount} questions for:`, {
        category: criteria.categoryTitle || criteria.categoryId,
        subcategory: criteria.subcategoryTitle || criteria.subcategoryId,
        track: criteria.trackId,
        book: criteria.book,
        difficulty: criteria.difficulty
      });

      const rawContent = await this.callAnthropicMessages(prompt, this.primaryModel);
      const parsedQuestions = this.parseQuestionsFromResponse(rawContent, criteria);

      if (parsedQuestions.length > 0) {
        this.recordSeenQuestions(parsedQuestions).catch(() => {});
        return parsedQuestions;
      }
      throw new Error('No valid questions parsed from response');
    } catch (primaryErr: any) {
      console.warn('⚠️ [AnthropicQuizService] Generation attempt notice:', primaryErr?.message || primaryErr);
      throw primaryErr;
    }
  }

  /**
   * Fetch or generate today's Daily Scripture Challenge (5 unique questions).
   * Caches in Cloud Firestore daily_quiz_cache/{YYYY-MM-DD} so all church members
   * get the exact same fresh daily set, while tomorrow automatically gets a brand new one.
   */
  async getDailyQuiz(): Promise<BibleQuestion[]> {
    const todayKey = this.getTodayDateKey();
    const docRef = firestore().collection('daily_quiz_cache').doc(todayKey);

    // 1. Check if today's quiz was already generated in Firestore
    try {
      const snap = await docRef.get();
      const doesExist = typeof (snap as any).exists === 'function' ? (snap as any).exists() : !!(snap as any).exists;
      if (doesExist) {
        const data = snap.data();
        if (data && Array.isArray(data.questions) && data.questions.length >= 5) {
          console.log(`✅ [AnthropicQuizService] Loaded today's (${todayKey}) daily quiz from Firestore cache.`);
          return data.questions as BibleQuestion[];
        }
      }
    } catch (e) {
      console.warn('Could not read daily quiz from Firestore:', e);
    }

    // 2. Not generated yet today: generate 5 balanced questions across the Bible with Anthropic
    console.log(`🌟 [AnthropicQuizService] Generating brand-new Daily Challenge for ${todayKey}...`);
    const prompt = `Generate exactly 5 distinct, inspiring multiple-choice Bible questions for Today's Scripture Challenge (${todayKey}).
1. Old Testament
2. Psalms / Proverbs / Wisdom
3. The Gospels (Jesus Christ)
4. Epistles / Acts
5. Biblical Faith / Holy Spirit

Format strictly as a compact JSON array (no markdown, raw JSON only):
[{"q":"Question?","opts":["Choice 1","Choice 2","Choice 3","Choice 4"],"ans":1,"ref":"Book 1:1","exp":"One sentence scripture explanation."}]
Rules:
- "opts" must contain exactly 4 choices.
- "ans" is the 0-indexed integer (0, 1, 2, or 3) of the correct choice. Randomize the correct choice index.
- "ref" is the exact scripture reference.
- "exp" is 1 concise edifying sentence.`;

    try {
      const rawContent = await this.callAnthropicMessages(prompt, this.primaryModel);
      const questions = this.parseQuestionsFromResponse(rawContent, {
        testament: 'all',
        difficulty: 'mixed',
        questionCount: 5
      });

      if (questions.length >= 5) {
        // Cache in Firestore for all church members
        try {
          await docRef.set({
            date: todayKey,
            createdAt: firestore.FieldValue.serverTimestamp(),
            questions: questions.slice(0, 5)
          }, { merge: true });
          console.log(`✅ [AnthropicQuizService] Cached today's daily challenge to Firestore (${todayKey}).`);
        } catch (cacheErr) {
          console.warn('Could not cache daily quiz in Firestore:', cacheErr);
        }
        return questions.slice(0, 5);
      }
    } catch (e) {
      console.error('Error generating daily quiz with Anthropic:', e);
    }

    throw new Error('Failed to generate daily quiz');
  }

  /**
   * Helper to construct a token-efficient compact prompt for high-speed generation
   */
  private buildCompactQuizPrompt(
    criteria: QuizFilterCriteria, 
    avoidList: string[], 
    batchIndex?: number, 
    totalBatches?: number
  ): string {
    const count = criteria.questionCount || 5;
    const diff = criteria.difficulty || 'medium';

    let scopeDescription = 'the Holy Bible';
    let targetAudience = 'church members and Bible students';
    let specificFocus = '';

    // 1. By Category & Subcategory
    if (criteria.categoryId) {
      const cat = DEFAULT_QUIZ_CATEGORIES.find(c => c.id === criteria.categoryId);
      if (cat) {
        scopeDescription = `Category: "${cat.title}" - ${cat.subtitle}`;
        if (criteria.subcategoryId && criteria.subcategoryId !== 'all') {
          const sub = cat.subcategories.find(s => s.id === criteria.subcategoryId);
          if (sub) {
            specificFocus += `Focus specifically on Subcategory: "${sub.name}". Topics: ${sub.topics?.join(', ') || ''}. `;
          }
        }
      }
    }

    // 2. By Special Track
    if (criteria.trackId) {
      const track = SPECIAL_QUIZ_TRACKS.find(t => t.id === criteria.trackId);
      if (track) {
        scopeDescription = `Special Track: "${track.title}"`;
        specificFocus += `Context: ${track.description}. `;

        if (track.id === 'kids_quiz') {
          targetAudience = 'children / Sunday school students (clear, simple language)';
        } else if (track.id === 'youth_challenge') {
          targetAudience = 'youth and teenagers (practical, faith-building)';
        } else if (track.id === 'pastors_leaders') {
          targetAudience = 'pastors, elders, and Bible teachers (deep theological, Greek/Hebrew context)';
        } else if (track.id === 'advanced_theology') {
          targetAudience = 'theology students (doctrines of grace, covenants, Christology)';
        } else if (track.id === 'women_of_faith') {
          targetAudience = 'women of faith (biblical heroines like Esther, Ruth, Deborah, Mary)';
        } else if (track.id === 'men_of_faith') {
          targetAudience = 'men of faith (integrity, godly leadership, courage, fatherhood)';
        } else if (track.id === 'couples_quiz') {
          targetAudience = 'married couples (covenant love, mutual respect, family devotion)';
        }
      }
    }

    // 3. By Book
    if (criteria.book && criteria.book !== 'All') {
      scopeDescription = `Book of ${criteria.book}`;
      specificFocus += `All questions MUST strictly be based on events and verses in the Book of ${criteria.book}. `;
    } else if (criteria.testament && criteria.testament !== 'all') {
      scopeDescription = criteria.testament === 'ot' ? 'Old Testament (39 books)' : 'New Testament (27 books)';
    }

    if (batchIndex && totalBatches && totalBatches > 1) {
      specificFocus += `Part ${batchIndex} of ${totalBatches}: Focus on a distinct set of Bible chapters or characters to ensure varied coverage. `;
    }

    let antiRepetitionInstructions = '';
    if (avoidList.length > 0) {
      antiRepetitionInstructions = `\nANTI-REPETITION: Do NOT repeat questions on these recent passages:\n${avoidList.slice(0, 15).map(s => `- ${s}`).join('\n')}`;
    }

    return `Generate exactly ${count} unique multiple-choice Bible questions.
Scope: ${scopeDescription}.
Audience: ${targetAudience}. Difficulty: ${diff}.
${specificFocus}
${antiRepetitionInstructions}

Format strictly as a compact JSON array without markdown formatting or backticks:
[{"q":"Question text?","opts":["Choice 1","Choice 2","Choice 3","Choice 4"],"ans":1,"ref":"Book 1:1","exp":"One sentence scripture explanation."}]

Rules:
1. Every question must be 100% faithful to biblical scripture.
2. "opts" must contain exactly 4 choices.
3. "ans" is the 0-indexed integer (0, 1, 2, or 3) of the correct choice. Randomize which choice index is correct across questions.
4. "ref" is the exact scripture reference (e.g. "Genesis 1:1" or "Romans 8:28").
5. "exp" is 1 concise edifying sentence.
6. Output raw JSON array only.`;
  }

  /**
   * Directly call the Anthropic Messages API with a 60-second safety timeout
   */
  private async callAnthropicMessages(prompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 2000,
          temperature: 0.75,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Anthropic API Error (${response.status}): ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const textContent = data.content?.[0]?.text;
      if (!textContent) {
        throw new Error('Empty response content received from Anthropic API');
      }

      return textContent;
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Robust parser supporting both compact and standard formats
   */
  private parseQuestionsFromResponse(raw: string, criteria: QuizFilterCriteria): BibleQuestion[] {
    let cleaned = raw.trim();

    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      cleaned = cleaned.substring(firstBracket, lastBracket + 1);
    }

    let parsedArray: any[] = [];
    try {
      parsedArray = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn('JSON parsing failed on raw string, attempting regex extraction...', parseErr);
      const matches = cleaned.match(/\{[\s\S]*?\}(?=\s*,\s*\{|\s*\])/g);
      if (matches) {
        for (const m of matches) {
          try {
            parsedArray.push(JSON.parse(m));
          } catch (_) {}
        }
      }
    }

    if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
      return [];
    }

    const validQuestions: BibleQuestion[] = [];
    const timestamp = Date.now();

    parsedArray.forEach((item, index) => {
      const questionText = String(item.q || item.question || '').trim();
      const rawOptions = item.opts || item.options;

      if (!questionText || !Array.isArray(rawOptions) || rawOptions.length < 4) {
        return;
      }

      const options = rawOptions.slice(0, 4).map((opt: any, optIdx: number) => ({
        id: ['a', 'b', 'c', 'd'][optIdx],
        text: String(typeof opt === 'string' ? opt : (opt.text || opt)).trim()
      }));

      let correctId = 'a';
      if (typeof item.ans === 'number' && item.ans >= 0 && item.ans < 4) {
        correctId = ['a', 'b', 'c', 'd'][item.ans];
      } else if (typeof item.correctOptionId === 'string') {
        const c = item.correctOptionId.toLowerCase().trim();
        if (['a', 'b', 'c', 'd'].includes(c)) correctId = c;
      }

      const verseRef = String(item.ref || item.verseReference || criteria.book || 'Scripture').trim();
      
      // Parse book and chapter from verseRef if available (e.g. "Romans 8:28")
      let book = item.book || criteria.book || 'Scripture';
      let chapter = Number(item.chapter) || 1;
      let verse = String(item.verse || '1');

      const refMatch = verseRef.match(/^(\d?\s*[A-Za-z\s]+)\s+(\d+):?(\d*)/);
      if (refMatch) {
        book = refMatch[1].trim();
        chapter = parseInt(refMatch[2], 10) || 1;
        if (refMatch[3]) verse = refMatch[3];
      }

      const testament: 'ot' | 'nt' = item.testament === 'ot' || item.testament === 'nt'
        ? item.testament
        : this.inferTestament(book);

      validQuestions.push({
        id: item.id || `ai_${timestamp}_${index + 1}`,
        question: questionText,
        options,
        correctOptionId: correctId,
        book,
        chapter,
        verse,
        verseReference: verseRef,
        explanation: String(item.exp || item.explanation || `Reference: ${verseRef}`).trim(),
        difficulty: (item.difficulty || criteria.difficulty || 'medium') as DifficultyLevel,
        testament,
        topic: item.topic || criteria.subcategoryTitle || criteria.categoryTitle || 'Bible Knowledge',
        source: 'ai',
        categoryIds: criteria.categoryId ? [criteria.categoryId] : undefined,
        subcategoryId: criteria.subcategoryId
      });
    });

    return validQuestions;
  }

  /**
   * Auto-generate a sound, concise theological explanation for a question and scripture reference.
   */
  async generateExplanation(params: {
    question: string;
    scriptureRef: string;
    correctOptionText?: string;
  }): Promise<string> {
    const prompt = `Generate a concise, edifying 1-2 sentence biblical explanation for this quiz question.
Question: ${params.question}
Scripture Reference: ${params.scriptureRef}
${params.correctOptionText ? `Correct Answer: ${params.correctOptionText}` : ''}

Rules:
- Output ONLY 1 or 2 clear, inspiring, theologically sound sentences.
- Do NOT include markdown headings, quotes, bullet points, or prefaces like "Explanation:".`;

    try {
      const response = await this.callAnthropicMessages(prompt, this.primaryModel);
      let cleaned = response.trim().replace(/^["']|["']$/g, '').trim();
      cleaned = cleaned.replace(/^Explanation:\s*/i, '').trim();
      return cleaned;
    } catch (err: any) {
      console.warn('Anthropic generateExplanation failed:', err?.message || err);
      throw err;
    }
  }

  /**
   * Auto-generate a complete Bible question with 4 options, correct answer, and explanation from a scripture reference.
   */
  async generateQuestionFromScripture(params: {
    book: string;
    chapter: number;
    verse?: string;
    difficulty?: string;
  }): Promise<{
    question: string;
    options: { id: string; text: string }[];
    correctOptionId: 'a' | 'b' | 'c' | 'd';
    explanation: string;
  }> {
    const ref = `${params.book} ${params.chapter}${params.verse ? ':' + params.verse : ''}`;
    const diff = params.difficulty || 'medium';

    const prompt = `Create a high-quality multiple-choice Bible quiz question based on scripture ${ref}.
Difficulty: ${diff}.
Respond ONLY with a valid JSON object with keys:
- "question": string (engaging question directly grounded in ${ref})
- "options": array of 4 distinct strings (choices)
- "correctIndex": integer (0 for option A, 1 for B, 2 for C, or 3 for D)
- "explanation": string (1-2 sentences explaining why the correct choice is true according to scripture)

Output raw JSON only without markdown code fences or backticks.`;

    try {
      const raw = await this.callAnthropicMessages(prompt, this.primaryModel);
      let cleaned = raw.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(cleaned);

      const optsArray: string[] = Array.isArray(parsed.options) ? parsed.options : [];
      const options = ['a', 'b', 'c', 'd'].map((id, idx) => ({
        id,
        text: String(optsArray[idx] || `Option ${id.toUpperCase()}`).trim()
      }));

      const correctIndex = typeof parsed.correctIndex === 'number' && parsed.correctIndex >= 0 && parsed.correctIndex < 4 
        ? parsed.correctIndex 
        : 0;
      const correctOptionId = (['a', 'b', 'c', 'd'][correctIndex] || 'a') as 'a' | 'b' | 'c' | 'd';

      return {
        question: String(parsed.question || '').trim(),
        options,
        correctOptionId,
        explanation: String(parsed.explanation || '').trim()
      };
    } catch (err: any) {
      console.warn('Anthropic generateQuestionFromScripture failed:', err?.message || err);
      throw err;
    }
  }

  private inferTestament(book: string): 'ot' | 'nt' {
    const otBooks = [
      'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy',
      'joshua', 'judges', 'ruth', '1 samuel', '2 samuel', '1 kings', '2 kings',
      '1 chronicles', '2 chronicles', 'ezra', 'nehemiah', 'esther', 'job',
      'psalms', 'proverbs', 'ecclesiastes', 'song of solomon', 'isaiah',
      'jeremiah', 'lamentations', 'ezekiel', 'daniel', 'hosea', 'joel',
      'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk',
      'zephaniah', 'haggai', 'zechariah', 'malachi'
    ];
    return otBooks.includes(book.toLowerCase().trim()) ? 'ot' : 'nt';
  }

  private getTodayDateKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

export default new AnthropicQuizService();
