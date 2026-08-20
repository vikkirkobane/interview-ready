import React from 'react';
import { waitFor, fireEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';

import LinkedinScreen from '../../app/(tabs)/linkedin';
import { supabase } from '../../src/lib/supabase';
import { apiCall } from '../../src/lib/api';
import { renderWithProviders } from '../helpers/render';
import { resetAllStores, mockLoggedInSession } from '../helpers/stores';
import { buildSession } from '../helpers/supabase';

jest.mock('../../src/lib/supabase', () => {
  const helper = require('../helpers/supabase');
  const mock = helper.createSupabaseMock();
  mock.supabase.__mockHelpers = mock;
  return { supabase: mock.supabase };
});

jest.mock('../../src/lib/api', () => {
  const { createApiMock } = require('../helpers/supabase');
  return createApiMock();
});

const mockSupabase = supabase as any;
const mockApiCall = apiCall as jest.Mock;
const mockToast = Toast as any;

describe('LinkedIn Optimizer — user stories', () => {
  beforeEach(() => {
    resetAllStores();
    mockSupabase.__mockHelpers.reset();
    mockApiCall.mockReset();
    mockToast.show.mockClear();
    const session = buildSession();
    mockLoggedInSession(mockSupabase, session);
    // Seed a profile row so updateProfile can succeed after an import
    mockSupabase.__mockHelpers.tables['user_profiles'] = [{
      id: 'p1',
      user_id: 'test-user-id',
      summary: '',
      work_history: [],
      technical_skills: [],
      soft_skills: [],
      target_roles: [],
    }];
  });

  const renderScreen = () => renderWithProviders(<LinkedinScreen />);

  it('shows the connect prompt for users not linked to LinkedIn', async () => {
    const screen = await renderScreen();
    expect(screen.getByText('Connect with LinkedIn')).toBeTruthy();
    expect(screen.getByText('Sign in with LinkedIn')).toBeTruthy();
  });

  it('lets users skip and enter content manually', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => {
      expect(screen.getByText('Auto-Import Profile')).toBeTruthy();
    });
    expect(screen.getByText('Import My LinkedIn')).toBeTruthy();
  });

  it('imports a profile via URL and populates the wizard + app profile', async () => {
    mockApiCall.mockResolvedValue({
      data: {
        data: {
          headline: 'Senior Product Manager | SaaS',
          about: 'I build products people love.',
          experience: [{ title: 'Senior PM', company: 'Google', description: 'Led growth' }],
          skills: ['Product Strategy', 'SQL'],
        },
        message: 'Profile successfully scraped',
      },
      error: null,
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Auto-Import Profile')).toBeTruthy());

    await fireEvent.changeText(
      screen.getByPlaceholderText('https://linkedin.com/in/your-profile'),
      'https://linkedin.com/in/janedoe'
    );
    await fireEvent.press(screen.getByText('Import My LinkedIn'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'linkedin-scrape',
        'POST',
        { linkedin_url: 'https://linkedin.com/in/janedoe' }
      );
    });
    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'Profile Imported successfully!' })
      );
    });

    // Lands on the review step with the imported content pre-filled
    await waitFor(() => {
      expect(screen.getByText('Review & Complete Content')).toBeTruthy();
    });
    expect(screen.getByDisplayValue('Senior Product Manager | SaaS')).toBeTruthy();
    expect(screen.getByDisplayValue('I build products people love.')).toBeTruthy();
  });

  it('rejects invalid LinkedIn URLs without calling the API', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Auto-Import Profile')).toBeTruthy());

    await fireEvent.changeText(
      screen.getByPlaceholderText('https://linkedin.com/in/your-profile'),
      'https://example.com/not-linkedin'
    );
    await fireEvent.press(screen.getByText('Import My LinkedIn'));

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error', text1: 'Invalid URL' })
      );
    });
    expect(mockApiCall).not.toHaveBeenCalledWith(
      'linkedin-scrape',
      'POST',
      expect.anything()
    );
  });

  it('enforces required fields for headline and SPIKE questions before analyzing', async () => {
    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Continue → Review & Add Content')).toBeTruthy());
    await fireEvent.press(screen.getByText('Continue → Review & Add Content'));
    await waitFor(() => expect(screen.getByText('Review & Complete Content')).toBeTruthy());

    // Try Next without target role
    await fireEvent.press(screen.getByText('Next → Custom Spike'));
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Add at least one target role' })
    );

    // Add target role
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Product Manager'), 'Product Manager');
    await fireEvent(screen.getByPlaceholderText('e.g. Product Manager'), 'submitEditing');

    // Try Next without headline
    await fireEvent.press(screen.getByText('Next → Custom Spike'));
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'LinkedIn headline is required' })
    );

    // Add headline and advance
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "Senior Product Manager | SaaS | ex-Google"'),
      'Senior Product Manager | SaaS | Ex-Google'
    );
    await fireEvent.press(screen.getByText('Next → Custom Spike'));
    await waitFor(() => expect(screen.getByText('Your SPIKE Differentiator')).toBeTruthy());

    // Try Analyse Profile with empty differentiator
    await fireEvent.press(screen.getByText('Analyse Profile'));
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Please describe what sets you apart' })
    );

    // Fill differentiator
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "I\'m the only PM with both an engineering degree and 5 years in emerging markets fintech"'),
      '0 to 1 product builder'
    );
    await fireEvent.press(screen.getByText('Analyse Profile'));
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Please specify what colleagues/clients praise' })
    );

    // Fill praised_for
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "My ability to translate technical complexity into business language"'),
      'High velocity and execution'
    );
    await fireEvent.press(screen.getByText('Analyse Profile'));
    expect(mockToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', text1: 'Please specify problems you solve best' })
    );
  });

  it('runs profile analysis and renders the results overview', async () => {
    mockApiCall.mockImplementation((endpoint: string) => {
      if (endpoint === 'linkedin-analyze') {
        return Promise.resolve({
          data: {
            analysis: {
              overall_score: 72,
              estimated_score_after_optimization: 90,
              section_scores: { headline: 65, about: 70, experience: 75, skills: 80 },
              issues: {
                headline: ['Missing quantified impact'],
                about: ['Value proposition could be sharper'],
                experience: ['Add metrics to bullet points'],
                skills: ['Add more industry skills'],
              },
              suggestions: {
                headline: 'Use the universal 4-part formula',
                about: 'Lead with your core value hook',
              },
              keyword_intelligence: {
                top_keywords: [
                  { keyword: 'Product Strategy', category: 'SKILL', present_in_profile: true },
                  { keyword: 'A/B Testing', category: 'SKILL', present_in_profile: false },
                ],
                missing_high_priority: ['A/B Testing'],
              },
              spike: {
                identified_differentiator: '0 to 1 scaling expert',
                unique_value_proposition: 'Scales early stage SaaS to 10M ARR',
              },
            },
          },
          error: null,
        });
      }
      return Promise.resolve({ data: {}, error: null });
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Continue → Review & Add Content')).toBeTruthy());
    await fireEvent.press(screen.getByText('Continue → Review & Add Content'));
    await waitFor(() => expect(screen.getByText('Review & Complete Content')).toBeTruthy());

    // Add a target role and headline on the content step
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Product Manager'), 'Principal Product Manager');
    await fireEvent(screen.getByPlaceholderText('e.g. Product Manager'), 'submitEditing');
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "Senior Product Manager | SaaS | ex-Google"'),
      'Principal PM | SaaS Growth'
    );
    await fireEvent.press(screen.getByText('Next → Custom Spike'));
    await waitFor(() => expect(screen.getByText('Your SPIKE Differentiator')).toBeTruthy());

    // Fill in required SPIKE fields
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "I\'m the only PM with both an engineering degree and 5 years in emerging markets fintech"'),
      '0 to 1 scaling expert'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "My ability to translate technical complexity into business language"'),
      'Strategic vision'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "Turning underperforming products into category leaders"'),
      'Scaling SaaS from $0M to $10M ARR'
    );

    // Click Analyse Profile
    await fireEvent.press(screen.getByText('Analyse Profile'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'linkedin-analyze',
        'POST',
        expect.objectContaining({
          target_roles: ['Principal Product Manager'],
          headline: 'Principal PM | SaaS Growth',
          spike: {
            differentiator: '0 to 1 scaling expert',
            praised_for: 'Strategic vision',
            problems_solved: 'Scaling SaaS from $0M to $10M ARR',
          },
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Optimisation Results')).toBeTruthy();
      expect(screen.getByText('Overall Profile Score')).toBeTruthy();
      expect(screen.getByText('0 to 1 scaling expert')).toBeTruthy();
    });
  });

  it('optimizes a section when AI Rewrite & Enhance is clicked', async () => {
    mockApiCall.mockImplementation((endpoint: string, method: string, payload: any) => {
      if (endpoint === 'linkedin-analyze') {
        return Promise.resolve({
          data: {
            analysis: {
              overall_score: 72,
              section_scores: { headline: 65, about: 70, experience: 75, skills: 80 },
              issues: { headline: ['Needs keyword frontloading'] },
              suggestions: { headline: 'Optimize headline' },
            },
          },
          error: null,
        });
      }
      if (endpoint === 'linkedin-optimize') {
        return Promise.resolve({
          data: {
            result: {
              variants: [
                {
                  text: 'Principal PM | Scaling B2B SaaS $0M to $10M | Ex-Google',
                  rationale: 'Frontloaded role title with quantified impact',
                  focus: 'SEARCH_RANK',
                },
              ],
            },
            section: payload.section,
          },
          error: null,
        });
      }
      return Promise.resolve({ data: {}, error: null });
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Continue → Review & Add Content')).toBeTruthy());
    await fireEvent.press(screen.getByText('Continue → Review & Add Content'));
    await waitFor(() => expect(screen.getByText('Review & Complete Content')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Product Manager'), 'Principal Product Manager');
    await fireEvent(screen.getByPlaceholderText('e.g. Product Manager'), 'submitEditing');
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "Senior Product Manager | SaaS | ex-Google"'),
      'Principal PM | SaaS Growth'
    );
    await fireEvent.press(screen.getByText('Next → Custom Spike'));
    await waitFor(() => expect(screen.getByText('Your SPIKE Differentiator')).toBeTruthy());

    // Fill required spike fields
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "I\'m the only PM with both an engineering degree and 5 years in emerging markets fintech"'),
      '0 to 1 scaling expert'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "My ability to translate technical complexity into business language"'),
      'Strategic vision'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "Turning underperforming products into category leaders"'),
      'Scaling SaaS from $0M to $10M ARR'
    );

    await fireEvent.press(screen.getByText('Analyse Profile'));

    await waitFor(() => expect(screen.getByText('Optimisation Results')).toBeTruthy());

    // Open Headline section card
    await fireEvent.press(screen.getByText('Headline'));
    await waitFor(() => expect(screen.getByText('AI Rewrite & Enhance')).toBeTruthy());

    // Press AI Rewrite & Enhance
    await fireEvent.press(screen.getByText('AI Rewrite & Enhance'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith(
        'linkedin-optimize',
        'POST',
        expect.objectContaining({
          section: 'HEADLINE',
          target_roles: ['Principal Product Manager'],
        })
      );
    });

    await waitFor(() => {
      expect(mockToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', text1: 'HEADLINE optimized!' })
      );
    });
  });

  it('generates skills, featured, outreach, and engagement plan when requested', async () => {
    mockApiCall.mockImplementation((endpoint: string, method: string, payload: any) => {
      if (endpoint === 'linkedin-analyze') {
        return Promise.resolve({
          data: {
            analysis: {
              overall_score: 75,
              section_scores: { headline: 70, about: 75, experience: 80, skills: 85 },
              issues: {},
              suggestions: {},
            },
          },
          error: null,
        });
      }
      if (endpoint === 'linkedin-optimize') {
        if (payload.section === 'SKILLS') {
          return Promise.resolve({
            data: {
              result: {
                pinned_top_5: ['Product Strategy', 'Roadmapping', 'Growth', 'Data Analytics', 'Cross-functional Leadership'],
                categorized: {
                  core_technical: ['A/B Testing', 'SQL'],
                  industry_domain: ['SaaS', 'B2B'],
                  tools_platforms: ['Jira', 'Mixpanel'],
                  leadership: ['Agile', 'Mentorship'],
                  soft_skills: ['Communication', 'Influence'],
                },
              },
              section: 'SKILLS',
            },
            error: null,
          });
        }
        if (payload.section === 'FEATURED') {
          return Promise.resolve({
            data: {
              result: {
                recommended_items: [
                  { type: 'PORTFOLIO', title: 'Product Case Study', description: '0 to 1 scaling roadmap', cta: 'View Project' },
                ],
              },
              section: 'FEATURED',
            },
            error: null,
          });
        }
        if (payload.section === 'OUTREACH_KIT') {
          return Promise.resolve({
            data: {
              result: {
                inbound_response: 'Thanks for reaching out! I would love to connect.',
                proactive_outreach: 'Hi [Name], saw your opening for PM and wanted to share my background.',
                referral_request: 'Hi [Name], hope you are well! Could you introduce me to [Contact]?',
              },
              section: 'OUTREACH_KIT',
            },
            error: null,
          });
        }
      }
      if (endpoint === 'linkedin-engagement-plan') {
        return Promise.resolve({
          data: {
            plan: {
              weeks: [
                {
                  week_label: 'Week 1-2: Profile Launch',
                  theme: 'Establish Authority',
                  tasks: [{ day: 'Day 1', action: 'Update headline and about section', time_needed: '15 min', type: 'UPDATE' }],
                },
              ],
            },
          },
          error: null,
        });
      }
      return Promise.resolve({ data: {}, error: null });
    });

    const screen = await renderScreen();
    await fireEvent.press(screen.getByText(/Skip — I'll enter my content manually/));
    await waitFor(() => expect(screen.getByText('Continue → Review & Add Content')).toBeTruthy());
    await fireEvent.press(screen.getByText('Continue → Review & Add Content'));
    await waitFor(() => expect(screen.getByText('Review & Complete Content')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Product Manager'), 'Principal Product Manager');
    await fireEvent(screen.getByPlaceholderText('e.g. Product Manager'), 'submitEditing');
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "Senior Product Manager | SaaS | ex-Google"'),
      'Principal PM | SaaS Growth'
    );
    await fireEvent.press(screen.getByText('Next → Custom Spike'));
    await waitFor(() => expect(screen.getByText('Your SPIKE Differentiator')).toBeTruthy());

    // Fill required spike fields
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "I\'m the only PM with both an engineering degree and 5 years in emerging markets fintech"'),
      '0 to 1 scaling expert'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "My ability to translate technical complexity into business language"'),
      'Strategic vision'
    );
    await fireEvent.changeText(
      screen.getByPlaceholderText('e.g. "Turning underperforming products into category leaders"'),
      'Scaling SaaS from $0M to $10M ARR'
    );

    await fireEvent.press(screen.getByText('Analyse Profile'));

    await waitFor(() => expect(screen.getByText('Optimisation Results')).toBeTruthy());

    // Switch to Skills tab and generate strategy
    await fireEvent.press(screen.getAllByText('Skills')[0]);
    await waitFor(() => expect(screen.getByText('Generate Skills Strategy')).toBeTruthy());
    await fireEvent.press(screen.getByText('Generate Skills Strategy'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('linkedin-optimize', 'POST', expect.objectContaining({ section: 'SKILLS' }));
      expect(screen.getByText('📌 Pin These Top 5')).toBeTruthy();
    });

    // Switch to Featured tab and generate recommendations
    await fireEvent.press(screen.getByText('Featured'));
    await waitFor(() => expect(screen.getByText('Get Featured Recommendations')).toBeTruthy());
    await fireEvent.press(screen.getByText('Get Featured Recommendations'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('linkedin-optimize', 'POST', expect.objectContaining({ section: 'FEATURED' }));
      expect(screen.getByText('Product Case Study')).toBeTruthy();
    });

    // Switch to Outreach tab and generate kit
    await fireEvent.press(screen.getByText('Outreach'));
    await waitFor(() => expect(screen.getByText('Generate Outreach Kit')).toBeTruthy());
    await fireEvent.press(screen.getByText('Generate Outreach Kit'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('linkedin-optimize', 'POST', expect.objectContaining({ section: 'OUTREACH_KIT' }));
      expect(screen.getByText('Responding to a Recruiter')).toBeTruthy();
    });

    // Switch to 30-Day Plan tab and generate plan
    await fireEvent.press(screen.getByText('30-Day Plan'));
    await waitFor(() => expect(screen.getByText('Generate Plan')).toBeTruthy());
    await fireEvent.press(screen.getByText('Generate Plan'));

    await waitFor(() => {
      expect(mockApiCall).toHaveBeenCalledWith('linkedin-engagement-plan', 'POST', expect.anything());
      expect(screen.getByText('Week 1-2: Profile Launch')).toBeTruthy();
    });
  });
});



