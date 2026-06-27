# Design System & UI/UX Specifications

**Project:** Interview Ready (Free-Tier MVP Edition)  
**Version:** 2.0.0  
**Date:** June 20, 2026  
**Reference:** Careerflow.ai visual language  
**Platform:** iOS + Android (Expo React Native)

---

## 1. Design Philosophy

> "Familiar but better." Interview Ready clones Careerflow's clean, professional SaaS aesthetic while optimizing for mobile-first interaction. Every pixel should feel trustworthy, modern, and career-focused.

### Core Principles
1. **Clarity over cleverness** — Users are stressed job seekers. Don't make them think.
2. **Speed is a feature** — Every screen must feel instant. Skeletons, optimistic UI, cached data.
3. **Progress, not perfection** — Show users their advancement (completeness scores, pipeline stages).
4. **Purple = power** — The violet accent (#6B46FE) signals AI magic and premium quality.

---

## 2. Color System

### Primary Palette

| Token | Hex | Usage |
|---|---|---|
| `violet` | `#6B46FE` | Primary buttons, active states, score rings, links |
| `violetLight` | `#EDE9FE` | Button hover, badge backgrounds, light accents |
| `violetDark` | `#4C2FD6` | Pressed states, deep accents |

### Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `success` | `#16A34A` | High scores, confirmations, positive actions |
| `successLight` | `#DCFCE7` | Success badge backgrounds |
| `warning` | `#D97706` | Medium scores, pending states, cautions |
| `warningLight` | `#FEF3C7` | Warning badge backgrounds |
| `error` | `#DC2626` | Low scores, errors, destructive actions |
| `errorLight` | `#FEE2E2` | Error badge backgrounds |

### Neutral Colors

| Token | Hex | Usage |
|---|---|---|
| `bgPrimary` | `#FFFFFF` | Main background |
| `bgSecondary` | `#F9FAFB` | Section backgrounds, cards on white |
| `bgCard` | `#FFFFFF` | Card backgrounds |
| `bgMuted` | `#F3F4F6` | Input backgrounds, disabled states |
| `textPrimary` | `#111827` | Headings, primary text |
| `textBody` | `#374151` | Body text, descriptions |
| `textMuted` | `#6B7280` | Labels, placeholders, secondary info |
| `textDisabled` | `#9CA3AF` | Disabled text |
| `textInverse` | `#FFFFFF` | Text on dark/violet backgrounds |
| `border` | `#E5E7EB` | Card borders, dividers, input borders |
| `borderFocus` | `#6B46FE` | Focused input borders |

### Score Tier Colors

| Range | Color | Token |
|---|---|---|
| 80-100 | `#16A34A` (green) | `scoreHigh` |
| 60-79 | `#D97706` (amber) | `scoreMid` |
| 0-59 | `#DC2626` (red) | `scoreLow` |

---

## 3. Typography

### Font Family
- **Primary:** Inter (weights: 400, 500, 600, 700)
- **Fallback:** System sans-serif
- **Monospace:** JetBrains Mono (for code snippets in interview prep)

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `displayLg` | 30px | 800 | 36px | -0.5px | Screen titles, hero numbers |
| `displayMd` | 24px | 700 | 30px | -0.3px | Section headers, modal titles |
| `headingLg` | 20px | 700 | 26px | -0.2px | Card titles, feature headers |
| `headingMd` | 16px | 600 | 22px | 0px | Subsection headers, list titles |
| `bodyLg` | 15px | 400 | 22px | 0px | Primary body text, descriptions |
| `bodyMd` | 14px | 400 | 20px | 0px | Secondary text, metadata |
| `bodySm` | 13px | 400 | 18px | 0px | Captions, hints, timestamps |
| `label` | 12px | 600 | 16px | 0.4px | Form labels, badges, tags |
| `caption` | 11px | 400 | 14px | 0.2px | Fine print, legal text |

### Typography Rules
- Headings use negative letter spacing for tighter, more impactful appearance
- Labels use positive letter spacing for readability at small sizes
- Body text never goes below 14px for accessibility
- Line height is 1.4-1.5x font size for comfortable reading

---

## 4. Spacing System

### Base Unit: 4px

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Icon padding, tight gaps |
| `sm` | 8px | Inline spacing, small gaps |
| `md` | 16px | Card padding, section gaps |
| `lg` | 24px | Screen padding, large gaps |
| `xl` | 32px | Section separators |
| `xxl` | 48px | Major section breaks |

### Layout Rules
- **Screen padding:** 16px horizontal (safe area aware)
- **Card padding:** 16px all sides
- **Section gap:** 24px between major sections
- **Element gap:** 12px between related elements
- **List item gap:** 8px between list items

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | 6px | Small buttons, tags, inputs |
| `md` | 10px | Cards, modals, medium elements |
| `lg` | 14px | Large cards, feature blocks |
| `xl` | 20px | Hero sections, onboarding cards |
| `full` | 9999px | CTA buttons, avatars, pills |

---

## 6. Shadows & Elevation

### Card Shadow
```javascript
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
}
```

### Modal Shadow
```javascript
{
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.12,
  shadowRadius: 24,
  elevation: 8,
}
```

### Elevation Rules
- Cards: elevation 2 (subtle, readable)
- Floating buttons: elevation 4
- Modals/bottom sheets: elevation 8
- Never use elevation on full-screen backgrounds

---

## 7. Component Specifications

### 7.1 Buttons

#### Primary Button
```
Background: #6B46FE
Text: #FFFFFF
Border Radius: 9999px (full pill)
Padding: 14px vertical, 24px horizontal
Font: bodyLg (15px), weight 600
Shadow: none (flat design)
Pressed: scale to 0.98, background #4C2FD6
Disabled: background #EDE9FE, text #9CA3AF
```

#### Secondary Button
```
Background: transparent
Border: 1.5px solid #E5E7EB
Text: #374151
Border Radius: 9999px
Padding: 14px vertical, 24px horizontal
Pressed: background #F9FAFB
```

#### Ghost Button
```
Background: transparent
Text: #6B46FE
Padding: 8px vertical, 12px horizontal
Pressed: background #EDE9FE, border-radius 8px
```

#### Icon Button
```
Size: 40px x 40px
Background: transparent or #F3F4F6
Border Radius: 10px
Icon: 20px, color #374151
Pressed: background #E5E7EB
```

### 7.2 Cards

#### Standard Card
```
Background: #FFFFFF
Border Radius: 12px
Border: 1px solid #E5E7EB
Padding: 16px
Shadow: card shadow (elevation 2)
```

#### Score Card
```
Background: #FFFFFF
Border Radius: 12px
Border: 1px solid #E5E7EB
Padding: 20px
Top accent: 4px colored bar (score tier color)
```

#### Feature Card (on dark)
```
Background: linear-gradient(135deg, #6B46FE, #4C2FD6)
Border Radius: 14px
Padding: 24px
Text: #FFFFFF
Shadow: modal shadow
```

### 7.3 Score Rings

#### Circular Progress Ring
```
Size: 80px diameter (large), 48px (small)
Stroke Width: 8px (large), 5px (small)
Track Color: #F3F4F6
Progress Color: score tier color (green/amber/red)
Animation: 1s ease-out on mount
Text Center: displayMd (24px) for large, headingMd (16px) for small
```

#### Implementation (react-native-svg)
```jsx
<Svg width={80} height={80}>
  <Circle
    cx={40} cy={40} r={36}
    stroke="#F3F4F6" strokeWidth={8} fill="none"
  />
  <Circle
    cx={40} cy={40} r={36}
    stroke={scoreColor} strokeWidth={8} fill="none"
    strokeDasharray={`${2 * Math.PI * 36}`}
    strokeDashoffset={`${2 * Math.PI * 36 * (1 - score/100)}`}
    strokeLinecap="round"
    transform="rotate(-90, 40, 40)"
  />
  <Text x={40} y={45} textAnchor="middle" fontSize={20} fontWeight="700">
    {score}
  </Text>
</Svg>
```

### 7.4 Input Fields

#### Text Input
```
Background: #F3F4F6
Border Radius: 10px
Border: 1.5px solid transparent (default), #6B46FE (focus)
Padding: 14px horizontal, 16px vertical
Font: bodyLg (15px)
Placeholder Color: #9CA3AF
Text Color: #111827
```

#### Text Area (JD Paste)
```
Background: #F3F4F6
Border Radius: 12px
Border: 1.5px solid transparent
Padding: 16px
Font: bodyMd (14px)
Min Height: 120px
Max Height: 300px
```

### 7.5 Tags & Badges

#### Score Badge
```
Background: tier color at 10% opacity
Text: tier color
Border Radius: 9999px
Padding: 4px horizontal, 6px vertical
Font: label (12px), weight 600
```

#### Skill Tag
```
Background: #F3F4F6
Text: #374151
Border Radius: 9999px
Padding: 6px horizontal, 8px vertical
Font: bodySm (13px)
```

#### Status Badge
```
Background: status color at 10% opacity
Text: status color
Border Radius: 9999px
Padding: 4px horizontal, 8px vertical
Font: label (12px), weight 600
```

### 7.6 Bottom Navigation

```
Background: #FFFFFF
Border Top: 1px solid #E5E7EB
Height: 64px + safe area
Active Icon: #6B46FE
Inactive Icon: #9CA3AF
Active Label: #6B46FE, label size
Inactive Label: #9CA3AF, label size
Icon Size: 24px
```

Tabs: Home (Job Fit), Resumes, Tracker, Network, Profile

### 7.7 Modals & Bottom Sheets

#### Bottom Sheet (Primary)
```
Background: #FFFFFF
Border Radius: 20px top corners
Shadow: modal shadow
Max Height: 85% of screen
Handle: 36px wide, 4px tall, #E5E7EB, centered top
Padding: 24px
```

#### Alert Modal
```
Background: #FFFFFF
Border Radius: 16px
Padding: 24px
Width: 85% of screen, max 360px
Shadow: modal shadow
```

### 7.8 Lists

#### Standard List Item
```
Background: #FFFFFF
Padding: 16px
Border Bottom: 1px solid #F3F4F6
Left Icon: 24px, #6B7280
Title: headingMd (16px), #111827
Subtitle: bodySm (13px), #6B7280
Right: chevron or action
```

#### Kanban Card
```
Background: #FFFFFF
Border Radius: 10px
Border Left: 4px solid (status color)
Padding: 12px
Shadow: card shadow
Margin Bottom: 8px
```

---

## 8. Screen Specifications

### 8.1 Job Fit Analyzer Screen

#### Layout
```
Header (fixed)
  - Screen title: "Job Fit Analyzer"
  - Subtitle: "Paste a job description or URL"

Scrollable Content
  - Input Section
    - Segmented control: "Paste Text" | "Enter URL"
    - Text area (Paste Text mode)
    - URL input (Enter URL mode)
    - Analyze button (full width, primary)

  - Loading State (after submit)
    - 3 animated score ring placeholders
    - Skeleton text blocks
    - "Analyzing with AI..." label

  - Results Section (after analysis)
    - Score Cards Row (horizontal scroll)
      - ATS Score ring (large)
      - Match Score ring (large)
      - Keyword Score ring (large)

    - Recommendation Badge
      - "Apply Strongly" (green) | "Apply" (blue) | "Consider" (amber) | "Skip" (red)
      - Large, centered, with icon

    - Skills Analysis Card
      - "Matched Skills" section (green tags)
      - "Missing Skills" section (red tags)
      - "Nice to Have" section (gray tags)

    - Salary Card
      - Estimated range
      - Comparison to user expectation

    - Company Intel Card
      - Size, industry, culture
      - Glassdoor rating if available

    - JD Summary Card
      - Collapsible text
      - "Read more" toggle

    - Action Buttons Row
      - "Generate Resume" (primary)
      - "Generate Cover Letter" (secondary)
      - "Save to Tracker" (ghost)
```

#### States
- **Empty:** Input area visible, no results
- **Loading:** Skeleton loaders, animated rings
- **Success:** Full results display
- **Error:** Retry button, error message
- **No Credits:** Upgrade prompt overlay

### 8.2 Resume Builder Screen

#### Layout
```
Header (fixed)
  - Screen title: "Resume Builder"
  - Template selector button

Scrollable Content
  - Template Picker (modal, not always visible)
    - 2-column grid of templates
    - Preview thumbnail
    - Name + ATS score
    - Premium lock on 4 templates

  - Resume Editor
    - Section list (draggable)
      - Header (name, title, contact)
      - Summary (editable text area)
      - Experience (expandable cards)
      - Education (expandable cards)
      - Skills (tag input)
      - Projects (expandable cards)
      - Certifications (list)

    - Each section has:
      - Drag handle (reorder)
      - Edit button
      - AI rewrite button (magic wand icon)
      - Delete button (if optional)

  - Preview Toggle
    - "Edit" | "Preview" segmented control
    - Preview shows rendered resume (WebView or PDF)

  - Floating Action Button
    - "Export" (primary, bottom right)
    - Opens export options bottom sheet
```

#### Interactions
- Tap section to expand/collapse
- Long press to drag reorder
- Tap edit to open inline editor
- Tap AI rewrite to open tone selector bottom sheet
- Swipe left on item to delete

### 8.3 Application Tracker Screen

#### Layout
```
Header (fixed)
  - Screen title: "Applications"
  - Stats button (top right)

Content (horizontal scroll for columns)
  - Kanban Board
    - Column: Saved (gray)
      - Count badge
      - Add button
      - Droppable area
    - Column: Applied (blue)
    - Column: Screening (purple)
    - Column: Interview (amber)
    - Column: Offer (green)
    - Column: Rejected (red)

  - Each card shows:
    - Company name (headingMd)
    - Role title (bodyMd)
    - ATS score badge (small ring)
    - Days since applied (caption)
    - Linked document icons (resume, cover letter)

Bottom Sheet (card detail)
  - Company + role header
  - Status selector (dropdown)
  - JD summary (collapsible)
  - Linked documents (tap to view)
  - Notes (editable text area)
  - Next action reminder
  - Delete button
```

#### Interactions
- Horizontal scroll between columns
- Long press card to drag
- Drop on column to change status
- Tap card to open detail bottom sheet
- Pull down to refresh

### 8.4 Mock Interview Screen

#### Layout
```
Header (fixed)
  - Back button
  - Interview type badge
  - Timer (if active)

Chat Interface (main content)
  - AI messages (left, gray bubble)
  - User messages (right, violet bubble)
  - Typing indicator (animated dots)
  - System messages (center, muted text)

Input Area (fixed bottom)
  - Text input
  - Send button (violet, icon)
  - End interview button (ghost, red text)

Feedback Modal (after end)
  - Overall score (large ring)
  - Score breakdown (4 smaller rings)
  - Strengths list (green checkmarks)
  - Improvements list (amber warnings)
  - Question-by-question accordion
  - "Practice Again" button
  - "Share Results" button
```

#### States
- **Setup:** Role input, type selector, start button
- **Active:** Chat interface, input enabled
- **AI Typing:** Input disabled, typing indicator shown
- **Completed:** Feedback modal overlay
- **Abandoned:** Confirm dialog, then exit

### 8.5 Onboarding Screens

#### Step 0: Welcome + Auth
```
Background: #FFFFFF (full screen)
Layout: Centered, vertical stack

Content:
  - Logo: 80px, centered, animated (subtle pulse)
  - App Name: displayLg (30px), #111827, centered
  - Tagline: bodyLg (15px), #6B7280, centered
  - Spacing: 48px below tagline

Social Auth Buttons (stacked, full width minus 32px padding):
  - Google: White bg, #111827 text, Google icon left
    Border: 1px #E5E7EB, radius 9999px, height 52px
  - LinkedIn: #0A66C2 bg, white text, LinkedIn icon left
    Border: none, radius 9999px, height 52px

Divider:
  - "or" text, bodySm, #9CA3AF
  - Horizontal lines, 1px, #E5E7EB

Email Form:
  - Email input: bg #F3F4F6, radius 10px, height 52px
  - Password input: same style, with show/hide toggle
  - Create Account button: Primary style, full width

Footer:
  - "Already have an account? Sign In" — bodySm, #6B7280
  - "Sign In" link: #6B46FE, weight 600
  - Terms text: caption (11px), #9CA3AF, centered

Skip Option (bottom):
  - "Try without account" — ghost button, #6B7280
  - Limited to 1 JD analysis, no save
```

#### Step 1: Role & Goal
```
Header:
  - Back button (←) left
  - "Step 1 of 5" — label (12px), #6B7280, centered
  - Progress bar: 20% fill, #6B46FE

Content:
  - Title: "What are you looking for?" — displayMd (24px)
  - Subtitle: "We'll tailor everything to your goals" — bodyLg, #6B7280

  Form Fields (stacked, 16px gap):
    - "Target Role" label
      Dropdown: bg #F3F4F6, radius 10px, height 52px
      Chevron down icon right
      Options: Software Engineer, Product Manager, Data Scientist, etc.

    - "Years of Experience" label
      Segmented control: 4 options
      Active: #6B46FE bg, white text, radius 8px
      Inactive: #F3F4F6 bg, #374151 text

    - "Work Preference" label
      Same segmented control style
      Options: Remote, Hybrid, Onsite

  Continue Button: Primary, full width, fixed bottom (above safe area)

  Skip Link: "Skip for now" — ghost button, centered
    Warning modal if tapped: "You'll get generic suggestions"
```

#### Step 2: Quick Profile
```
Header: Same pattern (Step 2 of 5, 40% progress)

Content:
  - Title: "Build your profile" — displayMd
  - Subtitle: "The more we know, the better your results" — bodyLg, #6B7280

  - Profile Completeness Ring (centered, 100px diameter)
    - Animated fill based on fields completed
    - Percentage text in center: displayMd
    - Label below: "Profile strength" — label (12px)

  Form Fields:
    - "Your latest role" input
    - "Company" input
    - "Key skills" tag input
      - Tap to add from suggested list
      - Custom input with comma separation
      - Tags: #F3F4F6 bg, #374151 text, radius 9999px
      - Remove: X icon on tag

  - "Continue" primary button
  - "Skip for now" ghost button (warns: generic AI)
```

#### Step 3: The Magic Moment — JD Paste
```
Header: Same pattern (Step 3 of 5, 60% progress)

Content:
  - Title: "Paste your dream job" — displayMd
  - Subtitle: "We'll analyze it in seconds" — bodyLg, #6B7280
  - Emoji/Illustration: 🎯 (48px, centered)

  Input Section:
    - Segmented control: "Paste Text" | "Enter URL"

    Text Mode:
      - TextArea: bg #F3F4F6, radius 12px, minHeight 200px
      - Placeholder: "Paste the full job description here..."
      - Character count: bodySm, #9CA3AF, bottom-right

    URL Mode:
      - Input: bg #F3F4F6, radius 10px
      - Placeholder: "https://linkedin.com/jobs/..."
      - Link icon left

  - "Analyze Job →" Primary button, full width
    - Loading state: "Analyzing with AI..." + spinner

Results State (replaces input):
  - "✅ Analysis Complete!" — headingLg, #16A34A

  Score Cards Row (horizontal scroll):
    - 3 score rings (80px each)
      - ATS Score: green/amber/red based on value
      - Match Score: same
      - Keyword Score: same
    - Labels below each: label (12px), #6B7280

  - Recommendation Badge (centered, large)
    - "Apply Strongly" — green bg, green text, radius 9999px, padding 8px 16px
    - Icon: thumbs up

  - Skills Analysis Card:
    - "Matched Skills" — green tags
    - "Missing Skills" — red tags
    - "Nice to Have" — gray tags

  - Action Buttons (stacked):
    - "Generate Tailored Resume →" Primary
    - "Save to Tracker" Secondary
    - "Share" Ghost

  - Credit indicator: "Uses 3 credits — 7 remaining" — caption, #6B7280
```

#### Step 4: Resume Generation
```
Header: Same pattern (Step 4 of 5, 80% progress)

Content:
  - Title: "Your resume is generating..." — displayMd

  Progress Animation:
    - Animated checklist (vertical, centered)
      - ✓ Analyzing your profile (green, completed)
      - ✓ Matching job keywords (green, completed)
      - → Writing summary... (violet, active, pulsing)
      - ○ Adding experience bullets... (gray, pending)
      - ○ Optimizing for ATS... (gray, pending)

    - Each item: icon (20px) + text (bodyMd) + spacing 16px
    - Active item: #6B46FE, subtle pulse animation
    - Completed: #16A34A, checkmark icon
    - Pending: #9CA3AF, circle icon

  Live Preview (below progress, if space):
    - Mini resume preview (scaled down, 60% opacity)
    - Sections appear as they're generated
    - Subtle fade-in animation per section

Success State:
  - "🎉 Your first resume is ready!" — displayMd
  - Score badge: "94/100 ATS Optimized" — green badge
  - Preview thumbnail (tap to expand)
  - "Download .docx" — Primary button
  - "Download PDF" — Secondary (premium lock if free)
  - "Edit Resume" — Ghost button
  - "Generate Cover Letter →" — Secondary (upsell)
```

#### Step 5: Discover the App
```
Header: Same pattern (Step 5 of 5, 100% progress)

Content:
  - Title: "You're all set!" — displayMd
  - Subtitle: "Here's what you can do" — bodyLg, #6B7280

  Feature Cards (stacked, 16px gap):
    - Card 1: "📋 Job Tracker"
      - "Organize your applications"
      - Arrow right icon
      - Tap to navigate

    - Card 2: "🎤 Mock Interviews"
      - "Practice with AI"
      - Arrow right icon

    - Card 3: "💼 LinkedIn Optimizer"
      - "Improve your profile"
      - Arrow right icon

  - "Go to Dashboard →" — Primary button, full width

  No forced tutorial — contextual tooltips appear on first visit to each screen
```

### Onboarding Component Specifications

#### Progress Bar
```
Height: 4px
Track: #F3F4F6
Fill: #6B46FE
Animation: width transition 300ms ease-out
Position: Below header, full width
```

#### Profile Completeness Ring
```
Size: 100px diameter (onboarding variant)
Stroke Width: 10px
Track: #F3F4F6
Fill: gradient from #6B46FE to #4C2FD6
Animation: 1s ease-out on mount
Center Text: displayMd (24px), percentage
Label Below: label (12px), #6B7280
```

#### Segmented Control
```
Container: bg #F3F4F6, radius 10px, padding 4px
Option: padding 10px 16px, radius 8px
Active: bg #6B46FE, text #FFFFFF, font-weight 600
Inactive: bg transparent, text #374151, font-weight 400
Transition: background 200ms ease
```

#### Skill Tag Input
```
Input: bg #F3F4F6, radius 10px, height 52px
Tags inside input: bg #FFFFFF, border 1px #E5E7EB
Tag text: bodySm (13px), #374151
Remove icon: 16px, #9CA3AF, tap to remove
Suggested skills below: horizontal scroll, tap to add
Suggestion pill: bg #EDE9FE, text #6B46FE, radius 9999px
```

#### Loading Checklist
```
Item height: 48px
Icon: 20px, left
Text: bodyMd (14px), left of icon
Spacing between items: 8px
Completed: #16A34A icon + text
Active: #6B46FE icon (pulsing) + text
Pending: #9CA3AF icon + text
```

### 8.6 Profile Screen

#### Layout
```
Header (collapsible)
  - Avatar (80px, rounded)
  - Name (displayMd)
  - Title (bodyLg, muted)
  - Edit button (top right)

Scrollable Content
  - Completeness Card
    - Circular progress (large)
    - Percentage text
    - "Complete your profile" CTA if < 100%

  - Plan Card
    - Current plan badge
    - Credit balance
    - Upgrade button (if free)

  - Sections
    - Personal Info
    - Contact
    - Experience (expandable list)
    - Education (expandable list)
    - Skills (tag cloud)
    - Languages
    - Certifications

  - Actions
    - "Import from LinkedIn" button
    - "AI Analyze Profile" button
    - Settings link
    - Log out button
```

---

## 9. Animation Specifications

### 9.1 Transitions

#### Screen Push
```
Type: Slide from right
Duration: 300ms
Easing: ease-out
Gesture: Swipe from left edge to go back
```

#### Modal Present
```
Type: Slide from bottom
Duration: 350ms
Easing: spring (damping: 0.8)
Background: Fade to black at 50% opacity
```

#### Bottom Sheet
```
Type: Slide from bottom
Duration: 400ms
Easing: spring (damping: 0.7)
Backdrop: Tap to dismiss, fade animation
```

### 9.2 Micro-interactions

#### Button Press
```
Scale: 1.0 → 0.97
Duration: 100ms
Easing: ease-in-out
Release: Spring back to 1.0 (200ms)
```

#### Score Ring Fill
```
Duration: 1.5s
Easing: ease-out (slow start, fast end)
Delay: 200ms after screen mount
Number count-up: Simultaneous with ring fill
```

#### Card Entrance
```
TranslateY: 20px → 0
Opacity: 0 → 1
Duration: 400ms
Easing: ease-out
Stagger: 50ms between items in list
```

#### Skeleton Shimmer
```
Background: linear-gradient(90deg, #F3F4F6, #E5E7EB, #F3F4F6)
Animation: translateX(-100%) → translateX(100%)
Duration: 1.5s
Repeat: infinite
```

#### Toast
```
TranslateY: -20px → 0
Opacity: 0 → 1
Duration: 300ms
Auto-dismiss: 3s
Exit: Fade out, 200ms
```

### 9.3 Loading States

#### Full Screen Loader
```
Centered: Logo + spinner
Background: #FFFFFF
Spinner: Violet, circular, 40px
Text: "Loading..." (bodyMd, muted)
```

#### Inline Loader
```
Size: 20px
Color: #6B46FE
Position: Inline with content
```

#### Skeleton Patterns
- **Card:** Rounded rectangle, 100% width, 120px height
- **Text:** Rounded rectangle, 80% width, 16px height
- **Avatar:** Circle, 48px diameter
- **Score ring:** Circle outline, 80px diameter

---

## 10. Responsive Behavior

### Mobile (Primary)
- Single column layout
- Bottom tab navigation
- Full-width cards
- Bottom sheets for modals
- Touch-optimized (min 44px tap targets)

### Tablet (Secondary)
- Two-column layout for lists
- Side-by-side score rings
- Larger card grids (2 columns)
- Sidebar navigation (optional)

### Orientation
- Portrait: Primary
- Landscape: Supported, adjusted layouts

---

## 11. Accessibility

### Minimum Requirements
- All interactive elements: min 44px tap target
- Color contrast: 4.5:1 minimum for text
- Screen reader labels on all icons
- Focus indicators on all inputs
- Font scaling: Support up to 200%
- Reduce motion: Respect system preference

### Screen Reader Labels
```jsx
// Icons must have labels
<Icon name="magic-wand" accessibilityLabel="AI Rewrite" />

// Complex components
<ScoreRing 
  score={85} 
  accessibilityLabel="ATS Score: 85 out of 100" 
/>

// Buttons with only icons
<TouchableOpacity accessibilityLabel="Send message">
  <Icon name="send" />
</TouchableOpacity>
```

### Focus Management
- Input focus: Border color change to violet
- Button focus: Outline ring (2px, violet, offset 2px)
- Modal focus: Trap focus within modal
- Screen reader: Announce route changes

---

## 12. Dark Mode (Phase 2)

**Note:** Dark mode is NOT in MVP. Documented here for future implementation.

```javascript
const DarkColors = {
  bgPrimary: '#0F0F0F',
  bgSecondary: '#1A1A1A',
  bgCard: '#1E1E1E',
  bgMuted: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textBody: '#E5E5E5',
  textMuted: '#A0A0A0',
  border: '#333333',
  violet: '#8B5CF6',
  violetLight: '#4C1D95',
};
```

---

## 13. Asset Requirements

### Icons (Lucide React Native)
- home, file-text, briefcase, users, user
- sparkles, wand-2, refresh-cw, download, share
- chevron-right, chevron-down, plus, minus, x
- check, alert-circle, info, lock, unlock
- send, mic, pause, play, stop
- calendar, clock, map-pin, link, mail
- star, heart, thumbs-up, message-circle

### Illustrations
- Empty state: Person searching for jobs (SVG)
- Onboarding: AI assistant helping with resume (SVG)
- Success: Person celebrating job offer (SVG)

### App Icon
- 1024x1024px
- Violet background (#6B46FE)
- White "IR" monogram or document icon
- Rounded corners (iOS) / Adaptive (Android)

### Splash Screen
- Violet background
- White logo centered
- Fade to app after 2s or auth check complete

---

## 14. Copy & Microcopy

### Tone of Voice
- **Professional but warm** — Not corporate robot, not overly casual
- **Action-oriented** — "Generate your resume" not "Your resume can be generated"
- **Encouraging** — Job searching is hard. Be supportive.
- **Clear** — No jargon. Explain AI features simply.

### Key Phrases
- "Paste a job. Land the interview." (tagline)
- "Analyzing with AI..." (loading)
- "Your resume is ready!" (success)
- "You're all set!" (onboarding complete)
- "Upgrade to unlock" (premium gate)
- "Only 3 credits left" (credit warning)

### Error Messages
- "Something went wrong. Please try again." (generic)
- "Couldn't connect to AI. Please retry." (AI failure)
- "You've used all your credits. Upgrade to continue." (credit exhausted)
- "This feature requires a premium plan." (plan gate)
- "Please check your internet connection." (offline)

---

## 15. Design Checklist

### Before Marking Any Screen Complete
- [ ] All colors use design tokens (no hardcoded hex)
- [ ] Typography follows type scale
- [ ] Spacing uses spacing system
- [ ] All interactive elements have pressed states
- [ ] Loading states designed
- [ ] Empty states designed
- [ ] Error states designed
- [ ] Accessibility labels added
- [ ] Animations implemented
- [ ] Tested on iOS (light mode)
- [ ] Tested on Android (light mode)
- [ ] Tested at 200% font scale
- [ ] Tested with screen reader

---

*Last updated: June 20, 2026*
