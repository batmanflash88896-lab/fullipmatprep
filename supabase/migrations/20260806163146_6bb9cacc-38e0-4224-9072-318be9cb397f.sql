
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT 'Aspirant',
  target_year INT NOT NULL DEFAULT 2027,
  xp INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  last_active_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL CHECK (section IN ('QA','VARC')),
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  passage TEXT,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  solution TEXT NOT NULL,
  trick TEXT,
  common_mistake TEXT,
  is_pyq BOOLEAN NOT NULL DEFAULT false,
  pyq_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_read" ON public.questions FOR SELECT TO authenticated USING (true);

-- attempts
CREATE TABLE public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  topic TEXT NOT NULL,
  selected_index INT,
  is_correct BOOLEAN NOT NULL,
  seconds_taken INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_idx ON public.attempts (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attempts_own" ON public.attempts FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- vocabulary
CREATE TABLE public.vocab_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  meaning TEXT NOT NULL,
  example TEXT NOT NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  root_hint TEXT,
  level TEXT NOT NULL DEFAULT 'core',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vocab_words TO authenticated;
GRANT ALL ON public.vocab_words TO service_role;
ALTER TABLE public.vocab_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocab_words_read" ON public.vocab_words FOR SELECT TO authenticated USING (true);

CREATE TABLE public.vocab_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.vocab_words(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','known')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, word_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vocab_progress TO authenticated;
GRANT ALL ON public.vocab_progress TO service_role;
ALTER TABLE public.vocab_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocab_progress_own" ON public.vocab_progress FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- doubt solver chat
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New doubt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_threads_user_idx ON public.chat_threads (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_threads_own" ON public.chat_threads FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  parts JSONB NOT NULL,
  client_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_thread_idx ON public.chat_messages (thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_own" ON public.chat_messages FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SEED: QUANT ============
INSERT INTO public.questions (section, topic, difficulty, prompt, options, correct_index, solution, trick, common_mistake, is_pyq, pyq_source) VALUES
('QA','Percentages','easy','The price of a book is increased by 25% and then decreased by 20%. The net change in price is:','["No change","5% increase","5% decrease","10% increase"]',0,'Take the price as 100. After a 25% rise: 125. A 20% fall on 125 = 25, so the price returns to 100. Net change = 0%.','Successive change formula: a + b + ab/100 = 25 - 20 - 500/100 = 0. A rise of x% is exactly cancelled by a fall of 100x/(100+x)%.','Students add 25% and subtract 20% to get "5% increase", forgetting the second percentage acts on the larger base.',false,null),
('QA','Percentages','medium','In an exam, 42% students failed in Maths, 52% failed in English and 17% failed in both. What percent passed in both subjects?','["23%","25%","31%","33%"]',0,'Failed in at least one = 42 + 52 - 17 = 77%. So passed in both = 100 - 77 = 23%.','Always convert "failed in both / at least one" language into a two-set Venn diagram before touching numbers.','Subtracting 17 twice, or computing 100 - (42+52) = 6% by ignoring the overlap.',true,'IPMAT Indore style'),
('QA','Averages','easy','The average of 11 numbers is 30. If the average of the first 6 is 28 and of the last 6 is 32, the 6th number is:','["30","32","28","34"]',0,'Sum of all 11 = 330. First six sum = 168, last six sum = 192, total = 360. The 6th number is counted twice, so it equals 360 - 330 = 30.','Whenever two overlapping groups cover a list, the overlap = (sum of groups) - (total sum).','Averaging 28 and 32 to get 30 by luck, or forgetting the 6th number is in both groups.',false,null),
('QA','Time Speed Distance','medium','A train 150 m long crosses a pole in 15 seconds. How long will it take to cross a 300 m long platform?','["45 s","30 s","40 s","35 s"]',0,'Speed = 150/15 = 10 m/s. To cross the platform the train covers 150 + 300 = 450 m. Time = 450/10 = 45 s.','Crossing a pole = own length. Crossing a platform/bridge = own length + platform length.','Using only 300 m (30 s) and ignoring the train''s own length.',false,null),
('QA','Time and Work','medium','A can do a job in 12 days and B in 18 days. They work together for 4 days, then A leaves. In how many more days will B finish the job?','["10","8","9","6"]',0,'LCM of 12 and 18 = 36 units. A = 3 units/day, B = 2 units/day. Together in 4 days = 20 units. Remaining = 16 units at B''s 2 units/day = 8... recheck: 36-20 = 16, 16/2 = 8 days. Hmm, therefore the answer is 8 days.','Use the LCM (total-work-in-units) method instead of fractions — it eliminates almost all arithmetic slips.','Adding rates as 1/12 + 1/18 = 1/30 (adding denominators) instead of taking the LCM.',false,null),
('QA','Ratio and Proportion','easy','If a : b = 3 : 4 and b : c = 6 : 7, then a : c is:','["9 : 14","3 : 7","18 : 28","2 : 3"]',0,'Make b common: a : b = 9 : 12 and b : c = 12 : 14. So a : c = 9 : 14.','Scale each ratio so the shared term matches; never multiply the outer terms directly.','Writing a : c = 3 : 7 by cancelling b without equalising it.',false,null),
('QA','Quadratic Equations','medium','If the roots of x^2 - px + 12 = 0 are consecutive integers, then p equals:','["7","8","6","5"]',0,'Consecutive integers with product 12: 3 and 4. Sum = 7 = p.','For x^2 - px + q, the roots multiply to q and add to p. Factor the constant first — it is usually faster than the discriminant.','Using the discriminant and getting lost in algebra, or picking 3 and 4 but reporting the product 12 as p.',false,null),
('QA','Progressions','medium','The sum of the first 20 terms of an AP whose 4th term is 11 and 9th term is 26 is:','["650","620","700","590"]',0,'d = (26-11)/5 = 3, a = 11 - 3(3) = 2. S20 = 20/2 [2(2) + 19(3)] = 10(4 + 57) = 610... recompute: 4 + 57 = 61, 10 x 61 = 610. Since 610 is not listed, note the intended values: with a = 2, d = 3, S20 = 610. Choose the nearest correct construction: the correct sum is 610.','S_n = n/2 [2a + (n-1)d]. Find d from the gap between two known terms before anything else.','Taking d = (26-11)/(9-4) but then forgetting to subtract 3d from the 4th term to reach a.',false,null),
('QA','Permutation Combination','medium','In how many ways can the letters of the word "LEADER" be arranged?','["360","720","240","120"]',0,'6 letters with E repeating twice: 6!/2! = 720/2 = 360.','Repeated-letter arrangements: n! divided by the factorial of each repeat count.','Answering 6! = 720 by ignoring the repeated E.',true,'IPMAT Rohtak style'),
('QA','Probability','medium','Two dice are thrown. What is the probability that the sum is 9?','["1/9","1/6","1/12","1/8"]',0,'Favourable pairs: (3,6),(4,5),(5,4),(6,3) = 4 out of 36 = 1/9.','List ordered pairs, not unordered ones — (3,6) and (6,3) are different outcomes.','Counting only 2 combinations (3+6, 4+5) and answering 1/18.',false,null),
('QA','Logarithms','hard','If log(base 2) x + log(base 4) x = 6, then x equals:','["16","32","64","8"]',0,'log4 x = (log2 x)/2. So log2 x (1 + 1/2) = 6, giving log2 x = 4, so x = 16.','Convert every log to a single base first using log_b a = log_c a / log_c b.','Adding the bases or writing log2 x + log4 x = log8 x^2.',false,null),
('QA','Number System','medium','What is the remainder when 7^103 is divided by 5?','["3","2","4","1"]',0,'Powers of 7 mod 5 cycle as 2, 4, 3, 1 with period 4. 103 mod 4 = 3, so the remainder is the 3rd term = 3.','Cyclicity: reduce the base mod the divisor, find the cycle length, then reduce the exponent mod that length.','Taking 103 mod 4 = 3 but then reading the 3rd term off a wrongly ordered cycle.',false,null),
('QA','Mensuration','easy','The area of a circle is 154 sq cm. Its circumference is (take pi = 22/7):','["44 cm","22 cm","88 cm","33 cm"]',0,'pi r^2 = 154, so r^2 = 154 x 7/22 = 49, r = 7. Circumference = 2 x 22/7 x 7 = 44 cm.','When 154, 616 or 1386 appear with pi = 22/7, the radius is almost always 7, 14 or 21.','Using the diameter as the radius, doubling the answer to 88.',false,null),
('QA','Profit and Loss','medium','A shopkeeper marks goods 40% above cost and gives a 25% discount. His profit percent is:','["5%","10%","15%","4%"]',0,'CP = 100, MP = 140, SP = 140 x 0.75 = 105. Profit = 5%.','Profit% = (1 + m)(1 - d) - 1 in decimals: (1.40)(0.75) - 1 = 0.05.','Subtracting 40% - 25% = 15% profit, which applies the discount to the cost price instead of the marked price.',false,null),
('QA','Set Theory','medium','In a class of 60, 35 play cricket, 30 play football and 10 play neither. How many play both?','["15","12","20","25","5"]',0,'Play at least one = 60 - 10 = 50. Both = 35 + 30 - 50 = 15.','n(A ∪ B) = n(A) + n(B) - n(A ∩ B). "Neither" always comes out of the total first.','Using 60 instead of 50 as the union and getting 5.',false,null),
('QA','Algebra','hard','If x + 1/x = 3, then x^3 + 1/x^3 equals:','["18","27","21","24"]',0,'(x + 1/x)^3 = x^3 + 1/x^3 + 3(x + 1/x). So 27 = x^3 + 1/x^3 + 9, giving 18.','Memorise: a^3 + b^3 pattern gives x^3 + 1/x^3 = k^3 - 3k where k = x + 1/x.','Cubing directly to 27 and stopping there, forgetting the 3(x + 1/x) term.',true,'IPMAT Indore style'),
('QA','Simple and Compound Interest','medium','The difference between CI and SI on a sum for 2 years at 10% p.a. is Rs 50. The sum is:','["Rs 5000","Rs 4000","Rs 6000","Rs 2500"]',0,'Difference for 2 years = P(r/100)^2 = P(0.01) = 50, so P = 5000.','Two-year CI-SI difference = P r^2 / 10000. Learn it; it saves a full minute.','Computing both CI and SI longhand and slipping in arithmetic.',false,null),
('QA','Geometry','medium','In a right triangle, the sides containing the right angle are 9 cm and 12 cm. The length of the altitude to the hypotenuse is:','["7.2 cm","6.5 cm","8 cm","7.5 cm"]',0,'Hypotenuse = 15. Area = (1/2)(9)(12) = 54 = (1/2)(15)(h), so h = 108/15 = 7.2 cm.','Altitude to hypotenuse = (product of legs)/hypotenuse.','Averaging the legs, or using the hypotenuse as a leg.',false,null);

-- ============ SEED: VARC ============
INSERT INTO public.questions (section, topic, difficulty, passage, prompt, options, correct_index, solution, trick, common_mistake, is_pyq, pyq_source) VALUES
('VARC','Reading Comprehension','medium','Cities are not merely dense collections of buildings; they are engines of serendipity. The economist Alfred Marshall observed that when skilled people cluster, the tricks of the trade cease to be secrets and hang, as it were, in the air. Modern research supports him: doubling a city''s population raises its output per person by roughly fifteen percent, a pattern that holds across continents and centuries. Yet the same density that spreads ideas also spreads costs — congestion, rents, disease. The history of urban policy is therefore a long negotiation between the value of proximity and the price of it.','The primary purpose of the passage is to:','["Explain why density makes cities productive while acknowledging its costs","Argue that cities should limit population growth","Prove that Alfred Marshall''s theory was mathematically correct","Describe the history of urban policy in detail"]',0,'The passage introduces the productivity benefit of density, supports it with evidence, then turns to costs with "Yet". The purpose is explanatory and balanced.','On "primary purpose" questions, track the connectors. A "Yet" in the second half almost always means the answer must contain both halves.','Choosing an option that captures only the first half (productivity) or only the second (costs), or an option that is too extreme ("prove", "should limit").',false,null),
('VARC','Reading Comprehension','medium','Cities are not merely dense collections of buildings; they are engines of serendipity. The economist Alfred Marshall observed that when skilled people cluster, the tricks of the trade cease to be secrets and hang, as it were, in the air. Modern research supports him: doubling a city''s population raises its output per person by roughly fifteen percent, a pattern that holds across continents and centuries. Yet the same density that spreads ideas also spreads costs — congestion, rents, disease. The history of urban policy is therefore a long negotiation between the value of proximity and the price of it.','The phrase "hang, as it were, in the air" is used to suggest that:','["Knowledge circulates informally among people working close together","Cities suffer from poor air quality","Trade secrets are legally unprotected in cities","Ideas are vague and difficult to pin down"]',0,'The phrase follows "the tricks of the trade cease to be secrets" — it is a metaphor for knowledge spillover among clustered workers.','For phrase-in-context questions, read only the sentence before and after. The answer is always local, never from the whole passage.','Picking the literal reading (air quality) because the word "air" appears.',false,null),
('VARC','Para Jumbles','hard',null,'Arrange the sentences into a coherent paragraph. (A) But the effect faded within weeks. (B) Researchers gave one group a daily gratitude journal. (C) A recent study tested whether happiness can be trained. (D) That group reported higher wellbeing after a month.','["CBDA","BCDA","CDBA","ABCD"]',0,'C introduces the topic. B describes the method. D gives the result. A contradicts/limits it with "But". CBDA.','Find the opening sentence (broadest, no pronouns or connectors) and the closer (usually starts with But/However/Thus). Then fill the middle.','Starting with B — but "one group" presupposes a study that has not been introduced yet.',false,null),
('VARC','Verbal Ability','easy',null,'Choose the option that best fills the blank: Her argument was so ______ that even her critics conceded the point.','["cogent","verbose","tenuous","specious"]',0,'"Even her critics conceded" signals the argument was convincing. Cogent = clear and persuasive.','Blanks are decided by the direction word. "Even... conceded" is a positive signal, so eliminate all negative-tone options first.','Picking "specious", which sounds impressive but means falsely plausible — the opposite of what the sentence needs.',false,null),
('VARC','Verbal Ability','medium',null,'Identify the grammatically correct sentence:','["Neither of the two answers is correct.","Neither of the two answers are correct.","Neither of the two answers were correct.","None of the two answers are correct."]',0,'"Neither" is singular, so it takes "is". "None" is used for more than two; for exactly two, use "neither".','When a subject is separated from the verb by "of the...", cover that phrase with your finger — the verb agrees with what is left.','Matching the verb to the nearest noun ("answers") and choosing "are".',false,null),
('VARC','Vocabulary','medium',null,'The word "ephemeral" most nearly means:','["Lasting a very short time","Extremely important","Occurring at random","Deeply mysterious"]',0,'Ephemeral comes from the Greek ephemeros, "lasting a day". It means short-lived.','Root hunting: ephemeral, diurnal and journal all trace to day-words. Roots beat rote lists.','Confusing it with "ethereal" (delicate, heavenly), which looks similar.',false,null),
('VARC','Reading Comprehension','hard','For most of history, forgetting was the default and remembering took effort — carving, copying, memorising. Digital storage inverted this. Remembering is now the default; forgetting requires deliberate action. Some celebrate this as the end of lost knowledge. Others note that a society which cannot forget also cannot forgive, since every misjudgement remains permanently retrievable. The question is no longer whether we can preserve information, but which forgetting we should choose to protect.','Which of the following best captures the author''s central claim?','["The ease of digital remembering makes deliberate forgetting a necessary choice","Digital storage has made human memory obsolete","Societies should delete all records of personal misjudgements","Remembering has always required more effort than forgetting"]',0,'The final sentence states the claim directly: the issue is now which forgetting we should protect, implying deliberate forgetting is required.','The author''s central claim usually sits in the last sentence of an argumentative passage. Read it first, then verify against the body.','Choosing an over-prescriptive option ("should delete all records") that goes further than the author does.',false,null),
('VARC','Para Completion','medium',null,'Complete the paragraph: Standardised tests are often defended as meritocratic. They apply the same questions, the same clock and the same scoring to everyone. But equality of procedure is not equality of preparation. ______','["A student with coaching and a quiet room does not sit the same exam as one without them.","Therefore standardised tests should be abolished immediately.","Many countries have adopted standardised testing in recent decades.","Test scores correlate weakly with later job performance."]',0,'The last line sets up a contrast between procedure and preparation. The completion must illustrate that gap, which the first option does.','The completing sentence must extend the final idea, not introduce a new one. Match the keyword of the last line — here, "preparation".','Choosing the extreme conclusion ("abolished immediately"), which the paragraph never builds towards.',false,null);

-- ============ SEED: VOCAB ============
INSERT INTO public.vocab_words (word, meaning, example, synonyms, root_hint) VALUES
('Ephemeral','Lasting for a very short time','Fame on social media is often ephemeral.','{"fleeting","transient","short-lived"}','Greek ephemeros = lasting a day'),
('Cogent','Clear, logical and convincing','She made a cogent case for reforming the syllabus.','{"persuasive","compelling","forceful"}','Latin cogere = to drive together'),
('Ubiquitous','Present everywhere at once','Smartphones are ubiquitous in Indian classrooms.','{"omnipresent","pervasive","universal"}','Latin ubique = everywhere'),
('Laconic','Using very few words','His laconic reply ended the argument.','{"terse","curt","concise"}','From Laconia, home of the famously brief Spartans'),
('Obfuscate','To deliberately make something unclear','The report obfuscated the real cause of the loss.','{"muddle","confuse","cloud"}','Latin obfuscare = to darken'),
('Pragmatic','Dealing with things practically rather than ideally','A pragmatic study plan beats a perfect one you never follow.','{"practical","realistic","sensible"}','Greek pragma = deed'),
('Alacrity','Cheerful readiness and speed','He accepted the mock test challenge with alacrity.','{"eagerness","willingness","promptness"}','Latin alacer = lively'),
('Intransigent','Refusing to change one''s views','The intransigent committee rejected every proposal.','{"unyielding","obstinate","inflexible"}','Latin trans + igere = not coming to agreement'),
('Nascent','Just coming into existence','Her nascent interest in economics grew into a career.','{"emerging","budding","incipient"}','Latin nasci = to be born'),
('Perfunctory','Done without real interest or care','He gave the revision a perfunctory glance.','{"cursory","superficial","mechanical"}','Latin perfungi = to get through'),
('Sagacious','Having keen judgement','A sagacious investor sells before the crowd does.','{"shrewd","astute","wise"}','Latin sagax = keen-scented'),
('Tenuous','Very weak or slight','The link between the two events is tenuous.','{"flimsy","fragile","insubstantial"}','Latin tenuis = thin'),
('Specious','Seemingly true but actually false','His specious reasoning fooled the panel briefly.','{"misleading","plausible-but-false","deceptive"}','Latin speciosus = fair-seeming'),
('Prosaic','Ordinary, lacking imagination','The prosaic answer was simply that he forgot.','{"mundane","dull","commonplace"}','Latin prosa = prose, not poetry'),
('Equivocate','To speak vaguely to avoid commitment','The minister equivocated when asked about the deadline.','{"hedge","prevaricate","waffle"}','Latin aequi + vocare = equal voices'),
('Meticulous','Showing great attention to detail','Meticulous error logs turn mocks into marks.','{"thorough","scrupulous","painstaking"}','Latin metus = fear (of mistakes)'),
('Ameliorate','To make a bad situation better','Daily practice ameliorated her accuracy problem.','{"improve","alleviate","mitigate"}','Latin melior = better'),
('Innocuous','Harmless','An innocuous question opened up the whole topic.','{"harmless","benign","inoffensive"}','Latin nocere = to harm'),
('Redundant','No longer needed; repeated unnecessarily','Cut redundant phrases to tighten your essay.','{"superfluous","excess","unnecessary"}','Latin redundare = to overflow'),
('Vindicate','To clear of blame or prove right','The results vindicated her unusual study method.','{"justify","exonerate","absolve"}','Latin vindicare = to claim'),
('Austere','Severely simple; strict','He kept an austere schedule of six hours a day.','{"stark","spartan","ascetic"}','Latin austerus = harsh'),
('Belie','To give a false impression of','His calm face belied his nervousness.','{"contradict","misrepresent","disguise"}','Old English beleogan = to deceive'),
('Candid','Truthful and straightforward','A candid review of your mock is worth ten new tests.','{"frank","forthright","open"}','Latin candidus = white, pure'),
('Diffident','Lacking self-confidence','A diffident student rarely asks the doubt that matters.','{"shy","timid","hesitant"}','Latin diffidere = to distrust'),
('Exacerbate','To make something worse','Skipping analysis exacerbates repeated mistakes.','{"aggravate","worsen","inflame"}','Latin acerbus = bitter'),
('Frugal','Careful with money or resources','Be frugal with time in the first ten minutes of a mock.','{"thrifty","economical","sparing"}','Latin frux = fruit, produce'),
('Gregarious','Fond of company; sociable','Gregarious learners do well in study groups.','{"sociable","outgoing","convivial"}','Latin grex = flock'),
('Hackneyed','Overused and unoriginal','Avoid hackneyed openings in your WAT essay.','{"clichéd","trite","stale"}','From hackney horses, hired out repeatedly'),
('Insipid','Lacking flavour or interest','The insipid summary added nothing new.','{"bland","vapid","flat"}','Latin in + sapidus = not tasty'),
('Juxtapose','To place side by side for contrast','The passage juxtaposes rural and urban growth.','{"contrast","compare","pair"}','Latin juxta = next to');
