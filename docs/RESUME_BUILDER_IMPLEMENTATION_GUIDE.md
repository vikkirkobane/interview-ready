# Resume Builder Implementation Guide: Multi-Template Selection & Download

## Current Implementation Analysis

### ✅ What's Already Built

**Frontend (Mobile App)**
- `app/(tabs)/resumes.tsx` - Resume list view with status badges
- `app/(tabs)/new-resume.tsx` - Full resume builder with:
  - Template selection modal (2 templates: Modern, Classic)
  - Section-by-section editing (Personal Info, Summary, Experience, Skills, Education, Certifications, Awards)
  - AI rewrite functionality for summary
  - Preview generation
  - Save functionality
  - Real-time streaming support for AI generation

**Backend (Supabase Edge Functions)**
- `supabase/functions/resumes-create/index.ts` - Async resume generation with Realtime streaming
- `supabase/functions/resumes-update/index.ts` - Resume content updates
- `supabase/functions/resumes-score/index.ts` - ATS scoring

**Export System**
- `src/lib/resumeExport.ts` - PDF and DOCX export functions
- `src/lib/resumeHTML.ts` - HTML template builder

**Database**
- `resume_templates` table with 6 templates (Executive, Modern Pro, Minimal, Tech Stack, Creative, Academic)
- `resumes` table with `template_id` foreign key
- `resume_contents` table with structured content

---

## 🎯 Implementation Guide: Enhanced Template Selection & Download

### Phase 1: Expand Template Library (2-3 hours)

#### 1.1 Add Template Previews
**File:** `assets/templates/`
```
assets/templates/
├── executive.png      (✅ exists as modern.png)
├── modern-pro.png     (NEW)
├── minimal.png        (NEW)
├── tech-stack.png     (NEW)
├── creative.png       (NEW - Premium)
├── academic.png       (NEW - Premium)
```

**Action:** Create 6 template preview images (800x1132px, A4 ratio)

#### 1.2 Update Template Configuration
**File:** `app/(tabs)/new-resume.tsx`

```typescript
// Replace TEMPLATES constant (line ~40)
const TEMPLATES = [
  { 
    id: 'executive', 
    name: 'Executive', 
    description: 'Clean single-column, leadership-focused',
    atsScore: 95,
    isPremium: false,
    image: require('../../assets/templates/executive.png') 
  },
  { 
    id: 'modern-pro', 
    name: 'Modern Pro', 
    description: 'Two-column with skills sidebar',
    atsScore: 92,
    isPremium: false,
    image: require('../../assets/templates/modern-pro.png') 
  },
  { 
    id: 'minimal', 
    name: 'Minimal', 
    description: 'Whitespace-heavy, typography-driven',
    atsScore: 94,
    isPremium: false,
    image: require('../../assets/templates/minimal.png') 
  },
  { 
    id: 'tech-stack', 
    name: 'Tech Stack', 
    description: 'Projects-first, GitHub-linked',
    atsScore: 90,
    isPremium: false,
    image: require('../../assets/templates/tech-stack.png') 
  },
  { 
    id: 'creative', 
    name: 'Creative', 
    description: 'Subtle color accents, design roles',
    atsScore: 88,
    isPremium: true,
    image: require('../../assets/templates/creative.png') 
  },
  { 
    id: 'academic', 
    name: 'Academic', 
    description: 'Publications and research focus',
    atsScore: 93,
    isPremium: true,
    image: require('../../assets/templates/academic.png') 
  },
];
```

#### 1.3 Enhance Template Selection Modal
**File:** `app/(tabs)/new-resume.tsx` (line ~800+)

```typescript
// Update renderTemplateModal() function
function renderTemplateModal() {
  return (
    <Modal visible={isTemplateModalVisible} animationType="slide" transparent onRequestClose={() => setIsTemplateModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose a Template</Text>
            <TouchableOpacity onPress={() => setIsTemplateModalVisible(false)} style={styles.iconBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Select an ATS-optimized layout for your resume.</Text>

          {/* Template Grid */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.templateGrid}>
            {TEMPLATES.map(tmpl => (
              <TouchableOpacity
                key={tmpl.id}
                style={[styles.templateCard, selectedTemplateId === tmpl.id && styles.templateCardSelected]}
                onPress={() => setSelectedTemplateId(tmpl.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.templateImageContainer, selectedTemplateId === tmpl.id && styles.templateImageContainerSelected]}>
                  <Image source={tmpl.image} style={styles.templateImage} />
                  {selectedTemplateId === tmpl.id && (
                    <View style={styles.templateSelectedBadge}><Check size={14} color="#fff" /></View>
                  )}
                  {tmpl.isPremium && (
                    <View style={styles.premiumBadge}>
                      <Sparkles size={12} color="#FFD700" />
                      <Text style={styles.premiumBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, selectedTemplateId === tmpl.id && styles.templateNameSelected]}>
                    {tmpl.name}
                  </Text>
                  <Text style={styles.templateDescription}>{tmpl.description}</Text>
                  
                  {/* ATS Score Badge */}
                  <View style={styles.atsScoreBadge}>
                    <Shield size={12} color={tmpl.atsScore >= 90 ? Colors.success : Colors.warning} />
                    <Text style={[styles.atsScoreText, { color: tmpl.atsScore >= 90 ? Colors.success : Colors.warning }]}>
                      ATS {tmpl.atsScore}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.primaryBtn, !selectedTemplateId && styles.btnDisabled]}
              disabled={!selectedTemplateId}
              onPress={() => { setDraft(blankResume(selectedTemplateId)); setIsTemplateModalVisible(false); }}
            >
              <FileText size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Start Blank</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineBtn, { flex: 1 }, !selectedTemplateId && styles.btnDisabled]}
              disabled={!selectedTemplateId}
              onPress={handleAIGenerate}
            >
              <Sparkles size={18} color={Colors.primary} />
              <Text style={styles.outlineBtnText}>Generate with AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

**Add Styles:**
```typescript
// Add to styles object (line ~900+)
templateGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: Spacing.md,
  paddingBottom: Spacing.lg,
},
templateCard: {
  width: '48%', // 2 columns
  alignItems: 'flex-start',
  gap: Spacing.sm,
  opacity: 0.65,
},
templateInfo: {
  width: '100%',
  gap: 4,
},
templateDescription: {
  ...Typography.bodySm,
  fontSize: 11,
  color: Colors.textMuted,
  lineHeight: 14,
},
atsScoreBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  marginTop: 4,
},
atsScoreText: {
  ...Typography.bodySm,
  fontSize: 10,
  fontWeight: '700',
},
premiumBadge: {
  position: 'absolute',
  top: 8,
  left: 8,
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(0,0,0,0.75)',
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: Radius.sm,
  gap: 3,
},
premiumBadgeText: {
  ...Typography.bodySm,
  fontSize: 9,
  color: '#FFD700',
  fontWeight: '700',
},
```

---

### Phase 2: Implement Download Functionality (3-4 hours)

#### 2.1 Add Download Button to Resume Builder
**File:** `app/(tabs)/new-resume.tsx` (line ~700)

```typescript
// Add after Preview button in Action Row
<TouchableOpacity 
  style={[styles.exportBtn]} 
  onPress={() => setIsExportModalVisible(true)}
  disabled={!draft || updateMutation.isPending}
>
  <Download size={18} color={Colors.primary} />
  <Text style={styles.exportBtnText}>Download</Text>
</TouchableOpacity>
```

#### 2.2 Create Export Modal Component
**File:** `app/(tabs)/new-resume.tsx` (add new function)

```typescript
// Add state
const [isExportModalVisible, setIsExportModalVisible] = useState(false);
const [isExporting, setIsExporting] = useState(false);

// Add function
function renderExportModal() {
  return (
    <Modal visible={isExportModalVisible} animationType="slide" transparent onRequestClose={() => setIsExportModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Download Resume</Text>
            <TouchableOpacity onPress={() => setIsExportModalVisible(false)} style={styles.iconBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Choose your preferred format</Text>

          <View style={styles.exportOptions}>
            {/* PDF Option */}
            <TouchableOpacity
              style={styles.exportOptionCard}
              onPress={() => handleExport('pdf')}
              disabled={isExporting}
            >
              <View style={styles.exportOptionIcon}>
                <FileText size={28} color={Colors.primary} />
              </View>
              <Text style={styles.exportOptionTitle}>PDF</Text>
              <Text style={styles.exportOptionDesc}>
                Universal format, best for email & online applications
              </Text>
              {isExporting && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />}
            </TouchableOpacity>

            {/* DOCX Option */}
            <TouchableOpacity
              style={styles.exportOptionCard}
              onPress={() => handleExport('docx')}
              disabled={isExporting}
            >
              <View style={styles.exportOptionIcon}>
                <FileText size={28} color={Colors.primary} />
              </View>
              <Text style={styles.exportOptionTitle}>DOCX</Text>
              <Text style={styles.exportOptionDesc}>
                Editable format, best for ATS systems & recruiters
              </Text>
              {isExporting && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />}
            </TouchableOpacity>
          </View>

          <Text style={styles.exportNote}>
            Your resume will be formatted using the <Text style={{ fontWeight: '700' }}>{TEMPLATES.find(t => t.id === draft?.templateId)?.name}</Text> template.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// Add export handler
const handleExport = async (format: 'pdf' | 'docx') => {
  if (!draft) return;
  
  setIsExporting(true);
  
  try {
    // First save the resume
    if (id) {
      await updateMutation.mutateAsync({ id: id as string, resume_contents: [draft] });
    }

    // Prepare resume data for export
    const resumeData: any = {
      header: draft.header,
      summary: { text: draft.summary },
      experience: draft.experience,
      skills: draft.skills,
      education: draft.education,
      featured_project: draft.featuredProject,
      certifications: draft.certifications,
      recognition: draft.awards,
      sections_to_include: {
        summary: !!draft.summary,
        skills: draft.skills.length > 0,
        experience: draft.experience.length > 0,
        featured_project: !!draft.featuredProject?.include,
        education: draft.education.length > 0,
        certifications: draft.certifications.length > 0,
        languages: false,
        recognition: draft.awards.length > 0,
      }
    };

    // Export based on format
    if (format === 'pdf') {
      await exportResumePDF(resumeData);
      Toast.show({ type: 'success', text1: 'PDF Downloaded!', text2: 'Check your downloads folder' });
    } else {
      await exportResumeDOCX(resumeData);
      Toast.show({ type: 'success', text1: 'DOCX Downloaded!', text2: 'Check your downloads folder' });
    }

    addNotification({
      title: 'Resume Downloaded',
      description: `Your resume has been exported as ${format.toUpperCase()}`,
      type: 'success',
    });

    setIsExportModalVisible(false);
  } catch (error: any) {
    Toast.show({ type: 'error', text1: 'Export Failed', text2: error.message });
  } finally {
    setIsExporting(false);
  }
};

// Add to render (before closing View)
{renderExportModal()}
```

#### 2.3 Enhance Export Functions with Template Support
**File:** `src/lib/resumeExport.ts`

```typescript
// Add template parameter
export async function exportResumePDF(resume: ResumeContent, templateId?: string): Promise<void> {
  const html = buildResumeHTML(resume, templateId); // Pass template ID
  
  if (Platform.OS === 'web') {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  } else {
    if (!printToFileAsync || !shareAsync) {
      throw new Error('PDF export requires expo-print and expo-sharing.');
    }
    const { uri } = await printToFileAsync({ html });
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  }
}

export async function exportResumeDOCX(resume: ResumeContent, templateId?: string): Promise<void> {
  if (Platform.OS !== 'web') {
    throw new Error('DOCX export is available on web only.');
  }

  try {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = await import('docx');

    // Template-specific styling
    const templateStyles = getTemplateStyles(templateId);
    
    const h = resume.header;
    const children: any[] = [];

    // Apply template-specific formatting
    children.push(new Paragraph({
      children: [new TextRun({ 
        text: h.name, 
        bold: true, 
        size: templateStyles.nameSize, 
        color: templateStyles.primaryColor 
      })],
      alignment: templateStyles.headerAlignment,
    }));

    // ... rest of DOCX generation with template styles
    
    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${h.name.replace(/\s+/g, '_')}_Resume_${templateId || 'default'}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e: any) {
    throw new Error('DOCX export failed: ' + e.message);
  }
}

// Add template styles helper
function getTemplateStyles(templateId?: string) {
  const styles: Record<string, any> = {
    executive: {
      nameSize: 48,
      primaryColor: '1A3A5C',
      headerAlignment: AlignmentType.LEFT,
      sectionSpacing: 240,
    },
    'modern-pro': {
      nameSize: 44,
      primaryColor: '6B46FE',
      headerAlignment: AlignmentType.CENTER,
      sectionSpacing: 200,
    },
    minimal: {
      nameSize: 52,
      primaryColor: '000000',
      headerAlignment: AlignmentType.LEFT,
      sectionSpacing: 300,
    },
    'tech-stack': {
      nameSize: 40,
      primaryColor: '2563EB',
      headerAlignment: AlignmentType.LEFT,
      sectionSpacing: 180,
    },
    creative: {
      nameSize: 46,
      primaryColor: 'EC4899',
      headerAlignment: AlignmentType.CENTER,
      sectionSpacing: 220,
    },
    academic: {
      nameSize: 42,
      primaryColor: '1E40AF',
      headerAlignment: AlignmentType.CENTER,
      sectionSpacing: 260,
    },
  };

  return styles[templateId || 'executive'] || styles.executive;
}
```

---

### Phase 3: Template-Specific HTML Rendering (2-3 hours)

#### 3.1 Enhance HTML Builder with Template Support
**File:** `src/lib/resumeHTML.ts`

```typescript
export function buildResumeHTML(resume: ResumeContent, templateId?: string): string {
  const template = templateId || 'executive';
  
  // Template-specific CSS
  const templateCSS = getTemplateCSS(template);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resume.header.name} - Resume</title>
  <style>
    ${baseCSS}
    ${templateCSS}
  </style>
</head>
<body class="template-${template}">
  ${renderHeader(resume.header, template)}
  ${resume.sections_to_include?.summary ? renderSummary(resume.summary, template) : ''}
  ${resume.sections_to_include?.skills ? renderSkills(resume.skills, template) : ''}
  ${resume.sections_to_include?.experience ? renderExperience(resume.experience, template) : ''}
  ${resume.sections_to_include?.featured_project ? renderProject(resume.featured_project, template) : ''}
  ${resume.sections_to_include?.education ? renderEducation(resume.education, template) : ''}
  ${resume.sections_to_include?.certifications ? renderCertifications(resume.certifications, template) : ''}
  ${resume.sections_to_include?.recognition ? renderRecognition(resume.recognition, template) : ''}
</body>
</html>
  `;
}

function getTemplateCSS(template: string): string {
  const templates: Record<string, string> = {
    executive: `
      .template-executive .header { text-align: left; border-bottom: 3px solid #1A3A5C; }
      .template-executive h1 { color: #1A3A5C; font-size: 32px; }
      .template-executive .section-title { color: #1A3A5C; border-bottom: 2px solid #1A3A5C; }
    `,
    'modern-pro': `
      .template-modern-pro .header { text-align: center; background: linear-gradient(135deg, #6B46FE 0%, #8B5CF6 100%); color: white; padding: 30px; }
      .template-modern-pro h1 { color: white; font-size: 28px; }
      .template-modern-pro .section-title { color: #6B46FE; border-left: 4px solid #6B46FE; padding-left: 12px; }
    `,
    minimal: `
      .template-minimal .header { text-align: left; border-bottom: 1px solid #E5E7EB; }
      .template-minimal h1 { color: #000; font-size: 36px; font-weight: 300; letter-spacing: -1px; }
      .template-minimal .section-title { color: #000; font-weight: 300; font-size: 18px; text-transform: uppercase; letter-spacing: 2px; }
    `,
    'tech-stack': `
      .template-tech-stack .header { text-align: left; background: #F3F4F6; padding: 20px; border-radius: 8px; }
      .template-tech-stack h1 { color: #2563EB; font-size: 30px; font-family: 'Courier New', monospace; }
      .template-tech-stack .section-title { color: #2563EB; font-family: 'Courier New', monospace; }
    `,
    creative: `
      .template-creative .header { text-align: center; background: linear-gradient(135deg, #EC4899 0%, #F472B6 100%); color: white; padding: 40px; border-radius: 12px; }
      .template-creative h1 { color: white; font-size: 32px; }
      .template-creative .section-title { color: #EC4899; border-bottom: 3px solid #EC4899; display: inline-block; }
    `,
    academic: `
      .template-academic .header { text-align: center; border-bottom: 2px solid #1E40AF; }
      .template-academic h1 { color: #1E40AF; font-size: 28px; font-family: 'Georgia', serif; }
      .template-academic .section-title { color: #1E40AF; font-family: 'Georgia', serif; text-align: center; }
    `,
  };

  return templates[template] || templates.executive;
}
```

---

### Phase 4: Resume List Enhancements (1-2 hours)

#### 4.1 Add Template Badge to Resume Cards
**File:** `app/(tabs)/resumes.tsx` (line ~80)

```typescript
// Inside resume card mapping
<View style={styles.cardBody}>
  <View style={styles.cardContent}>
    <Text style={styles.resumeTitle}>{resume.title || 'Untitled'}</Text>
    
    {/* Add Template Badge */}
    <View style={styles.templateBadge}>
      <Grid size={12} color={Colors.primary} />
      <Text style={styles.templateBadgeText}>
        {TEMPLATES.find(t => t.id === resume.template_id)?.name || 'Default'}
      </Text>
    </View>
    
    <Text style={styles.resumeDate}>
      Edited {new Date(resume.updated_at).toLocaleDateString()}
    </Text>
  </View>
  {(resume.ats_score || resume.score) > 0 && (
    <View style={styles.scoreContainer}>
      <ScoreRing 
        score={resume.ats_score || resume.score} 
        size="md" 
        color={(resume.ats_score || resume.score) > 80 ? Colors.success : Colors.warning} 
        animate={false} 
      />
    </View>
  )}
</View>
```

**Add Styles:**
```typescript
templateBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  marginTop: 4,
  marginBottom: 4,
},
templateBadgeText: {
  ...Typography.bodySm,
  fontSize: 11,
  color: Colors.primary,
  fontWeight: '600',
},
```

---

## 📋 Testing Checklist

### Template Selection
- [ ] All 6 templates display with correct previews
- [ ] Premium badge shows on Creative & Academic templates
- [ ] ATS score badge displays correctly
- [ ] Template selection highlights correctly
- [ ] "Start Blank" creates resume with selected template
- [ ] "Generate with AI" uses selected template

### Resume Building
- [ ] All sections editable (Personal Info, Summary, Experience, Skills, Education, Certifications, Awards)
- [ ] Add/Remove functionality works for all list sections
- [ ] AI Rewrite works for summary
- [ ] Save functionality persists changes
- [ ] Preview generates correctly

### Download Functionality
- [ ] Download button appears after save
- [ ] Export modal displays both PDF and DOCX options
- [ ] PDF export works on mobile and web
- [ ] DOCX export works on web
- [ ] Downloaded files use correct template formatting
- [ ] File names include template ID
- [ ] Success notifications appear

### Template-Specific Rendering
- [ ] Executive template: Clean, left-aligned, professional
- [ ] Modern Pro template: Centered header, gradient background
- [ ] Minimal template: Whitespace-heavy, thin borders
- [ ] Tech Stack template: Monospace font, code-like styling
- [ ] Creative template: Colorful, rounded corners
- [ ] Academic template: Serif fonts, centered, formal

---

## 🚀 Deployment Steps

1. **Add Template Images**
   - Create 6 template preview images (800x1132px)
   - Place in `assets/templates/`

2. **Update Frontend**
   - Modify `app/(tabs)/new-resume.tsx` with enhanced template selection
   - Update `app/(tabs)/resumes.tsx` with template badges
   - Add export modal and download functionality

3. **Enhance Export System**
   - Update `src/lib/resumeExport.ts` with template support
   - Update `src/lib/resumeHTML.ts` with template-specific CSS

4. **Test Thoroughly**
   - Test all 6 templates
   - Test PDF and DOCX exports
   - Test on iOS, Android, and Web

5. **Deploy**
   - Build with `eas build`
   - Submit to app stores

---

## 💡 Future Enhancements

1. **Custom Templates** - Allow users to create custom templates
2. **Template Marketplace** - Community-contributed templates
3. **Live Preview** - Real-time preview while editing
4. **Template Recommendations** - AI suggests best template based on role
5. **Multi-Language Support** - Templates optimized for different languages
6. **ATS Testing** - Test resume against real ATS systems
7. **Version History** - Track changes and revert to previous versions
8. **Collaborative Editing** - Share resume for feedback

---

## 📊 Success Metrics

- **Template Usage**: Track which templates are most popular
- **Download Rate**: % of users who download after creating
- **Format Preference**: PDF vs DOCX usage
- **ATS Score Improvement**: Track score changes with template selection
- **Completion Rate**: % of users who complete resume after template selection

---

## 🔗 Related Files

- `app/(tabs)/resumes.tsx` - Resume list
- `app/(tabs)/new-resume.tsx` - Resume builder
- `src/hooks/useApi.ts` - API hooks
- `src/lib/resumeExport.ts` - Export functions
- `src/lib/resumeHTML.ts` - HTML builder
- `supabase/functions/resumes-create/index.ts` - Backend creation
- `supabase/functions/resumes-update/index.ts` - Backend updates

---

**Implementation Status**: Ready to implement  
**Estimated Time**: 8-12 hours total  
**Priority**: High (Core feature for MVP)  
**Created**: June 24, 2026
