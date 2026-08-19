import { getNextVisionModelPool, cleanAndNormalizeExtractedText } from '../../supabase/functions/_shared/document-text';

describe('Vision AI Model Rotation Pool', () => {
  const EXPECTED_MODELS = [
    'qwen-omni-turbo',
    'qwen-vl-plus',
    'qwen-vl-max',
    'qwen3-vl-flash',
    'qwen3-vl-plus',
  ];

  it('contains all 5 requested vision models', () => {
    const pool = getNextVisionModelPool();
    expect(pool).toHaveLength(5);
    EXPECTED_MODELS.forEach((model) => {
      expect(pool).toContain(model);
    });
  });

  it('cycles sequentially through the models on consecutive calls', () => {
    const firstCall = getNextVisionModelPool();
    const secondCall = getNextVisionModelPool();
    const thirdCall = getNextVisionModelPool();
    const fourthCall = getNextVisionModelPool();
    const fifthCall = getNextVisionModelPool();
    const sixthCall = getNextVisionModelPool();

    expect(firstCall[0]).not.toBe(secondCall[0]);
    expect(secondCall[0]).not.toBe(thirdCall[0]);
    expect(thirdCall[0]).not.toBe(fourthCall[0]);
    expect(fourthCall[0]).not.toBe(fifthCall[0]);
    expect(sixthCall[0]).toBe(firstCall[0]);
  });
});

describe('cleanAndNormalizeExtractedText for Downstream Qwen Models', () => {
  it('strips markdown code blocks and conversational prefixes', () => {
    const raw = "Here is the extracted text from the document:\n```markdown\n# Senior Software Engineer\n- 5+ years experience with TypeScript\n```";
    const cleaned = cleanAndNormalizeExtractedText(raw);
    expect(cleaned).toBe('# Senior Software Engineer\n- 5+ years experience with TypeScript');
  });

  it('normalizes carriage returns and multiple newlines', () => {
    const raw = "Line 1\r\n\r\n\r\n\r\nLine 2\r\nLine 3";
    const cleaned = cleanAndNormalizeExtractedText(raw);
    expect(cleaned).toBe('Line 1\n\nLine 2\nLine 3');
  });

  it('handles empty input gracefully', () => {
    expect(cleanAndNormalizeExtractedText('')).toBe('');
  });
});
