// @ts-nocheck
declare const Deno: any;
import { Hono } from 'npm:hono@4.0.0';
import { cors } from 'npm:hono@4.0.0/cors';
import { createServiceClient } from '../_shared/supabase-client.ts';

const app = new Hono();
app.use('/*', cors());

/**
 * Internal Quality Analysis & Self-Improvement Pipeline
 * Computes performance, word count, ATS keyword density, JD tailoring impact,
 * user edits, downloads, and feedback ratings per template.
 */
app.post('/*', async (c: any) => {
  try {
    const serviceClient = createServiceClient();
    const today = new Date().toISOString().split('T')[0];

    // Fetch generation logs from the past 7 days, including job description metadata
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs, error: logsError } = await serviceClient
      .from('resume_generation_logs')
      .select('id, resume_id, template_slug, word_count, ats_keywords_count, generation_duration_ms, job_description, job_title, job_company, created_at')
      .gte('created_at', sevenDaysAgo);

    if (logsError) {
      throw new Error(`Failed to fetch generation logs: ${logsError.message}`);
    }

    // Fetch feedback entries
    const resumeIds = (logs || []).map((l: any) => l.resume_id).filter(Boolean);
    let feedbackMap: Record<string, any> = {};

    if (resumeIds.length > 0) {
      const { data: feedbacks, error: feedbackError } = await serviceClient
        .from('resume_feedback')
        .select('*')
        .in('resume_id', resumeIds);

      if (!feedbackError && feedbacks) {
        for (const fb of feedbacks) {
          feedbackMap[fb.resume_id] = fb;
        }
      }
    }

    // Group by template_slug
    const templateStats: Record<string, {
      total: number;
      withJd: number;
      withoutJd: number;
      positive: number;
      negative: number;
      edited: number;
      downloaded: number;
      totalWords: number;
      totalAtsKeywords: number;
      totalDuration: number;
      jdTitles: string[];
    }> = {};

    for (const log of logs || []) {
      const slug = log.template_slug || 'executive';
      if (!templateStats[slug]) {
        templateStats[slug] = {
          total: 0,
          withJd: 0,
          withoutJd: 0,
          positive: 0,
          negative: 0,
          edited: 0,
          downloaded: 0,
          totalWords: 0,
          totalAtsKeywords: 0,
          totalDuration: 0,
          jdTitles: [],
        };
      }

      const st = templateStats[slug];
      st.total += 1;
      st.totalWords += (log.word_count || 0);
      st.totalAtsKeywords += (log.ats_keywords_count || 0);
      st.totalDuration += (log.generation_duration_ms || 0);

      const hasJd = !!(log.job_description && log.job_description.trim().length > 20);
      if (hasJd) {
        st.withJd += 1;
        if (log.job_title) st.jdTitles.push(log.job_title);
      } else {
        st.withoutJd += 1;
      }

      const fb = feedbackMap[log.resume_id];
      if (fb) {
        if (fb.rating === 1) st.positive += 1;
        if (fb.rating === -1) st.negative += 1;
        if (fb.edited_after_generation) st.edited += 1;
        if (fb.downloaded) st.downloaded += 1;
      }
    }

    const results = [];
    for (const [slug, st] of Object.entries(templateStats)) {
      const avgWordCount = st.total > 0 ? Math.round(st.totalWords / st.total) : 0;
      const avgAtsKeywords = st.total > 0 ? Math.round((st.totalAtsKeywords / st.total) * 10) / 10 : 0;
      const avgDuration = st.total > 0 ? Math.round(st.totalDuration / st.total) : 0;
      
      const downloadRate = st.total > 0 ? (st.downloaded / st.total) : 0;
      const ratedCount = st.positive + st.negative;
      const positiveRate = ratedCount > 0 ? (st.positive / ratedCount) : 0.8;
      const editRate = st.total > 0 ? (st.edited / st.total) : 0;

      // Quality score formula: 0 - 100
      // High downloads (+40), positive reviews (+35), lower heavy edits (+25)
      const score = Math.min(100, Math.max(0, Math.round(
        (downloadRate * 40) +
        (positiveRate * 35) +
        ((1 - Math.min(editRate, 1)) * 25)
      )));

      const metricRow = {
        template_slug: slug,
        metric_date: today,
        total_generations: st.total,
        with_jd_generations: st.withJd,
        without_jd_generations: st.withoutJd,
        positive_feedback_count: st.positive,
        negative_feedback_count: st.negative,
        edit_count: st.edited,
        download_count: st.downloaded,
        avg_word_count: avgWordCount,
        avg_ats_keywords: avgAtsKeywords,
        avg_duration_ms: avgDuration,
        quality_score: score,
      };

      await serviceClient.from('resume_quality_metrics').upsert(metricRow, {
        onConflict: 'template_slug,metric_date',
      });
      results.push(metricRow);

      // Automated alert generation
      if (st.total >= 3) {
        if (st.negative > st.positive) {
          await serviceClient.from('resume_quality_alerts').insert({
            template_slug: slug,
            alert_type: 'HIGH_NEGATIVE_FEEDBACK',
            message: `Template "${slug}" received ${st.negative} negative vs ${st.positive} positive ratings in the past 7 days.`,
            details: { stats: st },
          });
        }
        if (avgWordCount < 350) {
          await serviceClient.from('resume_quality_alerts').insert({
            template_slug: slug,
            alert_type: 'LOW_WORD_COUNT',
            message: `Template "${slug}" avg word count is ${avgWordCount} words (minimum target is 450 words).`,
            details: { avg_word_count: avgWordCount },
          });
        }
        if (st.withJd > 0 && avgAtsKeywords < 5) {
          await serviceClient.from('resume_quality_alerts').insert({
            template_slug: slug,
            alert_type: 'LOW_ATS_KEYWORD_DENSITY',
            message: `Template "${slug}" avg ATS keywords for JD-tailored resumes is ${avgAtsKeywords} (recommended >= 8).`,
            details: { avg_ats_keywords: avgAtsKeywords, with_jd_count: st.withJd },
          });
        }
      }
    }

    return c.json({
      success: true,
      metric_date: today,
      templates_analyzed: Object.keys(templateStats).length,
      metrics: results,
    });
  } catch (error: any) {
    console.error('Error in resume-quality-analyze:', error);
    return c.json({ error: error.message || 'Internal error' }, 500);
  }
});

Deno.serve(app.fetch);
