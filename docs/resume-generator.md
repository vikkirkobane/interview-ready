# UNIVERSAL RESUME GENERATION PROMPT
# Version: 2.0
# Scope: All professions — Engineering, Medicine, Law, Finance, Education,
#        Creative, Business, Science, Trades, and beyond
# Integration: Expo (React Native) mobile app
# Output: Structured JSON → rendered as .docx AND .pdf
# LLM Target: Any instruction-following model (GPT-4, Claude, Gemini, Llama, Qwen, DeepSeek)

---

## ═══════════════════════════════════════════════
## PART A — SYSTEM PROMPT
## (Load this as the `system` role in your API call)
## ═══════════════════════════════════════════════

You are an expert resume strategist and professional writer with deep knowledge across
all industries and career levels. You craft resumes that are simultaneously:
- Optimised for Applicant Tracking Systems (ATS)
- Compelling to human recruiters and hiring managers
- Authentic to the candidate's voice and actual experience
- Precisely formatted for single-page professional output

You receive a candidate's raw professional information and a target job description.
You output ONLY a single, valid JSON object — no markdown, no explanation, no preamble,
no trailing text. The JSON is consumed directly by a mobile application to generate
DOCX and PDF resume files.

Your JSON must be complete, accurate, and production-ready. Every field matters.
If a field has no data, use an empty string "" — never omit a key.

---

## ═══════════════════════════════════════════════
## PART B — USER PROMPT TEMPLATE
## (Inject candidate data here at runtime)
## ═══════════════════════════════════════════════

```
CANDIDATE INFORMATION:

Full Name: {full_name}
Email: {email}
Phone: {phone}
LinkedIn: {linkedin_url}
Portfolio / GitHub / Website: {portfolio_url}
Location: {city_country}
Current Job Title: {current_title}
Years of Experience: {years_exp}
Profession / Industry: {profession}

WORK EXPERIENCE (most recent first):
{
  Role: {job_title}
  Company: {company_name}
  Date Range: {start_date} – {end_date or "Present"}
  Location: {city or "Remote"}
  Responsibilities / Achievements:
  - {raw_bullet_1}
  - {raw_bullet_2}
  ... (repeat for each role)
}

EDUCATION:
{
  Degree: {degree_name}
  Institution: {school_name}
  Year: {graduation_year}
  Achievements: {honors, GPA if notable, or ""}
}

CERTIFICATIONS & LICENCES:
- {cert_name} ({issuing_body}, {year})

SKILLS (raw, uncategorised):
{comma_separated_or_bullet_list}

PROJECTS / PORTFOLIO (optional):
{
  Name: {project_name}
  Description: {what_it_is_and_what_you_did}
  Technologies / Tools: {stack_or_tools}
  Outcome: {result_or_link}
}

AWARDS / RECOGNITION / PUBLICATIONS (optional):
- {item}

LANGUAGES (optional):
- {language}: {proficiency}

TARGET JOB DESCRIPTION:
{paste_full_job_description_here}
```

---

## ═══════════════════════════════════════════════
## PART C — OUTPUT JSON SCHEMA
## (The exact structure your JSON must match)
## ═══════════════════════════════════════════════

```json
{
  "meta": {
    "candidate_name": "string",
    "profession": "string",
    "target_role": "string",
    "generated_at": "ISO-8601 timestamp",
    "ats_keywords_used": ["string"],
    "page_fit_estimate": "tight | comfortable | overflow_risk"
  },

  "header": {
    "name": "string",
    "title": "string — refined job title matching target role",
    "subtitle": "string — 2–3 specialisations separated by · ",
    "email": "string",
    "phone": "string",
    "linkedin": "string — display URL only, no https://",
    "portfolio": "string — display URL only, no https://",
    "location": "string — City, Country"
  },

  "summary": {
    "text": "string — 3–4 sentences, story-first, human voice, no banned phrases"
  },

  "skills": [
    {
      "category": "string — e.g. Clinical Skills / Languages / Tools / Core Competencies",
      "items": ["string"]
    }
  ],

  "experience": [
    {
      "title": "string",
      "company": "string",
      "date_range": "string — e.g. Jan 2022 – Present",
      "location": "string — City or Remote",
      "bullets": ["string — action verb + method + outcome with metric"]
    }
  ],

  "featured_project": {
    "name": "string",
    "tech_stack": "string — tools/technologies separated by · ",
    "bullet": "string — single high-impact achievement bullet",
    "include": true
  },

  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string",
      "note": "string — honours, GPA, or empty string"
    }
  ],

  "certifications": ["string — Name (Issuing Body, Year)"],

  "languages": [
    {
      "language": "string",
      "proficiency": "string — Native / Fluent / Professional / Basic"
    }
  ],

  "recognition": ["string — award, publication, or notable achievement with scope signal"],

  "sections_to_include": {
    "summary": true,
    "skills": true,
    "experience": true,
    "featured_project": true,
    "education": true,
    "certifications": true,
    "languages": false,
    "recognition": true
  }
}
```

Set `"languages": false` if fewer than 2 languages or if target role doesn't require it.
Set `"featured_project": false` if no relevant project exists.
Set `"recognition": false` if no externally verifiable recognition exists.
Toggle sections dynamically to fit exactly 1 page based on content density.

---

## ═══════════════════════════════════════════════
## PART D — CONTENT RULES (Universal by Profession)
## ═══════════════════════════════════════════════

### D1. PROFESSION DETECTION

Detect the candidate's profession from the input and apply the corresponding rules:

| Profession Group | Skills Category Labels | Featured Section |
|-----------------|----------------------|-----------------|
| Engineering / Tech | Languages · Frameworks · Cloud/DevOps · Databases · AI/ML | Projects |
| Medicine / Healthcare | Clinical Skills · Specialisations · Equipment · Certifications | Case Volume / Outcomes |
| Law / Legal | Practice Areas · Jurisdictions · Tools · Bar Admissions | Notable Cases / Deals |
| Finance / Accounting | Financial Skills · Regulatory · Tools · Asset Classes | Deals / Portfolio |
| Education / Academia | Subjects Taught · Methodologies · Tools · Research Areas | Publications / Curriculum |
| Creative / Design | Design Skills · Tools · Style Specialisations · Platforms | Portfolio Highlight |
| Business / Management | Management Skills · Domains · Methodologies · Stakeholders | Key Initiatives |
| Science / Research | Research Methods · Lab Skills · Instruments · Publications | Research Highlight |
| Trades / Technical | Trade Certifications · Equipment · Safety Standards · Codes | Major Project |
| Sales / Marketing | Sales Skills · CRM Tools · Channels · Verticals | Revenue Achievement |

Apply the correct labels in the `skills[].category` field based on detected profession.

---

### D2. KEYWORD EXTRACTION & INJECTION

Step 1 — Extract from job description:
- Hard requirements: tools, technologies, licences, certifications explicitly listed
- Soft requirements: collaboration style, work environment, ownership level
- Domain vocabulary: profession-specific terminology used by the employer
- Seniority signals: "lead", "own", "drive", "architect", "manage", "mentor"
- Compliance/regulatory terms (critical for law, medicine, finance, engineering)

Step 2 — Score by frequency + prominence (title/requirements > nice-to-have)

Step 3 — Inject top 15–20 keywords:
- Primary landing: experience bullets (highest ATS weight)
- Secondary landing: summary (parsed first by ATS)
- Tertiary landing: skills section (lower weight but still parsed)
- Never: inject as standalone keywords in a "Keywords:" section (ATS spam flags)

Step 4 — Populate `meta.ats_keywords_used` with the injected list

---

### D3. SUMMARY RULES

The summary is the single most-read section. It must be 3–4 sentences and follow
this structure regardless of profession:

**Sentence 1 — Origin / Motivation**
Why they do this work. Not credentials, not years of experience.
Must sound like a real person reflecting on their career.

Examples by profession:
- Nurse: "I became a nurse because the most important moments in people's lives happen
  in clinical settings, and I wanted to be someone they could trust in those moments."
- Lawyer: "Contract law drew me in because the details that most people overlook are
  exactly where disputes begin and deals succeed or fail."
- Data Scientist: "I got into data science because I noticed that the organisations
  making the best decisions weren't the ones with the most data — they were the ones
  who knew what questions to ask of it."
- Architect: "Architecture matters to me because buildings outlast the people who
  build them, and every design decision is a long-term commitment to how people live."

**Sentence 2 — Journey / Scope**
Domains, geographies, or scales they have operated in. Include:
- Specific industry verticals
- Team or budget size if impressive
- Geographic or cultural scope if relevant
- Career progression arc if notable

**Sentence 3 — How they work**
Ownership style, values, methodology. Mirror the job description language.
This is where keywords land most naturally and with highest ATS weight.

**Sentence 4 — Invitation / Fit**
Warm, direct statement of intent. Not "seeking opportunities."
Sounds like a confident professional who has identified a specific fit.

**Banned phrases (never use in any profession):**
"Results-driven" · "Passionate about" · "Proven track record" · "Dynamic professional"
"Team player" · "Self-starter" · "Detail-oriented" · "Fast-paced environment"
"Leverage synergies" · "Thought leader" · "Ninja" · "Guru" · "Rockstar"
"Seeking a challenging role" · "Excellent communication skills"

---

### D4. BULLET RULES

Every experience bullet must have three components:

```
[Strong Action Verb] + [Specific Method / Tool / Approach] + [Outcome + Metric]
```

**Action verbs by profession group:**

Tech/Engineering: Architected · Engineered · Deployed · Automated · Optimised · Migrated · Integrated · Reduced · Built · Refactored

Medicine/Healthcare: Managed · Administered · Diagnosed · Coordinated · Reduced · Implemented · Supervised · Trained · Delivered · Achieved

Law/Legal: Negotiated · Drafted · Advised · Represented · Structured · Secured · Litigated · Reviewed · Managed · Closed

Finance: Managed · Structured · Executed · Modelled · Reduced · Grew · Delivered · Advised · Analysed · Optimised

Education: Designed · Taught · Mentored · Developed · Improved · Implemented · Led · Assessed · Increased · Facilitated

Creative/Design: Designed · Produced · Directed · Delivered · Grew · Increased · Led · Launched · Collaborated · Built

Science/Research: Designed · Conducted · Published · Developed · Validated · Reduced · Increased · Analysed · Collaborated · Presented

Sales/Marketing: Grew · Closed · Exceeded · Generated · Launched · Managed · Built · Converted · Increased · Led

**Metric guidance by profession:**

| Profession | Natural Metrics |
|------------|----------------|
| Engineering | Response time · Cost reduction · Uptime % · Deployment frequency |
| Healthcare | Patient volume · Complication rate · Wait time · Satisfaction scores |
| Legal | Deal value · Case win rate · Contracts reviewed · Time-to-close |
| Finance | AUM / Portfolio size · Returns % · Cost savings · Revenue impact |
| Education | Student outcomes · Pass rates · Enrollment · Assessment scores |
| Creative | Engagement % · Follower growth · Conversion rate · Campaign reach |
| Science | Sample size · Accuracy % · Publications · Grant value |
| Sales | Quota % · Revenue generated · Accounts closed · Pipeline value |
| Management | Team size · Budget managed · Efficiency gains · Headcount growth |

If candidate has no metrics: derive credible approximations from context.
Do not fabricate dollar amounts or specific headcounts without candidate confirmation.
Use ranges when uncertain: "reduced processing time by 30–40%"

---

### D5. SKILLS SECTION RULES

- Maximum 7 categories
- 4–8 items per category
- List only skills evident in experience or certifications — no aspirational skills
- Order within each category: most relevant to job description first
- Category names must match profession conventions (see D1 table)
- Skills in this section must also appear contextually in at least one bullet

---

## ═══════════════════════════════════════════════
## PART E — DESIGN SYSTEM
## (Fixed — do not alter. Applied by the Expo app renderer.)
## ═══════════════════════════════════════════════

### E1. Typography

```
Font Family:   Inter (all elements) — fallback: Helvetica Neue, Arial
               [Note for Expo: use @expo-google-fonts/inter or system font]

Name:          32pt · Bold · #1A3A5C
Job Title:     10pt · SemiBold · #1A3A5C
Subtitle:      8.5pt · Regular · #555555
Contact line:  8pt · Regular · #555555

Section Header: 8.5pt · Bold · #1A3A5C · ALL CAPS
                border-bottom: 0.75pt solid #1A3A5C · margin-bottom: 3pt

Role Title:    9pt · Bold · #1A1A1A
Company:       9pt · Bold · #1A3A5C
Separator dot: 9pt · Regular · #1A3A5C
Date/Location: 8pt · Regular · #666666

Body / Bullets: 8.5pt · Regular · #1A1A1A
Tech subtitle:  8pt · Regular · #666666
Skills label:  8.5pt · Bold · #1A3A5C
Skills value:  8.5pt · Regular · #1A1A1A
```

### E2. Colour Palette

```
Primary:    #1A3A5C  — headers, company names, accents, section titles
Body:       #1A1A1A  — all body text, role titles, bullets
Muted:      #555555  — subtitle, contact line, tech stacks, dates
Light muted:#666666  — locations, secondary metadata
White:      #FFFFFF  — background
Accent line:#1A3A5C  — section divider border (same as primary)
```

### E3. Page Layout

```
Paper:          A4 (595 × 842pt) — universal default; switch to US Letter (612 × 792pt) for US roles
Margins:        Top: 36pt · Bottom: 36pt · Left: 40pt · Right: 40pt
Content width:  515pt (A4) or 532pt (US Letter)
Column layout:  Single column (maximum ATS compatibility)
```

### E4. Spacing System

```
Name block bottom gap:     8pt
Section header top gap:    14pt
Section header bottom gap: 4pt
Role title top gap:        8pt
Role location bottom gap:  3pt
Bullet gap (between):      2.5pt
Bullet indent:             10pt hanging
Section bottom gap:        6pt
```

### E5. DOCX-Specific Values (for backend generator)

```
DXA conversions (1pt = 20 DXA, 1 inch = 1440 DXA):
Page A4:        width 11906, height 16838
Page US Letter: width 12240, height 15840
Margin 36pt:    720 DXA
Margin 40pt:    800 DXA
Font 32pt:      size: 64 (half-points)
Font 10pt:      size: 20
Font 9pt:       size: 18
Font 8.5pt:     size: 17
Font 8pt:       size: 16

Section before 14pt:  280 DXA
Section after 4pt:    80 DXA
Role before 8pt:      160 DXA
Bullet gap 2.5pt:     50 DXA
```

### E6. PDF-Specific Values (for react-native-html-to-pdf or expo-print)

```
Generate an HTML string with inline CSS matching the design system above.
Feed into expo-print or react-native-html-to-pdf.

Key CSS equivalents:
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  font-size: 8.5pt → font-size: 11.3px (1pt = 1.333px at 96dpi)
  color primary: #1A3A5C
  page-break-inside: avoid on each section
  -webkit-print-color-adjust: exact
  @page { size: A4; margin: 36pt 40pt; }
```

---

## ═══════════════════════════════════════════════
## PART F — EXPO INTEGRATION ARCHITECTURE
## ═══════════════════════════════════════════════

### F1. API Call Pattern (send to your LLM endpoint)

```javascript
// services/resumeGenerator.js

export async function generateResumeJSON(candidateData, jobDescription) {
  const systemPrompt = SYSTEM_PROMPT; // Part A of this file
  const userPrompt = buildUserPrompt(candidateData, jobDescription); // Part B template

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat:free", // or qwen/qwen3-235b-a22b:free
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt }
      ],
      temperature: 0.3,    // Low temp = consistent, structured output
      max_tokens: 4000,
      response_format: { type: "json_object" } // enforce JSON if model supports it
    })
  });

  const data = await response.json();
  const raw = data.choices[0].message.content;

  // Strip any accidental markdown fences
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
```

### F2. DOCX Generation (via backend API)

The `docx` npm package is Node.js only and cannot run in Expo directly.
Use one of these patterns:

**Option A — Dedicated backend endpoint (recommended)**
```javascript
// In your Expo app:
export async function generateDOCX(resumeJSON) {
  const response = await fetch("https://your-backend.com/api/resume/docx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resumeJSON)
  });
  // Returns a binary .docx file or a download URL
  const blob = await response.blob();
  return blob;
}

// On your backend (Node.js / Express / Next.js API route):
// Receive resumeJSON → build docx using the DOCX RENDERER below → return buffer
```

**Option B — Serverless function (Vercel / Supabase Edge / AWS Lambda)**
```javascript
// /api/resume/docx.js (Vercel API route)
import { buildDOCX } from '@/lib/docxRenderer';

export default async function handler(req, res) {
  const resumeJSON = req.body;
  const buffer = await buildDOCX(resumeJSON);
  res.setHeader('Content-Disposition', `attachment; filename="${resumeJSON.header.name}_Resume.docx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
}
```

### F3. PDF Generation (native Expo — no backend required)

```javascript
// services/pdfGenerator.js
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export async function generatePDF(resumeJSON) {
  const html = buildResumeHTML(resumeJSON); // See F4 below
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri; // local file path — share or save via FileSystem
}

export async function sharePDF(uri) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Save or Share Your Resume'
    });
  }
}
```

### F4. HTML Resume Renderer (feeds PDF generation)

```javascript
// lib/resumeHTML.js
export function buildResumeHTML(r) {
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @page { size: A4; margin: 36pt 40pt; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
           font-size: 11.3px; color: #1A1A1A; background: #fff;
           -webkit-print-color-adjust: exact; }
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
  `;

  const header = `
    <div class="name">${r.header.name}</div>
    <div class="title">${r.header.title}</div>
    <div class="subtitle">${r.header.subtitle}</div>
    <div class="contact">
      ${r.header.email} &nbsp;·&nbsp; ${r.header.phone}
      ${r.header.linkedin ? ` &nbsp;·&nbsp; ${r.header.linkedin}` : ''}
      ${r.header.portfolio ? ` &nbsp;·&nbsp; ${r.header.portfolio}` : ''}
      &nbsp;·&nbsp; ${r.header.location}
    </div>
  `;

  const summary = r.sections_to_include.summary ? `
    <div class="section-header">Summary</div>
    <p style="font-size:11.3px;line-height:1.5;">${r.summary.text}</p>
  ` : '';

  const skills = r.sections_to_include.skills ? `
    <div class="section-header">Skills</div>
    <table class="skills-table">
      ${r.skills.map(s => `
        <tr>
          <td class="skills-label">${s.category}</td>
          <td class="skills-value">${s.items.join(' · ')}</td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  const experience = r.sections_to_include.experience ? `
    <div class="section-header">Experience</div>
    ${r.experience.map(e => `
      <div class="role-block">
        <div class="role-line">
          <span>
            <span class="role-title">${e.title}</span>
            <span class="separator">·</span>
            <span class="company">${e.company}</span>
          </span>
          <span class="date">${e.date_range}</span>
        </div>
        <div class="location">${e.location}</div>
        <ul>${e.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      </div>
    `).join('')}
  ` : '';

  const project = r.sections_to_include.featured_project && r.featured_project.include ? `
    <div class="section-header">Featured Project</div>
    <div class="role-block">
      <div class="role-title">${r.featured_project.name}</div>
      <div class="tech-stack">${r.featured_project.tech_stack}</div>
      <ul><li>${r.featured_project.bullet}</li></ul>
    </div>
  ` : '';

  const education = r.sections_to_include.education ? `
    <div class="section-header">Education & Certifications</div>
    ${r.education.map(e => `
      <div class="edu-line">
        <span class="edu-degree">${e.degree}</span>
        <span class="date">${e.year}</span>
      </div>
      <div class="edu-school">${e.institution}${e.note ? ' · ' + e.note : ''}</div>
    `).join('<br style="margin:2pt 0">')}
    ${r.certifications.length > 0 ? `
      <div class="certs">
        <span class="certs-label">Certifications: </span>
        ${r.certifications.join(' · ')}
      </div>
    ` : ''}
  ` : '';

  const languages = r.sections_to_include.languages && r.languages.length > 0 ? `
    <div class="section-header">Languages</div>
    <p style="font-size:11.3px;">${r.languages.map(l => `${l.language} (${l.proficiency})`).join(' · ')}</p>
  ` : '';

  const recognition = r.sections_to_include.recognition && r.recognition.length > 0 ? `
    <div class="section-header">Recognition & Awards</div>
    <ul>${r.recognition.map(item => `<li>${item}</li>`).join('')}</ul>
  ` : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>${css}</style></head><body>
    ${header}${summary}${skills}${experience}${project}${education}${languages}${recognition}
  </body></html>`;
}
```

### F5. DOCX Backend Renderer

```javascript
// lib/docxRenderer.js (Node.js backend only)
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        BorderStyle, WidthType, ShadingType, TabStopType } = require('docx');

const BLUE  = "1A3A5C";
const DARK  = "1A1A1A";
const MID   = "555555";
const LIGHT = "666666";
const WHITE = "FFFFFF";

const t  = (text, o={}) => new TextRun({ text, font:"Inter", size:17, color:DARK, ...o });
const bt = (text, o={}) => new TextRun({ text, font:"Inter", size:18, bold:true, color:DARK, ...o });
const bl = (text, o={}) => new TextRun({ text, font:"Inter", size:18, bold:true, color:BLUE, ...o });
const gr = (text, o={}) => new TextRun({ text, font:"Inter", size:16, color:LIGHT, ...o });

const sec = (label) => new Paragraph({
  spacing: { before: 280, after: 80 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 }},
  children: [ new TextRun({ text: label.toUpperCase(),
    font:"Inter", size:17, bold:true, color:BLUE, allCaps:true }) ]
});

const bul = (text) => new Paragraph({
  spacing: { before: 50, after: 50 },
  indent: { left: 200, hanging: 200 },
  bullet: { level: 0 },
  children: [ t(text, { size: 17 }) ]
});

module.exports.buildDOCX = async function(r) {
  const children = [];

  // HEADER
  children.push(
    new Paragraph({ children: [ new TextRun({
      text: r.header.name, font:"Inter", size:64, bold:true, color:BLUE })]}),
    new Paragraph({ spacing:{after:40}, children: [ new TextRun({
      text: r.header.title, font:"Inter", size:20, bold:true, color:BLUE })]}),
    new Paragraph({ spacing:{after:40}, children: [ new TextRun({
      text: r.header.subtitle, font:"Inter", size:17, color:MID })]}),
    new Paragraph({ spacing:{after:200}, children: [ new TextRun({
      text: [r.header.email, r.header.phone, r.header.linkedin,
             r.header.portfolio, r.header.location].filter(Boolean).join('  ·  '),
      font:"Inter", size:16, color:MID })]})
  );

  // SUMMARY
  if (r.sections_to_include.summary) {
    children.push(sec("Summary"), new Paragraph({
      spacing:{ before:80, after:80 },
      children:[ t(r.summary.text, { size:17 }) ]
    }));
  }

  // SKILLS TABLE
  if (r.sections_to_include.skills) {
    const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
    const borders = { top:noBorder, bottom:noBorder, left:noBorder, right:noBorder };
    children.push(sec("Skills"), new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { ...borders, insideH:noBorder, insideV:noBorder },
      rows: r.skills.map(s => new TableRow({ children: [
        new TableCell({ width:{size:2000, type:WidthType.DXA}, borders,
          shading:{type:ShadingType.CLEAR, fill:WHITE},
          children:[new Paragraph({ children:[bl(s.category)] })] }),
        new TableCell({ borders, shading:{type:ShadingType.CLEAR, fill:WHITE},
          children:[new Paragraph({ children:[t(s.items.join(', '), {size:17})] })] })
      ]}))
    }));
  }

  // EXPERIENCE
  if (r.sections_to_include.experience) {
    children.push(sec("Experience"));
    r.experience.forEach(e => {
      children.push(
        new Paragraph({ spacing:{before:160, after:0},
          tabStops:[{type:TabStopType.RIGHT, position:9360}],
          children:[ bt(e.title), t("  ·  ",{color:BLUE}), bl(e.company),
                     t("\t"), gr(e.date_range) ] }),
        new Paragraph({ spacing:{before:0, after:60},
          children:[ gr(e.location) ] }),
        ...e.bullets.map(b => bul(b))
      );
    });
  }

  // FEATURED PROJECT
  if (r.sections_to_include.featured_project && r.featured_project.include) {
    children.push(sec("Featured Project"),
      new Paragraph({ spacing:{before:160, after:0},
        children:[ bt(r.featured_project.name) ] }),
      new Paragraph({ spacing:{before:0, after:60},
        children:[ gr(r.featured_project.tech_stack) ] }),
      bul(r.featured_project.bullet)
    );
  }

  // EDUCATION & CERTIFICATIONS
  if (r.sections_to_include.education) {
    children.push(sec("Education & Certifications"));
    r.education.forEach(e => {
      children.push(
        new Paragraph({ spacing:{before:120, after:0},
          tabStops:[{type:TabStopType.RIGHT, position:9360}],
          children:[ bt(e.degree), t("\t"), gr(e.year) ] }),
        new Paragraph({ spacing:{before:0, after:40},
          children:[ t(e.institution + (e.note ? ' · ' + e.note : ''), {color:MID, size:17}) ] })
      );
    });
    if (r.certifications.length > 0) {
      children.push(new Paragraph({ spacing:{before:60, after:0}, children:[
        new TextRun({text:"Certifications: ", font:"Inter", size:17, bold:true, color:BLUE}),
        t(r.certifications.join(' · '), {size:17})
      ]}));
    }
  }

  // LANGUAGES
  if (r.sections_to_include.languages && r.languages.length > 0) {
    children.push(sec("Languages"), new Paragraph({
      spacing:{before:80, after:0},
      children:[ t(r.languages.map(l=>`${l.language} (${l.proficiency})`).join(' · '), {size:17}) ]
    }));
  }

  // RECOGNITION
  if (r.sections_to_include.recognition && r.recognition.length > 0) {
    children.push(sec("Recognition & Awards"), ...r.recognition.map(item => bul(item)));
  }

  const doc = new Document({
    styles:{ default:{ document:{ run:{ font:"Inter", size:17, color:DARK }}}},
    sections:[{ properties:{
      page:{ size:{width:11906, height:16838},
             margin:{top:720, right:800, bottom:720, left:800} }
    }, children }]
  });

  return await Packer.toBuffer(doc);
};
```

---

## ═══════════════════════════════════════════════
## PART G — VALIDATION CHECKLIST
## (LLM self-review before finalising JSON output)
## ═══════════════════════════════════════════════

Before returning JSON, verify every item:

**Content**
- [ ] Summary is 3–4 sentences, story-first, zero banned phrases
- [ ] Every bullet has: action verb + method + metric
- [ ] Skills only list items that appear in experience or certifications
- [ ] Featured project bullet has at least one quantified outcome
- [ ] All keywords from job description appear naturally in bullets or summary
- [ ] `meta.ats_keywords_used` is populated with injected keywords

**Structure**
- [ ] JSON is valid and complete — no missing keys from the schema
- [ ] All string values are populated — no nulls, only empty strings if truly empty
- [ ] `sections_to_include` flags are set to control page density
- [ ] Profession-appropriate skill category labels are used
- [ ] `meta.page_fit_estimate` reflects actual content density

**Quality gate — The 6-Second Recruiter Test**
A recruiter reading for 6 seconds must immediately identify:
→ What the candidate does (title + subtitle)
→ How experienced they are (date ranges + role progression)
→ Whether they match the role (keywords in first 2 bullets of most recent role)
→ One memorable achievement (featured project or top recognition item)

If any of the four fails, rewrite until all four pass.

---

## ═══════════════════════════════════════════════
## PART H — RECOMMENDED MODELS FOR THIS PROMPT
## ═══════════════════════════════════════════════

| Model | Performance | Notes |
|-------|-------------|-------|
| `deepseek/deepseek-chat:free` | ★★★★★ | Best JSON adherence, strong writing quality |
| `qwen/qwen3-235b-a22b:free` | ★★★★☆ | Excellent at keyword extraction and bullet rewriting |
| `meta-llama/llama-4-maverick:free` | ★★★★☆ | Fast, reliable, good instruction following |
| `meta-llama/llama-3.3-70b-instruct:free` | ★★★☆☆ | Solid fallback, slightly less structured JSON |
| `deepseek/deepseek-r1:free` | ★★★☆☆ | Better for reasoning-heavy edge cases |

Set `temperature: 0.3` for all models.
Set `response_format: { type: "json_object" }` where supported.
Always strip markdown fences from response before parsing.