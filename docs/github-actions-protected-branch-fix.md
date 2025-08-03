# GitHub Actions Protected Branch Fix

## Issue
The "Release and Deploy" workflow is failing when trying to push version bumps to the protected `main` branch with error:
```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
```

## Solution Options

### Option 1: Use a Personal Access Token (Recommended)
1. Create a Personal Access Token (PAT) with `repo` scope:
   - Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name like "GitHub Actions Workflow"
   - Select the `repo` scope (full control of private repositories)
   - Generate the token and copy it

2. Add the token as a repository secret:
   - Go to your repository settings
   - Navigate to Secrets and variables > Actions
   - Click "New repository secret"
   - Name: `WORKFLOW_TOKEN`
   - Value: Paste your PAT

3. The workflow has been updated to use this token:
   ```yaml
   - uses: actions/checkout@v4
     with:
       fetch-depth: 0
       token: ${{ secrets.WORKFLOW_TOKEN || secrets.GITHUB_TOKEN }}
   ```

### Option 2: Configure Branch Protection Rules
1. Go to Settings > Branches in your repository
2. Edit the protection rule for `main`
3. Under "Allow specified actors to bypass required pull requests", add:
   - `github-actions[bot]`
   - Or create a machine user and add it here

### Option 3: Create a GitHub App
1. Create a GitHub App with write permissions
2. Install it on your repository
3. Use the app's token in the workflow

## Current Workflow Changes
The workflow has been updated to use `WORKFLOW_TOKEN` if available, falling back to `GITHUB_TOKEN`. This allows you to implement Option 1 without further code changes.

## Security Considerations
- PATs should be treated as sensitive credentials
- Use the minimum required permissions
- Rotate tokens regularly
- Consider using GitHub Apps for production environments