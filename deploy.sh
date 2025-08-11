#!/bin/bash

# Get the current branch name
BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Function to handle errors
handle_error() {
  echo "Error: $1" >&2
  exit 1
}

# Check if git is installed
if ! command -v git &> /dev/null; then
  handle_error "Git is not installed. Please install git."
fi

# Check if docker compose is installed
if ! command -v docker &> /dev/null; then
  handle_error "Docker is not installed. Please install docker."
fi

if ! command -v docker compose &> /dev/null; then
  handle_error "Docker compose is not installed. Please install docker compose."
fi

# Fetch latest changes from remote
git fetch || handle_error "Failed to fetch from remote."

# Check if there are any local changes
if ! git diff --quiet; then
  echo "Local changes detected."

  # Prompt the user to stash changes
  read -p "Do you want to stash your local changes? (y/n): " stash_choice
  case "$stash_choice" in
    [yY]*)
      echo "Stashing local changes..."
      git stash push -u -m "Stash before update" || handle_error "Failed to stash changes."
      STASHED=true
      ;;
    [nN]*)
      echo "Continuing without stashing.  Local changes may be overwritten."
      STASHED=false
      ;;
    *)
      echo "Invalid input.  Continuing without stashing.  Local changes may be overwritten."
      STASHED=false
      ;;
  esac
else
  echo "No local changes detected."
  STASHED=false
fi

# Check if there are any changes between local and remote
if ! git diff --quiet HEAD origin/"$BRANCH"; then
  echo "Remote changes detected, updating..."
  git reset --hard origin/"$BRANCH" || handle_error "Failed to reset to remote."
  docker compose up -d --build || handle_error "Failed to run docker compose up."
else
  echo "No remote changes detected, skipping update."
fi

# Re-apply stashed changes if they were stashed
if [[ "$STASHED" = true ]]; then
  echo "Re-applying stashed changes..."
  git stash pop || handle_error "Failed to re-apply stashed changes. Check for conflicts."
fi

echo "Update complete."

exit 0