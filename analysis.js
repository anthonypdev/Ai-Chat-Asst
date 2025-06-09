const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// Configuration - Replace these with your actual values
const API_KEY = 'xai-LdzL1C7D5rCxkbMuQxX9wt4cdvzdifFMnz4b0awnUCxcyrYqY01dj4BCcqYGAOqyTDai7a7mNk7L5Z0K';  // Replace with your Grok API key
const API_URL = 'https://api.x.ai';  // Replace with the actual Grok API endpoint

// File types to analyze
const extensions = ['.js', '.css', '.html'];  // Add more as needed (e.g., '.jsx', '.ts')
const langMap = {
  '.js': 'javascript',
  '.css': 'css',
  '.html': 'html'
  // Add more mappings as needed
};
const excludeDirs = ['node_modules', 'dist', 'build'];  // Directories to skip

// Recursively get all files in a directory, excluding specified dirs
async function getFiles(dir, excludeDirs) {
  let files = [];
  const items = await fs.readdir(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        const subFiles = await getFiles(fullPath, excludeDirs);
        files = files.concat(subFiles);
      }
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

// Analyze a single file with the Grok API
async function analyzeFile(filePath) {
  try {
    const ext = path.extname(filePath);
    if (!extensions.includes(ext)) return null;  // Skip non-code files
    const language = langMap[ext] || 'unknown';
    const code = await fs.readFile(filePath, 'utf8');
    const response = await axios.post(API_URL, {
      language,
      code
    }, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    const issues = response.data.issues || [];
    return { file: filePath, issues };
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
}

// Main function to run the analysis
async function main() {
  const dir = process.argv[2] || '.';  // Use specified path or current directory
  console.log(`Analyzing code in ${dir}...`);
  
  // Get all files and filter for code files
  const allFiles = await getFiles(dir, excludeDirs);
  const codeFiles = allFiles.filter(file => extensions.includes(path.extname(file)));
  console.log(`Found ${codeFiles.length} code files to analyze.`);

  let totalIssues = 0;
  for (const file of codeFiles) {
    console.log(`Analyzing ${file}...`);
    const result = await analyzeFile(file);
    if (result && result.issues.length > 0) {
      console.log(`\nIssues in ${result.file}:`);
      result.issues.forEach(issue => {
        console.log(`  Line ${issue.line}: ${issue.message}`);
        totalIssues++;
      });
    }
  }
  console.log(`\nAnalysis complete. Analyzed ${codeFiles.length} files, found ${totalIssues} issues.`);
}

main().catch(error => {
  console.error('An error occurred:', error.message);
  process.exit(1);
});