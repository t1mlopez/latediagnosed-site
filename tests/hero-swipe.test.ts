import assert from 'node:assert/strict';
import test from 'node:test';
import { swipeDirection } from '../src/lib/home/swipe.ts';
test('horizontal swipes move slides in the expected direction', () => {
  assert.equal(swipeDirection({x:200,y:200},{x:100,y:205}),1);
  assert.equal(swipeDirection({x:100,y:200},{x:200,y:205}),-1);
});
test('vertical gestures and short movements leave the slide alone', () => {
  assert.equal(swipeDirection({x:200,y:200},{x:190,y:100}),0);
  assert.equal(swipeDirection({x:200,y:200},{x:160,y:205}),0);
  assert.equal(swipeDirection({x:200,y:200},{x:100,y:100}),0);
});
