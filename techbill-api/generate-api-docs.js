const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, 'src', 'modules');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let docs = '# API Documentation\n\nThis document lists all the available API endpoints in the application, extracted from the controller files.\n\n';

walkDir(modulesDir, (filePath) => {
  if (filePath.endsWith('.controller.ts')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let controllerRoute = '';
    let endpoints = [];

    lines.forEach(line => {
      const controllerMatch = line.match(/@Controller\(['"](.*)['"]\)/);
      if (controllerMatch) {
        controllerRoute = controllerMatch[1];
      } else if (line.match(/@Controller\(\)/)) {
        controllerRoute = '';
      }

      const methodMatch = line.match(/@(Get|Post|Put|Patch|Delete)\(['"]?(.*?)['"]?\)/);
      if (methodMatch) {
        const method = methodMatch[1].toUpperCase();
        let route = methodMatch[2] || '';
        let fullRoute = `/${controllerRoute}${route ? (controllerRoute ? '/' : '') + route : ''}`;
        endpoints.push(`- **${method}** \`${fullRoute}\``);
      }
    });

    if (endpoints.length > 0) {
      docs += `## ${path.basename(filePath)}\n\n`;
      endpoints.forEach(ep => docs += `${ep}\n`);
      docs += '\n';
    }
  }
});

fs.writeFileSync(path.join(process.env.APPDATA || '.', '..', 'Local', 'Temp', 'api_documentation.md'), docs);
console.log(docs);
