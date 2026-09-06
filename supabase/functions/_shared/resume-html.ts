/**
 * Server-side Resume HTML Renderer for Deno / Edge Functions
 * Generates ATS-optimized, 1-page structured HTML based on selected template.
 */

function formatPersonName(name: string | undefined | null): string {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (!trimmed) return '';
  return trimmed
    .split(/\s+/)
    .map(word => {
      return word
        .split('-')
        .map(part => {
          return part
            .split("'")
            .map(subPart => {
              if (!subPart) return '';
              return subPart.charAt(0).toUpperCase() + subPart.slice(1).toLowerCase();
            })
            .join("'");
        })
        .join('-');
    })
    .join(' ');
}

function getTemplateCSS(template: string): string {
  const templates: Record<string, string> = {
    executive: `
      .name { color: #1A365D !important; text-align: left !important; font-weight: 800 !important; }
      .title { color: #2B6CB0 !important; font-weight: 700 !important; }
      .company { color: #1A365D !important; font-weight: 700 !important; }
      .separator { color: #2B6CB0 !important; }
      .section-header { color: #1A365D !important; border-bottom: 1.5px solid #1A365D !important; }
      .skills-label { color: #1A365D !important; font-weight: 700 !important; }
      .certs-label { color: #1A365D !important; font-weight: 700 !important; }
    `,
    minimal: `
      .name { color: #000000 !important; font-weight: 800 !important; text-align: left !important; }
      .title { color: #4B5563 !important; font-weight: 600 !important; }
      .company { color: #111827 !important; font-weight: 700 !important; }
      .separator { color: #9CA3AF !important; }
      .section-header { color: #111827 !important; font-weight: 700 !important; text-transform: uppercase !important; letter-spacing: 1.2px !important; border-bottom: 1px solid #D1D5DB !important; }
      .skills-label { color: #111827 !important; font-weight: 700 !important; }
      .certs-label { color: #111827 !important; font-weight: 700 !important; }
    `,
    'modern-pro': `
      .name { color: #0F172A !important; text-align: left !important; font-weight: 800 !important; }
      .title { color: #0D9488 !important; font-weight: 700 !important; }
      .company { color: #0F172A !important; font-weight: 700 !important; }
      .separator { color: #0D9488 !important; }
      .section-header { color: #0F172A !important; border-bottom: 1.5px solid #0D9488 !important; }
      .skills-label { color: #0F172A !important; font-weight: 700 !important; }
      .certs-label { color: #0D9488 !important; font-weight: 700 !important; }
    `,
    'tech-stack': `
      .name { color: #0F172A !important; text-align: left !important; font-weight: 800 !important; }
      .title { color: #2563EB !important; font-weight: 700 !important; }
      .company { color: #1E293B !important; font-weight: 700 !important; }
      .separator { color: #3B82F6 !important; }
      .section-header { color: #1E293B !important; border-bottom: 1.5px solid #3B82F6 !important; }
      .skills-label { color: #1E293B !important; font-weight: 700 !important; }
      .certs-label { color: #2563EB !important; font-weight: 700 !important; }
      .tech-stack { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace !important; color: #4B5563 !important; }
    `,
    creative: `
      .name { color: #1E1B4B !important; text-align: left !important; font-weight: 800 !important; }
      .title { color: #6366F1 !important; font-weight: 700 !important; }
      .company { color: #1E1B4B !important; font-weight: 700 !important; }
      .separator { color: #818CF8 !important; }
      .section-header { color: #1E1B4B !important; border-bottom: 1.5px solid #818CF8 !important; }
      .skills-label { color: #1E1B4B !important; font-weight: 700 !important; }
      .certs-label { color: #6366F1 !important; font-weight: 700 !important; }
    `,
    academic: `
      body { font-family: 'Georgia', 'Times New Roman', Times, serif !important; }
      .name { color: #1F2937 !important; font-family: 'Georgia', serif !important; text-align: center !important; font-weight: 700 !important; }
      .title { color: #4B5563 !important; font-family: 'Georgia', serif !important; text-align: center !important; font-style: italic !important; }
      .subtitle { text-align: center !important; }
      .contact { text-align: center !important; }
      .company { color: #1F2937 !important; font-family: 'Georgia', serif !important; font-weight: 700 !important; }
      .separator { color: #4B5563 !important; }
      .section-header { color: #1F2937 !important; font-family: 'Georgia', serif !important; text-align: center !important; border-bottom: 1px solid #1F2937 !important; }
      .skills-label { color: #1F2937 !important; font-family: 'Georgia', serif !important; font-weight: 700 !important; }
      .certs-label { color: #1F2937 !important; font-family: 'Georgia', serif !important; font-weight: 700 !important; }
      .role-title { font-family: 'Georgia', serif !important; }
      .edu-degree { font-family: 'Georgia', serif !important; }
    `,
  };

  return templates[template] || templates.executive;
}

function esc(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildResumeHTML(r: any, templateId?: string): string {
  const template = templateId || 'executive';
  const templateCSS = getTemplateCSS(template);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @page { size: A4 portrait; margin: 22pt 26pt; }
    @media screen {
      body { padding: 32px 28px; max-width: 820px; margin: 0 auto; background: #fff; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10.2px;
      color: #111827;
      background: #ffffff;
      line-height: 1.44;
      -webkit-print-color-adjust: exact;
    }
    .header-block {
      margin-bottom: 6pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .name {
      font-size: 23px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.4px;
      margin-bottom: 2pt;
      line-height: 1.15;
    }
    .title {
      font-size: 12.5px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 2pt;
    }
    .subtitle {
      font-size: 10.2px;
      color: #4B5563;
      margin-bottom: 2.5pt;
    }
    .contact {
      font-size: 9.8px;
      color: #4B5563;
      margin-top: 2.5pt;
      margin-bottom: 2.5pt;
      font-weight: 500;
    }
    .section-header {
      font-size: 11px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1.5px solid #111827;
      margin-top: 8.5pt;
      margin-bottom: 3.5pt;
      padding-bottom: 2pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .role-block {
      margin-top: 5.5pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .role-line {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      line-height: 1.3;
    }
    .role-title {
      font-size: 10.8px;
      font-weight: 700;
      color: #111827;
    }
    .company {
      font-size: 10.8px;
      font-weight: 700;
      color: #111827;
    }
    .separator {
      color: #6B7280;
      margin: 0 4px;
      font-weight: 600;
    }
    .date {
      font-size: 9.8px;
      color: #6B7280;
      font-weight: 500;
    }
    .location {
      font-size: 9.2px;
      color: #6B7280;
      margin-bottom: 2pt;
    }
    ul {
      margin-left: 13pt;
      margin-top: 2pt;
    }
    li {
      font-size: 10.2px;
      color: #1F2937;
      margin-bottom: 2.5pt;
      line-height: 1.42;
    }
    .skills-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 2.5pt;
    }
    .skills-label {
      font-size: 10.2px;
      font-weight: 700;
      color: #111827;
      width: 22%;
      vertical-align: top;
      padding: 1.5pt 6pt 1.5pt 0;
    }
    .skills-value {
      font-size: 10.2px;
      color: #1F2937;
      padding: 1.5pt 0;
      line-height: 1.4;
    }
    .tech-stack {
      font-size: 9.8px;
      color: #6B7280;
      margin-bottom: 2pt;
    }
    .edu-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .edu-degree {
      font-weight: 700;
      font-size: 10.8px;
      color: #111827;
    }
    .edu-school {
      font-size: 10.2px;
      color: #4B5563;
    }
    .certs {
      font-size: 10.2px;
      color: #1F2937;
      margin-top: 3pt;
      line-height: 1.4;
    }
    .certs-label {
      font-weight: 700;
      color: #111827;
    }
    ${templateCSS}
  `;

  const shouldInclude = (section: string, hasContent: boolean): boolean => {
    if (!hasContent) return false;
    if (!r.sections_to_include) return true;
    return r.sections_to_include[section] !== false;
  };

  const h = r.header || r.contact || {};
  const rawName = h.name || r.name || r.meta?.candidate_name || '';
  const candidateName = formatPersonName(rawName) || 'Resume';
  const candidateTitle = h.title || r.title || r.meta?.profession || r.meta?.target_role || '';
  const candidateSubtitle = h.subtitle || r.subtitle || '';
  const contactParts = [
    h.email || r.email,
    h.phone || r.phone,
    h.linkedin || r.linkedin,
    h.portfolio || r.portfolio,
    h.location || r.location,
  ]
    .map(val => (val ? String(val).trim() : ''))
    .filter(Boolean);

  const header = `
    <div class="header-block">
      <div class="name">${esc(candidateName)}</div>
      ${candidateTitle ? `<div class="title">${esc(candidateTitle)}</div>` : ''}
      ${candidateSubtitle ? `<div class="subtitle">${esc(candidateSubtitle)}</div>` : ''}
      ${contactParts.length > 0 ? `
        <div class="contact">${contactParts.map(esc).join(' &nbsp;•&nbsp; ')}</div>
      ` : ''}
    </div>
  `;

  const rawSummary = typeof r.summary === 'string' ? r.summary : r.summary?.text || r.summary?.summary || '';
  const summary = shouldInclude('summary', !!rawSummary.trim()) ? `
    <div class="section-header">Summary</div>
    <p style="font-size:10.2px;line-height:1.46;color:#1F2937;">${esc(rawSummary.trim())}</p>
  ` : '';

  const rawSkills = r.skills || [];
  const normalizedSkills = rawSkills.map((s: any) => {
    if (typeof s === 'string') {
      return { category: 'Skills', items: [s] };
    }
    const cat = s.category || s.name || 'Skills';
    const items = Array.isArray(s.items) ? s.items : Array.isArray(s.skills) ? s.skills : typeof s.items === 'string' ? [s.items] : [];
    return { category: cat, items };
  }).filter((s: any) => s.items.length > 0);

  const skillsHeader = template === 'minimal' ? 'Skills' : 'Skills &amp; Competencies';
  const skills = shouldInclude('skills', normalizedSkills.length > 0) ? `
    <div class="section-header">${skillsHeader}</div>
    <table class="skills-table">
      ${normalizedSkills.map((s: any) => `
        <tr>
          <td class="skills-label">${esc(s.category)}:</td>
          <td class="skills-value">${(s.items || []).map(esc).join(' • ')}</td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  const rawExp = r.experience || [];
  const normalizedExp = rawExp.map((e: any) => {
    const title = e.title || e.role || e.position || '';
    const company = e.company || e.organization || e.employer || '';
    const date_range = e.date_range || e.dates || e.year || e.duration || '';
    const location = e.location || '';
    const bullets = Array.isArray(e.bullets) ? e.bullets : typeof e.description === 'string' && e.description.trim() ? [e.description] : [];
    return { title, company, date_range, location, bullets };
  }).filter((e: any) => e.title || e.company || e.bullets.length > 0);

  const expHeader = template === 'academic'
    ? 'Research &amp; Work Experience'
    : template === 'tech-stack'
      ? 'Work Experience'
      : 'Professional Experience';

  const experience = shouldInclude('experience', normalizedExp.length > 0) ? `
    <div class="section-header">${expHeader}</div>
    ${normalizedExp.map((e: any) => {
      const bullets = Array.isArray(e.bullets) ? e.bullets : [];
      return `
        <div class="role-block">
          <div class="role-line">
            <span>
              <span class="role-title">${esc(e.title)}</span>
              ${e.company ? `<span class="separator">•</span><span class="company">${esc(e.company)}</span>` : ''}
            </span>
            ${e.date_range ? `<span class="date">${esc(e.date_range)}</span>` : ''}
          </div>
          ${e.location ? `<div class="location">${esc(e.location)}</div>` : ''}
          ${bullets.length > 0 ? `<ul>${bullets.map((b: string) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        </div>
      `;
    }).join('')}
  ` : '';

  const projHeaderLabel = template === 'academic' ? 'Research Project' : 'Featured Project';
  const proj = r.featured_project || (Array.isArray(r.projects) && r.projects[0]) || null;
  const projHasContent = proj && (proj.name || proj.title);
  const project = shouldInclude('featured_project', !!projHasContent && (proj.include !== false || !r.sections_to_include)) ? `
    <div class="section-header">${projHeaderLabel}</div>
    <div class="role-block">
      <div class="role-title">${esc(proj.name || proj.title)}</div>
      ${proj.tech_stack ? `<div class="tech-stack">${esc(proj.tech_stack)}</div>` : ''}
      ${proj.bullet ? `<ul><li>${esc(proj.bullet)}</li></ul>` : ''}
    </div>
  ` : '';

  const rawEdu = r.education || [];
  const normalizedEdu = rawEdu.map((e: any) => ({
    degree: e.degree || e.degree_name || e.title || '',
    institution: e.institution || e.school || e.university || '',
    year: e.year || e.graduation_year || e.date || '',
    note: e.note || e.gpa || '',
  })).filter((e: any) => e.degree || e.institution);

  const rawCerts = r.certifications || [];
  const normalizedCerts = rawCerts.map((c: any) => {
    if (typeof c === 'string') return c;
    return [c.name || c.title, c.issuer, c.year].filter(Boolean).join(' - ');
  }).filter(Boolean);

  const hasEdu = shouldInclude('education', normalizedEdu.length > 0);
  const hasCerts = shouldInclude('certifications', normalizedCerts.length > 0);

  const educationBlock = (hasEdu || hasCerts) ? `
    <div class="section-header">${hasEdu && hasCerts ? 'Education &amp; Certifications' : hasEdu ? 'Education' : 'Certifications'}</div>
    ${hasEdu ? normalizedEdu.map((e: any) => `
      <div class="edu-line">
        <span class="edu-degree">${esc(e.degree)}</span>
        ${e.year ? `<span class="date">${esc(e.year)}</span>` : ''}
      </div>
      <div class="edu-school">${esc(e.institution)}${e.note ? ' • ' + esc(e.note) : ''}</div>
    `).join('') : ''}
    ${hasCerts && normalizedCerts.length > 0 ? `
      <div class="certs">
        <span class="certs-label">Certifications: </span>
        ${normalizedCerts.map(esc).join(' • ')}
      </div>
    ` : ''}
  ` : '';

  const rawLang = r.languages || [];
  const normalizedLang = rawLang.map((l: any) => {
    if (typeof l === 'string') return l;
    return `${l.language || l.name || ''}${l.proficiency ? ` (${l.proficiency})` : ''}`;
  }).filter(Boolean);

  const languages = shouldInclude('languages', normalizedLang.length > 0) ? `
    <div class="section-header">Languages</div>
    <p style="font-size:9.8px;color:#1F2937;">${normalizedLang.map(esc).join(' • ')}</p>
  ` : '';

  const rawRec = r.recognition || r.awards || [];
  const normalizedRec = rawRec.map((item: any) => {
    if (typeof item === 'string') return item;
    return [item.name || item.title, item.issuer, item.year].filter(Boolean).join(' - ');
  }).filter(Boolean);

  const recHeader = template === 'academic' ? 'Publications &amp; Recognition' : 'Recognition &amp; Awards';
  const recognition = shouldInclude('recognition', normalizedRec.length > 0) ? `
    <div class="section-header">${recHeader}</div>
    <ul>${normalizedRec.map((item: string) => `<li>${esc(item)}</li>`).join('')}</ul>
  ` : '';

  let bodyContent: string;
  if (template === 'tech-stack') {
    bodyContent = `${header}${summary}${skills}${project}${experience}${educationBlock}${languages}${recognition}`;
  } else if (template === 'academic') {
    bodyContent = `${header}${educationBlock}${summary}${skills}${experience}${project}${recognition}${languages}`;
  } else {
    bodyContent = `${header}${summary}${skills}${experience}${project}${educationBlock}${languages}${recognition}`;
  }

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>${esc(candidateName)}</title>
    <style>${css}</style></head><body>
    ${bodyContent}
  </body></html>`;
}
