import { describe, expect, it } from 'vitest';

import { renderStoryString } from './story-string';

describe('renderStoryString', () => {
  it('replaces placeholders and falls back to empty strings for missing values', () => {
    expect(
      renderStoryString('A{{known}}B{{missing}}C', {
        known: 'X',
      }),
    ).toBe('AXBC');
  });

  it('renders conditional blocks only for non-empty values', () => {
    expect(
      renderStoryString('{{#if shown}}A{{shown}}B{{/if}}{{#if hidden}}C{{hidden}}D{{/if}}', {
        shown: 'X',
        hidden: '',
      }),
    ).toBe('AXB');
  });

  it('treats false and zero as falsey in conditional blocks', () => {
    expect(
      renderStoryString(
        '{{#if enabled}}enabled{{/if}}{{#if count}}count={{count}}{{/if}}{{#if shown}}shown{{/if}}',
        {
          enabled: false,
          count: 0,
          shown: 'yes',
        },
      ),
    ).toBe('shown');
  });

  it('preserves surrounding whitespace when the template does not use trim', () => {
    expect(renderStoryString('\n  hello world  \n', {})).toBe('\n  hello world  \n');
  });

  it('removes trim markers and trims the final output', () => {
    expect(renderStoryString('  hello world  {{trim}}  ', {})).toBe('hello world');
  });

  it('treats whitespace-padded trim markers as trim tokens', () => {
    expect(renderStoryString('  hello world  {{ trim }}  ', {})).toBe('hello world');
  });

  it('trims repeated calls with the same trim template consistently', () => {
    const template = '  hello world  {{trim}}  ';

    expect(renderStoryString(template, {})).toBe('hello world');
    expect(renderStoryString(template, {})).toBe('hello world');
  });
});
