import re
import os

file_path = r"app/(tabs)/new-resume.tsx"
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update imports
content = content.replace(
    "import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/theme';",
    "import { Typography, Spacing, Radius, Shadow, useTheme } from '../../src/theme';"
)

# Remove phosphor import
content = re.sub(
    r"import \{[^}]*\} from 'phosphor-react-native';\n?",
    "",
    content
)

# 2. Add useTheme and styles to component
content = content.replace(
    "export default function ResumeBuilderScreen() {",
    "export default function ResumeBuilderScreen() {\n  const { colors } = useTheme();\n  const styles = makeStyles(colors);"
)

# 3. Rename Colors. to colors.
content = content.replace("Colors.", "colors.")

# 4. Change styles definition
content = content.replace(
    "const styles = StyleSheet.create({",
    "const makeStyles = (colors: any) => StyleSheet.create({"
)

shapes_styles = """
  geoSquare: { width: 14, height: 14, borderRadius: 2 },
  geoCircle: { width: 14, height: 14, borderRadius: 7 },
  geoDiamond: { width: 12, height: 12, transform: [{ rotate: '45deg' }] },
"""
content = content.replace("const makeStyles = (colors: any) => StyleSheet.create({", "const makeStyles = (colors: any) => StyleSheet.create({\n" + shapes_styles)

# 5. Icon replacements
replacements = {
    r"<Trash[^>]*/>": r"<Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Delete</Text>",
    r"<ChevronDown[^>]*/>": r"<View style={{ width: 8, height: 8, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.textMuted, transform: [{ rotate: '45deg' }] }} />",
    r"<Plus[^>]*/>": r"<Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>+</Text>",
    r"<PlusCircle[^>]*/>": r"<Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>+</Text>",
    r"<X[^>]*/>": r"<Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600' }}>✕</Text>",
    r"<Check[^>]*/>": r"<Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>✓</Text>",
    r"<Save[^>]*/>": r"",  # Button already has text "Save"
    r"<Download[^>]*/>": r"", # Button already has text "Download"
    r"<Eye[^>]*/>": r"<View style={[styles.geoCircle, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Pencil[^>]*/>": r"<View style={[styles.geoSquare, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Sparkles[^>]*/>": r"<View style={[styles.geoDiamond, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Grid[^>]*/>": r"<View style={[styles.geoSquare, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<FileText[^>]*/>": r"<View style={[styles.geoSquare, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<User[^>]*/>": r"<View style={[styles.geoCircle, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Briefcase[^>]*/>": r"<View style={[styles.geoSquare, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<GraduationCap[^>]*/>": r"<View style={[styles.geoDiamond, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Lightning[^>]*/>": r"<View style={[styles.geoDiamond, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Code[^>]*/>": r"<View style={[styles.geoSquare, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Shield[^>]*/>": r"<View style={[styles.geoCircle, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Certificate[^>]*/>": r"<View style={[styles.geoDiamond, { backgroundColor: colors.primary, opacity: 0.8 }]} />",
    r"<Edit2[^>]*/>": r"<View style={[styles.geoSquare, { backgroundColor: colors.primary, opacity: 0.8 }]} />"
}

for pattern, repl in replacements.items():
    content = re.sub(pattern, repl, content)

# Clean up `<><Text style={styles.primaryBtnText}>Save</Text></>` which might happen if we replace `<Save />` with `""`
content = content.replace("<><Text", "<Text").replace("</Text></>", "</Text>")
content = content.replace("<><View", "<View").replace("</View></>", "</View>")
# Also `Sparkles` badge in Templates was yellow: `<Sparkles size={12} color="#FFD700" />`
# It became a generic diamond. Let's make sure it still works.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
