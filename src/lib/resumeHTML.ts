import { ResumeContent } from '../../supabase/functions/_shared/zod-schemas';

function getTemplateCSS(template: string): string {
  const templates: Record<string, string> = {
    executive: `
      .name { color: #1A3A5C !important; text-align: left !important; font-weight: 700 !important; }
      .title { color: #1A3A5C !important; }
      .company { color: #1A3A5C !important; }
      .separator { color: #1A3A5C !important; }
      .section-header { color: #1A3A5C !important; border-bottom: 2px solid #1A3A5C !important; }
      .skills-label { color: #1A3A5C !important; }
      .certs-label { color: #1A3A5C !important; }
    `,
    minimal: `
      .name { color: #000 !important; font-weight: 300 !important; letter-spacing: -1px !important; text-align: left !important; }
      .title { color: #000 !important; font-weight: 500 !important; }
      .company { color: #000 !important; }
      .separator { color: #666 !important; }
      .section-header { color: #000 !important; font-weight: 300 !important; text-transform: uppercase !important; letter-spacing: 2px !important; border-bottom: 1px solid #E5E7EB !important; }
      .skills-label { color: #000 !important; font-weight: 600 !important; }
      .certs-label { color: #000 !important; font-weight: 600 !important; }
    `,
    'tech-stack': `
      .name { color: #2563EB !important; font-family: 'Courier New', monospace !important; text-align: left !important; }
      .title { color: #2563EB !important; font-family: 'Courier New', monospace !important; }
      .company { color: #2563EB !important; font-family: 'Courier New', monospace !important; }
      .separator { color: #2563EB !important; }
      .section-header { color: #2563EB !important; font-family: 'Courier New', monospace !important; border-bottom: 2px solid #2563EB !important; }
      .skills-label { color: #2563EB !important; font-family: 'Courier New', monospace !important; }
      .certs-label { color: #2563EB !important; font-family: 'Courier New', monospace !important; }
      .role-title { font-family: 'Courier New', monospace !important; }
    `,
    academic: `
      .name { color: #1E40AF !important; font-family: 'Georgia', serif !important; text-align: center !important; }
      .title { color: #1E40AF !important; font-family: 'Georgia', serif !important; text-align: center !important; }
      .subtitle { text-align: center !important; }
      .contact { text-align: center !important; }
      .company { color: #1E40AF !important; font-family: 'Georgia', serif !important; }
      .separator { color: #1E40AF !important; }
      .section-header { color: #1E40AF !important; font-family: 'Georgia', serif !important; text-align: center !important; border-bottom: 2px solid #1E40AF !important; }
      .skills-label { color: #1E40AF !important; font-family: 'Georgia', serif !important; }
      .certs-label { color: #1E40AF !important; font-family: 'Georgia', serif !important; }
      .role-title { font-family: 'Georgia', serif !important; }
      .edu-degree { font-family: 'Georgia', serif !important; }
    `,
  };

  return templates[template] || templates.executive;
}

export function buildResumeHTML(r: ResumeContent, templateId?: string): string {
  const template = templateId || 'executive';
  const templateCSS = getTemplateCSS(template);
  
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @page { size: A4; margin: 36pt 40pt; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
           font-size: 11.3px; color: #1A1A1A; background: #fff;
           min-height: 100vh;
           -webkit-print-color-adjust: exact;
           -webkit-user-select: none;
           -moz-user-select: none;
           -ms-user-select: none;
           user-select: none; }
    .name { font-size: 42.6px; font-weight: 700; color: #1A3A5C; margin-bottom: 3px; }
    .title { font-size: 13.3px; font-weight: 600; color: #1A3A5C; margin-bottom: 2px; }
    .subtitle { font-size: 11.3px; color: #555555; margin-bottom: 2px; }
    .contact { font-size: 10.7px; color: #555555; margin-bottom: 14pt; }
    .section-header { font-size: 11.3px; font-weight: 700; color: #1A3A5C;
                      text-transform: uppercase; letter-spacing: 0.5px;
                      border-bottom: 0.75pt solid #1A3A5C;
                      margin-top: 14pt; margin-bottom: 4pt; padding-bottom: 2pt; }
    .role-block { margin-top: 8pt; }
    .role-line { display: flex; justify-content: space-between; align-items: baseline; }
    .role-title { font-size: 12px; font-weight: 700; color: #1A1A1A; }
    .company { font-size: 12px; font-weight: 700; color: #1A3A5C; }
    .separator { color: #1A3A5C; margin: 0 4px; }
    .date { font-size: 10.7px; color: #666666; }
    .location { font-size: 10.7px; color: #666666; margin-bottom: 3pt; }
    ul { margin-left: 10pt; margin-top: 0; }
    li { font-size: 11.3px; color: #1A1A1A; margin-bottom: 2.5pt; line-height: 1.4; }
    .skills-table { width: 100%; border-collapse: collapse; margin-top: 4pt; }
    .skills-label { font-size: 11.3px; font-weight: 700; color: #1A3A5C;
                    width: 22%; vertical-align: top; padding: 2pt 8pt 2pt 0; }
    .skills-value { font-size: 11.3px; color: #1A1A1A; padding: 2pt 0; }
    .tech-stack { font-size: 10.7px; color: #666666; margin-bottom: 2pt; }
    .edu-line { display: flex; justify-content: space-between; margin-bottom: 3pt; }
    .edu-degree { font-weight: 700; font-size: 12px; color: #1A1A1A; }
    .edu-school { font-size: 11.3px; color: #555555; }
    .certs { font-size: 11.3px; color: #1A1A1A; margin-top: 3pt; }
    .certs-label { font-weight: 700; color: #1A3A5C; }
    ${templateCSS}
  `;

  const header = `
    <div class="name">${r.header.name}</div>
    <div class="title">${r.header.title}</div>
    <div class="subtitle">${r.header.subtitle || ''}</div>
    <div class="contact">
      ${r.header.email} &nbsp;·&nbsp; ${r.header.phone}
      ${r.header.linkedin ? ` &nbsp;·&nbsp; ${r.header.linkedin}` : ''}
      ${r.header.portfolio ? ` &nbsp;·&nbsp; ${r.header.portfolio}` : ''}
      &nbsp;·&nbsp; ${r.header.location}
    </div>
  `;

  const summary = r.sections_to_include.summary && r.summary ? `
    <div class="section-header">Summary</div>
    <p style="font-size:11.3px;line-height:1.5;">${r.summary.text}</p>
  ` : '';

  const skills = r.sections_to_include.skills && r.skills && r.skills.length > 0 ? `
    <div class="section-header">Skills</div>
    <table class="skills-table">
      ${r.skills.map((s: any) => `
        <tr>
          <td class="skills-label">${s.category}</td>
          <td class="skills-value">${s.items.join(' · ')}</td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  const experience = r.sections_to_include.experience && r.experience && r.experience.length > 0 ? `
    <div class="section-header">Experience</div>
    ${r.experience.map((e: any) => `
      <div class="role-block">
        <div class="role-line">
          <span>
            <span class="role-title">${e.title}</span>
            <span class="separator">·</span>
            <span class="company">${e.company}</span>
          </span>
          <span class="date">${e.date_range}</span>
        </div>
        <div class="location">${e.location || ''}</div>
        <ul>${(e.bullets || []).map((b: string) => `<li>${b}</li>`).join('')}</ul>
      </div>
    `).join('')}
  ` : '';

  const project = r.sections_to_include.featured_project && r.featured_project && r.featured_project.include ? `
    <div class="section-header">Featured Project</div>
    <div class="role-block">
      <div class="role-title">${r.featured_project.name}</div>
      <div class="tech-stack">${r.featured_project.tech_stack || ''}</div>
      <ul><li>${r.featured_project.bullet}</li></ul>
    </div>
  ` : '';

  const education = r.sections_to_include.education && r.education && r.education.length > 0 ? `
    <div class="section-header">Education & Certifications</div>
    ${r.education.map((e: any) => `
      <div class="edu-line">
        <span class="edu-degree">${e.degree}</span>
        <span class="date">${e.year}</span>
      </div>
      <div class="edu-school">${e.institution}${e.note ? ' · ' + e.note : ''}</div>
    `).join('<br style="margin:2pt 0">')}
    ${r.certifications && r.certifications.length > 0 ? `
      <div class="certs">
        <span class="certs-label">Certifications: </span>
        ${r.certifications.join(' · ')}
      </div>
    ` : ''}
  ` : '';

  const languages = r.sections_to_include.languages && r.languages && r.languages.length > 0 ? `
    <div class="section-header">Languages</div>
    <p style="font-size:11.3px;">${r.languages.map((l: any) => `${l.language} (${l.proficiency})`).join(' · ')}</p>
  ` : '';

  const recognition = r.sections_to_include.recognition && r.recognition && r.recognition.length > 0 ? `
    <div class="section-header">Recognition & Awards</div>
    <ul>${r.recognition.map((item: string) => `<li>${item}</li>`).join('')}</ul>
  ` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>${css}</style></head><body>
    ${header}${summary}${skills}${experience}${project}${education}${languages}${recognition}
  </body></html>`;
}
