#!/usr/bin/env node

const { execSync } = require('child_process');

/**
 * Execute git command and return output
 */
function execGit(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error(`Git command failed: ${command}`);
    return '';
  }
}

/**
 * Parse commit message to categorize changes
 */
function categorizeCommit(commit) {
  const [hash, ...messageParts] = commit.split(' ');
  const message = messageParts.join(' ');
  
  const categories = {
    'breaking': [],
    'features': [],
    'fixes': [],
    'other': []
  };
  
  if (message.toLowerCase().includes('breaking change:') || message.toLowerCase().includes('major:')) {
    return { category: 'breaking', hash, message };
  } else if (message.startsWith('feat:') || message.startsWith('feature:')) {
    return { category: 'features', hash, message };
  } else if (message.startsWith('fix:') || message.startsWith('patch:')) {
    return { category: 'fixes', hash, message };
  } else {
    return { category: 'other', hash, message };
  }
}

/**
 * Generate changelog markdown
 */
function generateChangelog(service, version, previousTag) {
  const servicePath = {
    'frontend': 'frontend/',
    'auth-service': 'services/auth-service/',
    'user-service': 'services/user-service/',
    'content-service': 'services/content-service/'
  };
  
  let changelog = `## ${service} v${version}\n\n`;
  changelog += `Release Date: ${new Date().toISOString().split('T')[0]}\n\n`;
  
  // Get commits since last tag
  let gitRange = previousTag ? `${previousTag}..HEAD` : 'HEAD';
  let gitCommand = `git log ${gitRange} --pretty=format:"%h %s" -- ${servicePath[service]}`;
  
  const commits = execGit(gitCommand).split('\n').filter(Boolean);
  
  if (commits.length === 0) {
    changelog += '### No changes\n';
    return changelog;
  }
  
  // Categorize commits
  const categorized = {
    breaking: [],
    features: [],
    fixes: [],
    other: []
  };
  
  commits.forEach(commit => {
    const { category, hash, message } = categorizeCommit(commit);
    categorized[category].push({ hash, message });
  });
  
  // Generate sections
  if (categorized.breaking.length > 0) {
    changelog += '### 🚨 Breaking Changes\n\n';
    categorized.breaking.forEach(({ hash, message }) => {
      changelog += `- ${message} (${hash})\n`;
    });
    changelog += '\n';
  }
  
  if (categorized.features.length > 0) {
    changelog += '### ✨ Features\n\n';
    categorized.features.forEach(({ hash, message }) => {
      changelog += `- ${message} (${hash})\n`;
    });
    changelog += '\n';
  }
  
  if (categorized.fixes.length > 0) {
    changelog += '### 🐛 Bug Fixes\n\n';
    categorized.fixes.forEach(({ hash, message }) => {
      changelog += `- ${message} (${hash})\n`;
    });
    changelog += '\n';
  }
  
  if (categorized.other.length > 0) {
    changelog += '### 📝 Other Changes\n\n';
    categorized.other.forEach(({ hash, message }) => {
      changelog += `- ${message} (${hash})\n`;
    });
    changelog += '\n';
  }
  
  // Add Docker image information
  changelog += '### 🐳 Docker Images\n\n';
  changelog += `- \`gcr.io/$GCP_PROJECT_ID/${service}:${version}\`\n`;
  changelog += `- \`gcr.io/$GCP_PROJECT_ID/${service}:latest\`\n`;
  
  return changelog;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node generate-changelog.js <service> <version> [previous-tag]');
    process.exit(1);
  }
  
  const [service, version, previousTag] = args;
  const validServices = ['frontend', 'auth-service', 'user-service', 'content-service'];
  
  if (!validServices.includes(service)) {
    console.error(`Invalid service: ${service}`);
    process.exit(1);
  }
  
  const changelog = generateChangelog(service, version, previousTag);
  console.log(changelog);
}

// Run main function
main();