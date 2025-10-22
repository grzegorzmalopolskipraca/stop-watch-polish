-- Create table for prohibited words
CREATE TABLE public.prohibited_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prohibited_words ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read prohibited words (needed for filtering)
CREATE POLICY "Anyone can view prohibited words"
ON public.prohibited_words
FOR SELECT
USING (true);

-- Only service role can manage prohibited words
CREATE POLICY "Service role can manage prohibited words"
ON public.prohibited_words
FOR ALL
USING (false);

-- Insert common Polish offensive words
INSERT INTO public.prohibited_words (word) VALUES
  ('kurwa'),
  ('kurwy'),
  ('kurwą'),
  ('kurwie'),
  ('kurwo'),
  ('jebać'),
  ('jebac'),
  ('pierdolić'),
  ('pierdolic'),
  ('pierdolę'),
  ('pierdole'),
  ('chuj'),
  ('chuja'),
  ('chuju'),
  ('cipa'),
  ('cipę'),
  ('cipe'),
  ('cipą'),
  ('cipie'),
  ('dupa'),
  ('dupę'),
  ('dupe'),
  ('dupą'),
  ('dupie'),
  ('skurwysyn'),
  ('skurwysynu'),
  ('skurwysyna'),
  ('pojeb'),
  ('pojeba'),
  ('pojebie'),
  ('debil'),
  ('debilu'),
  ('debila'),
  ('idiota'),
  ('idioto'),
  ('idioty'),
  ('głąb'),
  ('glab'),
  ('głąbie'),
  ('glabie'),
  ('spierdalaj'),
  ('spierdala'),
  ('jebie'),
  ('jebany'),
  ('jebana'),
  ('jebane'),
  ('kurewski'),
  ('kurewska'),
  ('kurewskie'),
  ('pierdolony'),
  ('pierdolona'),
  ('pierdolone'),
  ('zajebisty'),
  ('zajebista'),
  ('zajebiste'),
  ('wkurwić'),
  ('wkurwic'),
  ('wkurwia');

-- Create index for faster lookups
CREATE INDEX idx_prohibited_words_word ON public.prohibited_words(word);