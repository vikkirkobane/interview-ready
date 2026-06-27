const fs = require('fs');
const path = require('path');

const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
const subDirs = fs.readdirSync(functionsDir).filter(d => fs.statSync(path.join(functionsDir, d)).isDirectory());

const ignoreDirs = ['_shared', 'answer-question'];
let endpointsMapped = [];

for (const dir of subDirs) {
  if (ignoreDirs.includes(dir)) continue;

  const dirPath = path.join(functionsDir, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.ts'));

  for (const file of files) {
    const baseName = file.replace('.ts', '');
    const newDirName = baseName === 'index' ? dir : `${dir}-${baseName}`;
    const newDirPath = path.join(functionsDir, newDirName);
    
    if (!fs.existsSync(newDirPath)) {
      fs.mkdirSync(newDirPath, { recursive: true });
    }

    const oldFilePath = path.join(dirPath, file);
    const newFilePath = path.join(newDirPath, 'index.ts');

    let content = fs.readFileSync(oldFilePath, 'utf8');

    if (!content.includes('npm:hono@4.0.0/cors')) {
      content = content.replace(/import \{ Hono \} from 'npm:hono@4\.0\.0';/, 
        "import { Hono } from 'npm:hono@4.0.0';\nimport { cors } from 'npm:hono@4.0.0/cors';"
      );
    }

    if (!content.includes('app.use(')) {
      content = content.replace(/const app = new Hono\(\);/, 
        "const app = new Hono();\n\napp.use('/*', cors());"
      );
    }

    content = content.replace(/app\.post\(['"]\/['"],/g, "app.post('/*',");
    content = content.replace(/app\.get\(['"]\/['"],/g, "app.get('/*',");
    content = content.replace(/app\.delete\(['"]\/['"],/g, "app.delete('/*',");
    content = content.replace(/app\.put\(['"]\/['"],/g, "app.put('/*',");
    content = content.replace(/app\.patch\(['"]\/['"],/g, "app.patch('/*',");

    fs.writeFileSync(newFilePath, content);
    
    endpointsMapped.push({ old: `${dir}/${baseName}`, new: newDirName });

    fs.unlinkSync(oldFilePath);
    console.log(`Refactored ${dir}/${file} -> ${newDirName}/index.ts`);
  }
  
  if (fs.readdirSync(dirPath).length === 0) {
    fs.rmdirSync(dirPath);
  }
}

fs.writeFileSync('mappings.json', JSON.stringify(endpointsMapped, null, 2));
console.log('Done refactoring directories.');
