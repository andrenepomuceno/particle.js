import { describe, expect, it } from 'vitest';
import { ungroupedVariables } from '../src/ui/views/ExpressionsView';

describe('Expressions reference', () => {
  // The dialog refuses to render a variable it does not list; catch that here, not when it is opened.
  it('lists every expression variable in a group', () => {
    expect(ungroupedVariables()).toEqual([]);
  });
});
