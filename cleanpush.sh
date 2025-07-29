#!/bin/bash

# Step 1: Clear the Git index of all cached files
echo "🧹 Cleaning Git index..."
git rm -r --cached .

# Step 2: Add everything fresh
echo "➕ Adding all files..."
git add .

# Step 3: Commit changes
echo "📝 Committing..."
git commit -m "Clean push with all current files"

# Step 4: Push with force to avoid duplicates
echo "🚀 Pushing to main with --force..."
git push origin main --force

echo "✅ Clean push complete!"
