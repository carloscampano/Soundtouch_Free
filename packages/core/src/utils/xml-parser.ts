import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: false,
};

const parser = new XMLParser(parserOptions);
const builder = new XMLBuilder(builderOptions);

export function parseXml<T>(xml: string): T {
  return parser.parse(xml) as T;
}

export function buildXml(obj: object): string {
  return builder.build(obj);
}

// Helper to safely get nested values
export function getNestedValue<T>(obj: unknown, path: string): T | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as T;
}

// Helper to get text content from XML node
export function getTextContent(node: unknown): string {
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node === 'number') {
    return String(node);
  }
  if (node && typeof node === 'object' && '#text' in node) {
    return String((node as { '#text': unknown })['#text']);
  }
  return '';
}

// Helper to get attribute value
export function getAttribute(node: unknown, attr: string): string | undefined {
  if (node && typeof node === 'object') {
    const key = `@_${attr}`;
    if (key in node) {
      return String((node as Record<string, unknown>)[key]);
    }
  }
  return undefined;
}
