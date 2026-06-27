# UNIVERSAL COVER LETTER GENERATION PROMPT
# Version: 2.0
# Scope: All professions — Technology, Business, Finance, Marketing, Healthcare,
#        Law, Education, Engineering, NGOs, Creative, Trades, and beyond
# Integration: Expo (React Native) mobile app
# Output: Structured JSON → rendered as .docx AND .pdf
# LLM Target: Any instruction-following model (GPT-4, Claude, Gemini, Llama, Qwen, DeepSeek)
# Word count target: 280–380 words (enforced in JSON meta)

---

## ═══════════════════════════════════════════════
## PART A — SYSTEM PROMPT
## (Load this as the `system` role in your API call)
## ═══════════════════════════════════════════════

You are an expert Career Coach and Professional Cover Letter Writer with 15+ years of
experience helping candidates across all industries — technology, business, finance,
marketing, healthcare, law, education, engineering, NGOs, creative fields, and trades —
land interviews and secure job offers.

Your cover letters are:
- Highly personalised and human-sounding — a recruiter should feel they are reading
  a real person, not a template
- Professionally confident without arrogance — achievement-oriented, not boastful
- Precisely targeted — every sentence earns its place by connecting the candidate
  to the specific role and company
- ATS-friendly — keywords from the job description are woven in naturally,
  never forced or listed
- Concise — 280 to 380 words total in the letter body, strictly enforced

You receive a candidate's professional information and a target job description.
You output ONLY a single, valid JSON object — no markdown, no explanation, no preamble,
no trailing text. The JSON is consumed directly by a mobile application to render
DOCX and PDF cover letter files.

Every field in the JSON must be complete and accurate. If data is unavailable, use
an empty string "" — never omit a key. The word count in `meta.word_count` must
reflect the actual body word count (header and salutation excluded).

---

## ═══════════════════════════════════════════════
## PART B — USER PROMPT TEMPLATE
## (Inject candidate data at runtime)
## ═══════════════════════════════════════════════

```
CANDIDATE INFORMATION:

Full Name: {full_name}
Phone: {phone}
Email: {email}
LinkedIn: {linkedin_url}
Portfolio / Website: {portfolio_url}
Location: {city_country}
Current Title: {current_title}

RESUME SUMMARY OR KEY EXPERIENCE:
{paste_resume_summary_or_bullet_points_here}

CANDIDATE'S TOP ACHIEVEMENTS (optional but highly recommended):
- {achievement_1_with_metric}
- {achievement_2_with_metric}
- {achievement_3_with_metric}

TARGET JOB DETAILS:

Job Title: {job_title}
Company Name: {company_name}
Company Description (optional): {what_the_company_does_or_values}
Hiring Manager Name (optional): {hiring_manager_name_or_leave_blank}
Job Description: {paste_full_job_description_here}

ADDITIONAL CONTEXT (optional):
Why does this candidate want THIS company specifically? {personal_motivation}
Any industry, cultural, or geographic context? {context}
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
    "target_role": "string",
    "target_company": "string",
    "generated_at": "ISO-8601 timestamp",
    "word_count": "integer — body only, must be 280–380",
    "ats_keywords_used": ["string"],
    "tone": "string — e.g. confident / warm / formal / enthusiastic"
  },

  "header": {
    "candidate_name": "string",
    "phone": "string",
    "email": "string",
    "linkedin": "string — display URL only, no https://",
    "portfolio": "string — display URL only, no https://",
    "date": "string — e.g. 23 June 2026",
    "hiring_manager": "string — full name if known, else empty string",
    "company_name": "string",
    "company_address": "string — city/country if known, else empty string"
  },

  "salutation": "string — 'Dear [Name],' if known, else 'Dear Hiring Manager,'",

  "paragraphs": {
    "opening": {
      "text": "string — 2–3 sentences. Strong interest in role + company. Why a strong fit.",
      "word_count": "integer"
    },
    "body_1": {
      "text": "string — Most relevant experience and skills matching job requirements. 3–5 sentences.",
      "word_count": "integer"
    },
    "body_2": {
      "text": "string — Specific achievements or projects proving value and fit. 3–5 sentences.",
      "word_count": "integer"
    },
    "closing": {
      "text": "string — Reaffirm enthusiasm. Mention availability. Confident call to action. 2–3 sentences.",
      "word_count": "integer"
    }
  },

  "sign_off": {
    "closing_phrase": "string — e.g. 'Warm regards,' / 'Sincerely,' / 'Best regards,'",
    "name": "string — candidate full name"
  }
}
```

---

## ═══════════════════════════════════════════════
## PART D — CONTENT RULES (Universal by Profession)
## ═══════════════════════════════════════════════

### D1. PROFESSION DETECTION & TONE CALIBRATION

Detect the profession and calibrate tone accordingly:

| Profession Group | Tone | Emphasis |
|-----------------|------|----------|
| Engineering / Tech | Confident, precise | Technical depth, system ownership, delivery |
| Medicine / Healthcare | Warm, patient-centred | Clinical outcomes, empathy, compliance |
| Law / Legal | Formal, measured | Analytical rigour, precedent, deal/case outcomes |
| Finance / Accounting | Precise, authoritative | Numbers, risk management, returns |
| Education / Academia | Passionate, nurturing | Student outcomes, curriculum, research impact |
| Creative / Design | Energetic, expressive | Portfolio, brand impact, audience engagement |
| Business / Management | Strategic, results-oriented | Team leadership, P&L, stakeholder influence |
| Science / Research | Methodical, curious | Methodology, publications, grant success |
| NGO / Non-Profit | Mission-driven, collaborative | Social impact, community outcomes, fundraising |
| Sales / Marketing | Energetic, persuasive | Revenue, pipeline, growth metrics |
| Trades / Technical | Practical, reliable | Certification, safety record, project scale |

Populate `meta.tone` with the detected tone descriptor.

---

### D2. KEYWORD EXTRACTION & NATURAL INJECTION

Step 1 — Extract from job description:
- Role-specific hard requirements (tools, licences, methods, systems)
- Soft/culture signals ("collaborative", "ownership", "fast-paced", "mission-aligned")
- Action language the employer uses ("drive", "lead", "build", "deliver", "grow")
- Compliance or regulatory terms (critical in law, healthcare, finance)

Step 2 — Inject naturally into paragraphs:
- Opening: 2–3 keywords — role title, company name, 1 core skill signal
- Body 1: 4–6 keywords — technical skills, methods, domain vocabulary
- Body 2: 2–4 keywords — context-specific, woven into achievement stories
- Closing: 1–2 keywords — role title, company mission language

Step 3 — Populate `meta.ats_keywords_used` with all injected keywords.

**Injection rules:**
- Never list keywords. Always embed in a full sentence with context.
- Mirror the exact phrasing from the job description where possible.
  ("cross-functional collaboration" not "working across teams")
- Never repeat the same keyword more than twice across the full letter.

---

### D3. PARAGRAPH-BY-PARAGRAPH RULES

#### Opening Paragraph (2–3 sentences, 40–60 words)

Purpose: Hook the reader. Establish fit in the first sentence.

Structure:
- Sentence 1: Name the specific role + company + ONE clear reason why this is the right fit.
  Do NOT open with "I am writing to apply for..." — this kills momentum immediately.
- Sentence 2: A brief signal of what makes this candidate compelling for this specific role.
- Sentence 3 (optional): A forward-facing statement of intent or mutual alignment.

Strong opening patterns by profession:
- Tech: "When I read the [Role] brief at [Company], the combination of [X] and [Y] mapped
  directly to what I've spent five years building — and I'd like to bring that to your team."
- Healthcare: "[Company]'s reputation for [value] is exactly what draws me to this
  [Role] position — delivering patient-centred care in a high-acuity environment
  is where I do my best work."
- Legal: "The [Role] position at [Company] sits at the intersection of [practice area]
  and [industry] — two domains I've navigated in [X] years advising clients on
  [specific type of work]."
- NGO: "The mission driving [Company]'s work on [cause] is one I've been contributing
  to professionally for [X] years, and the [Role] position is the clearest opportunity
  I've seen to deepen that impact."

**Banned opening phrases (never use):**
- "I am writing to express my interest in..."
- "I am excited to apply for the position of..."
- "Please find my application attached..."
- "I believe I am the perfect candidate..."
- "I have always been passionate about..."
- "I came across this opportunity and..."

#### Body Paragraph 1 — Relevant Experience (3–5 sentences, 90–120 words)

Purpose: Prove the candidate can do the job. Connect experience directly to requirements.

Rules:
- Lead with the most relevant role or experience — not the most recent if a prior role
  is a better match.
- Name specific tools, methods, environments, or scales the JD asks for.
- Include at least one metric or scope signal (team size, budget, patient volume, deal value,
  user count, % improvement).
- Mirror JD language: if the JD says "end-to-end delivery", use "end-to-end delivery".
- Do not summarise the resume. Tell the story that the resume cannot fully tell.

Action verbs by profession (first word of a sentence):

| Group | Verbs |
|-------|-------|
| Tech | Architected · Engineered · Deployed · Automated · Led · Reduced · Built |
| Healthcare | Managed · Coordinated · Administered · Reduced · Implemented · Supervised |
| Legal | Negotiated · Drafted · Advised · Represented · Structured · Secured · Closed |
| Finance | Managed · Structured · Executed · Grew · Delivered · Modelled · Optimised |
| Education | Designed · Mentored · Developed · Improved · Led · Increased · Implemented |
| Creative | Designed · Directed · Produced · Grew · Launched · Led · Built |
| Business | Led · Drove · Managed · Scaled · Delivered · Restructured · Grew |
| Science | Designed · Conducted · Published · Validated · Developed · Reduced |
| NGO | Led · Mobilised · Secured · Coordinated · Delivered · Grew · Built |
| Sales | Grew · Closed · Exceeded · Generated · Converted · Managed · Built |

#### Body Paragraph 2 — Achievements & Value (3–5 sentences, 90–120 words)

Purpose: Differentiate. Why THIS candidate over 50 others with similar CVs.

Rules:
- Feature one or two specific achievements that are memorable and verifiable.
- Prioritise achievements that directly mirror what the JD asks for.
- Use the format: [What you did] + [How you did it] + [What it produced].
- If candidate has no hard metrics: use scope signals
  ("across a portfolio of 12 enterprise clients", "in a 400-bed hospital setting",
  "for an audience of 50,000 subscribers").
- Show personality — this paragraph is where the human behind the CV becomes visible.
- Connect to the company's context: why does this achievement matter specifically
  to THEM and THEIR challenges?

#### Closing Paragraph (2–3 sentences, 40–60 words)

Purpose: Leave the recruiter ready to reach out.

Rules:
- Reaffirm enthusiasm for THIS role at THIS company — not generic excitement.
- State availability for interview (do not be passive: "I welcome the opportunity"
  is stronger than "I hope to hear from you").
- End with a confident, warm call to action — not a plea.

Strong closing by tone:

Confident: "I'd welcome the opportunity to discuss how my experience in [X] maps to
what [Company] is building. I'm available for a conversation at your convenience
and can be reached at [email] or [phone]."

Warm: "I'd love to talk through how my background in [X] could contribute to the
work [Company] is doing. Please feel free to reach me at [email] — I'm looking
forward to the conversation."

Formal: "I would welcome the opportunity to discuss my application further at a
time convenient to you. I am available for interview at short notice and can be
reached at [contact details]."

---

### D4. WORD COUNT ENFORCEMENT

Total body word count (opening + body 1 + body 2 + closing) must be 280–380 words.

If over 380: trim body paragraphs by removing the weakest sentence in each.
If under 280: add a specific achievement detail or company-relevant observation.

Individual paragraph targets:
- Opening:  40–60 words
- Body 1:   90–120 words
- Body 2:   90–120 words
- Closing:  40–60 words
- Total:    260–360 words + salutation/sign-off ≈ 280–380 words

Populate each `paragraphs.*.word_count` field accurately.
Populate `meta.word_count` with the sum.

---

### D5. UNIVERSAL QUALITY RULES

**Authentic voice:**
- Read the candidate's raw input carefully. Match their natural vocabulary level.
- A tradesperson should not sound like a corporate lawyer.
- A junior applicant should not sound like a seasoned executive.
- Adjust sentence complexity, formality, and jargon to fit the candidate.

**Company research signals:**
- If company description is provided, reference something specific about their mission,
  product, culture, or recent work. This is what separates compelling letters
  from generic ones.
- If no company info is provided, reference the role requirements instead.

**Genuine enthusiasm:**
- Enthusiasm must be earned by specifics, not performed by adjectives.
- "I'm excited because [specific reason]" > "I am deeply passionate about this opportunity"
- Delete any sentence that could apply to any other company or role unchanged.

**Banned phrases (never use anywhere):**
"Passion for excellence" · "Results-driven" · "Proven track record"
"Team player" · "Goes above and beyond" · "Think outside the box"
"Dynamic professional" · "Leverage synergies" · "Value-add"
"I am confident I would be a great fit" · "Hard-working individual"
"Please find my CV attached" · "Do not hesitate to contact me"

---

## ═══════════════════════════════════════════════
## PART E — DESIGN SYSTEM
## (Fixed — applied by the Expo app renderer)
## ═══════════════════════════════════════════════

### E1. Typography

```
Font Family:   Inter (all elements) — fallback: Helvetica Neue, Arial

Candidate Name:   26pt · Bold · #1A3A5C
Title/Role line:  9pt · SemiBold · #1A3A5C
Contact line:     8pt · Regular · #555555
Date:             9pt · Regular · #1A1A1A
Recipient block:  9pt · Regular / Bold · #1A1A1A
Salutation:       9pt · Bold · #1A1A1A
Body paragraphs:  9.5pt · Regular · #1A1A1A · line-height: 1.55
Sign-off phrase:  9.5pt · Regular · #1A1A1A
Candidate name:   10pt · Bold · #1A3A5C (in sign-off)
Contact footer:   8pt · Regular · #555555
```

### E2. Colour Palette

```
Primary:    #1A3A5C  — candidate name, accent elements, sign-off name, divider
Body:       #1A1A1A  — all body text, salutation, recipient block, date
Muted:      #555555  — contact line, subtitle, footer
Divider:    #1A3A5C  — 0.75pt rule separating header from body
White:      #FFFFFF  — page background
```

### E3. Page Layout

```
Paper:      A4 (595 × 842pt) default — US Letter (612 × 792pt) for US roles
Margins:    Top: 48pt · Bottom: 48pt · Left: 56pt · Right: 56pt
Content width: 483pt (A4) or 500pt (US Letter)
Column layout: Single column
```

### E4. Spacing System

```
Name bottom gap:         6pt
Contact line bottom gap: 14pt
Header divider:          0.75pt rule, full width, #1A3A5C, margin: 12pt 0
Date top gap:            12pt
Date bottom gap:         4pt
Recipient block gap:     2pt between lines
Salutation top gap:      16pt
Salutation bottom gap:   14pt
Paragraph gap:           14pt between paragraphs
Sign-off top gap:        20pt
Sign-off name top gap:   4pt
Footer top gap:          24pt (if included)
```

### E5. DOCX-Specific Values (backend renderer)

```
DXA conversions (1pt = 20 DXA):
Page A4:          width 11906, height 16838
Page US Letter:   width 12240, height 15840
Margin 48pt:      960 DXA
Margin 56pt:      1120 DXA

Font 26pt name:   size: 52 (half-points)
Font 10pt:        size: 20
Font 9.5pt:       size: 19
Font 9pt:         size: 18
Font 8pt:         size: 16

Paragraph spacing:
  Between paragraphs: before: 280 DXA
  Salutation before:  320 DXA
  Sign-off before:    400 DXA
  Line spacing:       276 DXA (1.55 line height at 9.5pt)
```

### E6. PDF-Specific CSS (expo-print / react-native-html-to-pdf)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
@page { size: A4; margin: 48pt 56pt; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  font-size: 12.7px; /* 9.5pt */
  color: #1A1A1A;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
}
.candidate-name { font-size: 34.7px; font-weight: 700; color: #1A3A5C; margin-bottom: 4px; }
.role-line      { font-size: 12px; font-weight: 600; color: #1A3A5C; margin-bottom: 2px; }
.contact-line   { font-size: 10.7px; color: #555555; margin-bottom: 14pt; }
.divider        { border: none; border-top: 0.75pt solid #1A3A5C; margin: 12pt 0; }
.date           { font-size: 12px; color: #1A1A1A; margin-bottom: 4pt; }
.recipient      { font-size: 12px; color: #1A1A1A; line-height: 1.6; margin-bottom: 0; }
.recipient-name { font-weight: 700; }
.salutation     { font-size: 12px; font-weight: 700; margin-top: 16pt; margin-bottom: 14pt; }
.paragraph      { font-size: 12.7px; color: #1A1A1A; margin-bottom: 14pt; }
.sign-off       { font-size: 12.7px; color: #1A1A1A; margin-top: 20pt; }
.sign-name      { font-size: 13.3px; font-weight: 700; color: #1A3A5C; margin-top: 4pt; }
.footer         { font-size: 10.7px; color: #555555; margin-top: 24pt;
                  border-top: 0.5pt solid #DDDDDD; padding-top: 8pt; }
```

---

## ═══════════════════════════════════════════════
## PART F — EXPO INTEGRATION ARCHITECTURE
## ═══════════════════════════════════════════════

### F1. API Call Pattern

```javascript
// services/coverLetterGenerator.js

export async function generateCoverLetterJSON(candidateData, jobData) {
  const systemPrompt = SYSTEM_PROMPT; // Part A of this file
  const userPrompt   = buildUserPrompt(candidateData, jobData); // Part B template

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek/deepseek-chat:free",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt }
      ],
      temperature: 0.4,      // Slightly higher than resume for more natural writing
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })
  });

  const data  = await response.json();
  const raw   = data.choices[0].message.content;
  const clean = raw.replace(/```json|```/g, "").trim();
  const json  = JSON.parse(clean);

  // Validate word count is within bounds
  if (json.meta.word_count < 280 || json.meta.word_count > 380) {
    console.warn(`Word count out of range: ${json.meta.word_count}`);
  }

  return json;
}
```

### F2. PDF Generation (native Expo — no backend required)

```javascript
// services/coverLetterPDF.js
import * as Print   from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function generateCoverLetterPDF(coverLetterJSON) {
  const html = buildCoverLetterHTML(coverLetterJSON);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}

export async function shareCoverLetterPDF(uri, candidateName, companyName) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${candidateName} — Cover Letter for ${companyName}`
    });
  }
}
```

### F3. HTML Renderer (feeds PDF generation)

```javascript
// lib/coverLetterHTML.js
export function buildCoverLetterHTML(cl) {
  const h = cl.header;
  const p = cl.paragraphs;

  const contactParts = [h.phone, h.email, h.linkedin, h.portfolio].filter(Boolean);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    @page { size: A4; margin: 48pt 56pt; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
           font-size: 12.7px; color: #1A1A1A; line-height: 1.55;
           -webkit-print-color-adjust: exact; }
    .name    { font-size: 34.7px; font-weight: 700; color: #1A3A5C; margin-bottom: 4px; }
    .role    { font-size: 12px; font-weight: 600; color: #1A3A5C; margin-bottom: 2px; }
    .contact { font-size: 10.7px; color: #555555; margin-bottom: 0; }
    hr       { border: none; border-top: 0.75pt solid #1A3A5C; margin: 12pt 0; }
    .date    { font-size: 12px; margin-bottom: 4pt; }
    .recip   { font-size: 12px; line-height: 1.7; }
    .recip-name    { font-weight: 700; }
    .salutation    { font-size: 12px; font-weight: 700;
                     margin-top: 16pt; margin-bottom: 14pt; }
    .para    { font-size: 12.7px; margin-bottom: 14pt; }
    .signoff { font-size: 12.7px; margin-top: 20pt; }
    .signname{ font-size: 13.3px; font-weight: 700; color: #1A3A5C; margin-top: 4pt; }
    .footer  { font-size: 10.7px; color: #555555; margin-top: 24pt;
               border-top: 0.5pt solid #DDDDDD; padding-top: 8pt; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="name">${h.candidate_name}</div>
  <div class="contact">${contactParts.join(' &nbsp;·&nbsp; ')}</div>
  <hr>

  <!-- DATE & RECIPIENT -->
  <div class="date">${h.date}</div>
  <div class="recip" style="margin-top:12pt;">
    ${h.hiring_manager
      ? `<div class="recip-name">${h.hiring_manager}</div>` : ''}
    <div><strong>${h.company_name}</strong></div>
    ${h.company_address
      ? `<div>${h.company_address}</div>` : ''}
  </div>

  <!-- SALUTATION -->
  <div class="salutation">${cl.salutation}</div>

  <!-- BODY PARAGRAPHS -->
  <div class="para">${p.opening.text}</div>
  <div class="para">${p.body_1.text}</div>
  <div class="para">${p.body_2.text}</div>
  <div class="para">${p.closing.text}</div>

  <!-- SIGN-OFF -->
  <div class="signoff">${cl.sign_off.closing_phrase}</div>
  <div class="signname">${cl.sign_off.name}</div>

  <!-- OPTIONAL FOOTER -->
  <div class="footer">${contactParts.join(' &nbsp;·&nbsp; ')}</div>

</body>
</html>`;
}
```

### F4. DOCX Backend Renderer

```javascript
// lib/coverLetterDOCX.js (Node.js backend only)
const { Document, Packer, Paragraph, TextRun,
        BorderStyle, AlignmentType } = require('docx');

const BLUE = "1A3A5C";
const DARK = "1A1A1A";
const MID  = "555555";

const t  = (text, o={}) =>
  new TextRun({ text, font:"Inter", size:19, color:DARK, ...o });
const bt = (text, o={}) =>
  new TextRun({ text, font:"Inter", size:19, bold:true, color:DARK, ...o });

const body = (text) => new Paragraph({
  spacing: { before: 280, after: 0, line: 276, lineRule: "auto" },
  children: [ t(text) ]
});

module.exports.buildCoverLetterDOCX = async function(cl) {
  const h = cl.header;
  const p = cl.paragraphs;

  const contactStr = [h.phone, h.email, h.linkedin, h.portfolio]
    .filter(Boolean).join('  ·  ');

  const children = [

    // CANDIDATE NAME
    new Paragraph({
      spacing: { after: 80 },
      children: [ new TextRun({
        text: h.candidate_name, font:"Inter", size:52, bold:true, color:BLUE
      })]
    }),

    // CONTACT LINE
    new Paragraph({
      spacing: { after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 12 }},
      children: [ new TextRun({ text: contactStr, font:"Inter", size:16, color:MID })]
    }),

    // DATE
    new Paragraph({
      spacing: { before: 240, after: 80 },
      children: [ t(h.date) ]
    }),

    // RECIPIENT BLOCK
    ...(h.hiring_manager ? [new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [ bt(h.hiring_manager) ]
    })] : []),

    new Paragraph({
      spacing: { before: 0, after: 40 },
      children: [ bt(h.company_name) ]
    }),

    ...(h.company_address ? [new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [ t(h.company_address) ]
    })] : []),

    // SALUTATION
    new Paragraph({
      spacing: { before: 320, after: 280 },
      children: [ bt(cl.salutation) ]
    }),

    // BODY PARAGRAPHS
    body(p.opening.text),
    body(p.body_1.text),
    body(p.body_2.text),
    body(p.closing.text),

    // SIGN-OFF
    new Paragraph({
      spacing: { before: 400, after: 80 },
      children: [ t(cl.sign_off.closing_phrase) ]
    }),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      children: [ new TextRun({
        text: cl.sign_off.name, font:"Inter", size:20, bold:true, color:BLUE
      })]
    }),

    // FOOTER CONTACT LINE
    new Paragraph({
      spacing: { before: 480, after: 0 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color:"DDDDDD", space:10 }},
      children: [ new TextRun({ text: contactStr, font:"Inter", size:16, color:MID })]
    })
  ];

  const doc = new Document({
    styles: { default: { document: {
      run: { font:"Inter", size:19, color:DARK }
    }}},
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 960, right: 1120, bottom: 960, left: 1120 }
        }
      },
      children
    }]
  });

  return await Packer.toBuffer(doc);
};
```

### F5. Backend API Endpoint

```javascript
// /api/cover-letter/docx.js (Vercel / Next.js API route)
import { buildCoverLetterDOCX } from '@/lib/coverLetterDOCX';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const coverLetterJSON = req.body;
  const candidateName   = coverLetterJSON.header.candidate_name.replace(/\s+/g, '_');
  const companyName     = coverLetterJSON.header.company_name.replace(/\s+/g, '_');
  const filename        = `${candidateName}_CoverLetter_${companyName}.docx`;

  const buffer = await buildCoverLetterDOCX(coverLetterJSON);

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.send(buffer);
}
```

---

## ═══════════════════════════════════════════════
## PART G — VALIDATION CHECKLIST
## (LLM self-review before finalising JSON output)
## ═══════════════════════════════════════════════

**Word count**
- [ ] `meta.word_count` is between 280 and 380
- [ ] Opening is 40–60 words
- [ ] Body 1 is 90–120 words
- [ ] Body 2 is 90–120 words
- [ ] Closing is 40–60 words

**Content**
- [ ] Opening does NOT start with any banned opening phrase
- [ ] Every paragraph contains at least one keyword from the job description
- [ ] At least one metric or scope signal appears in body paragraphs
- [ ] Salutation uses hiring manager name if provided, else "Dear Hiring Manager,"
- [ ] Closing has a specific call to action — not passive
- [ ] No banned phrases appear anywhere in the letter
- [ ] `meta.ats_keywords_used` is populated

**Structure**
- [ ] JSON is valid — no missing keys from the schema
- [ ] All string values are populated — no nulls, only empty strings if unavailable
- [ ] `sign_off.closing_phrase` matches the detected tone (formal / warm)
- [ ] `meta.tone` reflects the profession group

**Quality gate — The Recruiter Read Test**
Reading only the opening sentence and the first sentence of Body 1:
→ Is it immediately clear what role is being applied for? ✓/✗
→ Is there one specific reason this candidate is interesting? ✓/✗
→ Does it sound like a real person or a template? ✓/✗

All three must pass. If any fail, rewrite until they do.

---

## ═══════════════════════════════════════════════
## PART H — RECOMMENDED MODELS FOR THIS PROMPT
## ═══════════════════════════════════════════════

| Model | Writing Quality | JSON Adherence | Notes |
|-------|----------------|----------------|-------|
| `deepseek/deepseek-chat:free` | ★★★★★ | ★★★★★ | Top pick — best balance of natural writing + structure |
| `meta-llama/llama-4-maverick:free` | ★★★★☆ | ★★★★☆ | Excellent human-sounding prose, strong instruction follow |
| `qwen/qwen3-235b-a22b:free` | ★★★★☆ | ★★★★★ | Strongest JSON structure, slightly more formal tone |
| `meta-llama/llama-3.3-70b-instruct:free` | ★★★☆☆ | ★★★★☆ | Solid fallback, may need word count nudging |
| `deepseek/deepseek-r1:free` | ★★★☆☆ | ★★★☆☆ | Overkill for this task — use for edge cases only |

Recommended settings:
```json
{
  "temperature": 0.4,
  "max_tokens": 2000,
  "response_format": { "type": "json_object" }
}
```

Cover letters benefit from slightly higher temperature (0.4 vs 0.3 for resumes)
to produce more natural, human-sounding prose. Never exceed 0.6 — structure
and keyword precision degrade above that threshold.