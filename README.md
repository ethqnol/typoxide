# Typst Editor

A modern, cross-platform editor for [Typst](https://typst.app/) documents built with Tauri and React.

## Features

- **Live Preview**: Real-time PDF preview with auto-zoom and fit-to-width
- **Project Management**: Create new projects or open existing ones
- **File Explorer**: Browse and manage project files with highlighting for active file
- **Keyboard Shortcuts**: `Ctrl+S`/`Cmd+S` to save
- **Dark Theme**: Modern dark interface optimized for productivity

## Getting Started

### Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm tauri dev
```

### Building

```bash
# Build for production
pnpm tauri build
```

## Usage

1. Launch the app to see the homescreen
2. **Create New Project**: Select a folder and automatically create a `main.typ` file
3. **Open Project**: Browse to an existing Typst project folder
4. Edit your Typst documents with live preview
5. Export to PDF when ready

## Requirements

- Node.js 18+
- Rust toolchain
- Platform-specific dependencies for Tauri
