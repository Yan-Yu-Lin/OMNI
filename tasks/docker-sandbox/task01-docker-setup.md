# Task 01: Docker Setup

## Goal

Create a Dockerfile and build script for the AI sandbox image.

## What to Create

### 1. `docker/Dockerfile.sandbox`

A Docker image based on Ubuntu 24.04 that includes:
- Python 3 with pip and venv
- Node.js with npm
- git, curl, wget
- build-essential (gcc, make, etc.)
- Working directory set to `/workspace`
- Command to keep container running (e.g., `tail -f /dev/null`)

Clean up apt cache after install to reduce image size.

### 2. `docker/build.sh`

A shell script that:
- Builds the image with tag `ai-sandbox:latest`
- Uses the Dockerfile from the same directory
- Is executable (`chmod +x`)

## Context to Gather

- No existing Docker files in this project (this is new)
- Standard Dockerfile best practices apply

## Success Criteria

1. Running `./docker/build.sh` successfully builds the image
2. Running `docker run -it ai-sandbox:latest bash` drops into a working shell
3. Inside container: `python3 --version`, `node --version`, `git --version` all work
4. Image size is reasonable (~400MB-1GB)

## Notes

- Don't use Alpine (uses musl, things break)
- Ubuntu 24.04 or Debian bookworm are good base images
- The image should be suitable for general development tasks
