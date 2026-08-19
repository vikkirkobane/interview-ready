import { getNextVisionModelPool } from '../../supabase/functions/_shared/document-text';

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

    // The first element of each call should rotate sequentially
    expect(firstCall[0]).not.toBe(secondCall[0]);
    expect(secondCall[0]).not.toBe(thirdCall[0]);
    expect(thirdCall[0]).not.toBe(fourthCall[0]);
    expect(fourthCall[0]).not.toBe(fifthCall[0]);
    // Sixth call wraps around to firstCall[0]
    expect(sixthCall[0]).toBe(firstCall[0]);
  });
});
