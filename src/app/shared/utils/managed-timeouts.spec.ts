import { ManagedTimeouts } from './managed-timeouts';

describe('ManagedTimeouts', () => {
  let managedTimeouts: ManagedTimeouts;

  beforeEach(() => {
    jasmine.clock().install();
    managedTimeouts = new ManagedTimeouts();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('replaces an existing timeout when the same key is scheduled again', () => {
    const calls: string[] = [];

    managedTimeouts.schedule('toast', () => calls.push('first'), 1000);
    managedTimeouts.schedule('toast', () => calls.push('second'), 1000);

    jasmine.clock().tick(1000);

    expect(calls).toEqual(['second']);
  });

  it('clears all pending timeouts', () => {
    let fired = false;

    managedTimeouts.schedule('toast', () => fired = true, 1000);
    managedTimeouts.clearAll();
    jasmine.clock().tick(1000);

    expect(fired).toBeFalse();
  });
});
