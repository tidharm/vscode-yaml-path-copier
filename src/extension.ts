import * as vscode from 'vscode';
import * as YAML from 'yaml';
import * as winston from 'winston';

const EXTENSION_NAME = 'YAML Path Copier';
const EXTENSION_ID = 'yaml-path-copier';
// Command IDs
const CMD_COPY_PATH = 'copyPath';

// Config Options
const OPT_LOG_LEVEL = 'logLevel';

const DEFAULT_LOG_LEVEL = 'info';
const STATUS_MESSAGE_TIMEOUT = 2000;

const outputChannel = vscode.window.createOutputChannel(EXTENSION_NAME, { log: true });

class VSCodeTransport extends winston.transports.Console {
  log(info: winston.Logform.TransformableInfo, callback: () => void) {
    const logChannel = outputChannel as vscode.LogOutputChannel;
    const message = String(info.message);
    
    switch (info.level) {
      case 'error':
        logChannel.error(message);
        break;
      case 'warn':
        logChannel.warn(message);
        break;
      case 'info':
        logChannel.info(message);
        break;
      case 'debug':
        logChannel.debug(message);
        break;
      default:
        logChannel.appendLine(message);
    }
    callback();
  }
}

const logger = winston.createLogger({
  level: DEFAULT_LOG_LEVEL,
  format: winston.format.printf((info: winston.Logform.TransformableInfo) => {
    return String(info.message);
  }),
  transports: [
    new VSCodeTransport()
  ]
});

function getLogLevel(): string {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  return config.get<string>(OPT_LOG_LEVEL, DEFAULT_LOG_LEVEL);
}

logger.level = getLogLevel();

vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration(`${EXTENSION_ID}.${OPT_LOG_LEVEL}`)) {
    logger.level = getLogLevel();
  }
});

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(`${EXTENSION_ID}.${CMD_COPY_PATH}`, () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const position = editor.selection.active;
    const text = document.getText();

    outputChannel.clear();
    logger.info(`File: ${document.fileName}[${position.line}:${position.character}]`);

    try {
      const path = getYamlPath(text, position);
      if (path) {
        vscode.env.clipboard.writeText(path);
        vscode.window.setStatusBarMessage(`Copied: ${path}`, STATUS_MESSAGE_TIMEOUT);
        logger.info(`Copied: '${path}'`);
      } else {
        logger.error('No path found');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to parse YAML: ${errorMsg}`);
      outputChannel.show();
      vscode.window.showErrorMessage('Failed to parse YAML');
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(outputChannel);
}

function getYamlPath(text: string, position: vscode.Position): string | null {
  const doc = YAML.parseDocument(text, { keepSourceTokens: true });
  
  const offset = getOffset(text, position);
  logger.debug(`Offset: ${offset}`);
  
  const path: string[] = [];
  
  findPath(doc.contents, offset, path, 0);
  
  logger.debug(`Raw path: [${path.join(', ')}]`);
  
  if (path.length === 0) return null;
  
  const result: string[] = [];
  for (let i = 0; i < path.length; i++) {
    if (path[i].startsWith('[')) {
      result[result.length - 1] += path[i];
    } else {
      result.push(path[i]);
    }
  }
  
  const finalPath = result.join('.');
  logger.debug(`Final path: ${finalPath}`);
  
  return finalPath;
}

function findPath(node: any, offset: number, path: string[], depth: number): boolean {
  const indent = '  '.repeat(depth);
  
  if (!node) {
    logger.debug(`${indent}No node`);
    return false;
  }
  
  if (!node.range) {
    logger.debug(`${indent}No range on node`);
    return false;
  }
  
  const [start, end] = node.range;
  if (offset < start || offset > end) {
    logger.debug(`${indent}Offset ${offset} outside range [${start}, ${end}]`);
    return false;
  }
  
  logger.debug(`${indent}Checking node, offset ${offset} in range [${start}, ${end}]`);
  
  if (YAML.isMap(node)) {
    logger.debug(`${indent}Node type: Map (${node.items.length} items)`);
    for (const item of node.items) {
      const key = item.key as any;
      if (key && typeof key === 'object' && 'range' in key && 'value' in key) {
        const [keyStart, keyEnd] = key.range;
        if (offset >= keyStart && offset <= keyEnd) {
          logger.debug(`${indent}Found key: ${key.value}`);
          path.push(String(key.value));
          return true;
        }
      }
      
      const value = item.value as any;
      if (value && typeof value === 'object' && 'range' in value) {
        const [valStart, valEnd] = value.range;
        if (offset >= valStart && offset <= valEnd) {
          const keyName = key && typeof key === 'object' && 'value' in key ? String(key.value) : '?';
          logger.debug(`${indent}Found value for key: ${keyName}`);
          if (key && typeof key === 'object' && 'value' in key) {
            path.push(String(key.value));
          }
          if (YAML.isSeq(value)) {
            logger.debug(`${indent}Value is a Sequence`);
            return findPath(value, offset, path, depth + 1);
          } else {
            return findPath(value, offset, path, depth + 1);
          }
        }
      }
    }
  } else if (YAML.isSeq(node)) {
    logger.debug(`${indent}Node type: Sequence (${node.items.length} items)`);
    for (let i = 0; i < node.items.length; i++) {
      const item = node.items[i] as any;
      if (item && typeof item === 'object') {
        let shouldCheck = false;
        if ('range' in item) {
          const [itemStart, itemEnd] = item.range;
          shouldCheck = offset >= itemStart && offset <= itemEnd;
          logger.debug(`${indent}Item [${i}]: range [${itemStart}, ${itemEnd}], offset ${offset} ${shouldCheck ? 'INSIDE' : 'outside'}`);
        } else {
          shouldCheck = true;
          logger.debug(`${indent}Item [${i}]: no range, checking anyway`);
        }
        
        if (shouldCheck) {
          const testPath: string[] = [];
          const found = findPath(item, offset, testPath, depth + 1);
          if (found) {
            logger.debug(`${indent}Found match in item [${i}]`);
            path.push(`[${i}]`);
            path.push(...testPath);
            return true;
          }
        }
      }
    }
  }
  
  logger.debug(`${indent}No match found`);
  return false;
}

function getOffset(text: string, position: vscode.Position): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < position.line; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  return offset + position.character;
}
