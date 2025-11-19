# YAML Path Copier

A VS Code/Cursor extension that allows you to quickly copy YAML paths by right-clicking on any key or value in a YAML file.

![Demo](https://github.com/tidharm/vscode-yaml-path-copier/raw/main/assets/yaml-path-copier.gif)

## Features

- **Right-click to copy**: Simply right-click on any YAML key or value to copy its path
- **Array support**: Automatically includes array indices (e.g., `items[0].name`)
- **Multiple data types**: Works with strings, numbers, booleans, objects, and arrays
- **Status bar notification**: Shows a brief confirmation message when a path is copied
- **Debug logging**: Configurable logging levels for troubleshooting

## Installation

### From VS Code Marketplace
1. Open VS Code/Cursor
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "YAML Path Copier"
4. Click Install

### From VSIX file
1. Download the `.vsix` file from the [Releases](https://github.com/tidharm/vscode-yaml-path-copier/releases) page
2. Open VS Code/Cursor
3. Go to Extensions → ... → Install from VSIX...
4. Select the downloaded `.vsix` file

## Usage

1. Open any YAML file
2. Right-click on the key or value you want to copy
3. Select "Copy YAML Path" from the context menu
4. The path is copied to your clipboard and a confirmation appears in the status bar

## Configuration

### Log Level

You can configure the logging level in your VS Code settings:

```json
{
  "yaml-path-copier.logLevel": "info"
}
```

Options:
- `error` - Only show errors
- `info` - Show errors and info messages (default)
- `debug` - Show all messages including debug output

View logs in the Output panel: View → Output → Select "YAML Path Copier"

## Requirements

- VS Code or Cursor version 1.94.0 or higher

## Development

### Building

```bash
npm install
npm run compile
```

### Packaging

```bash
npm run package
```

### Installing Locally

```bash
# For Cursor
npm run install:cursor

# For VS Code
npm run install:vscode
```

## License

GPL-3.0-only - See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
