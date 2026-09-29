import { test } from "node:test"
import assert from "node:assert/strict"
import { normalizePlan, canSend, canAddCredential, canAddAgent, canAddWebhook } from "../src/lib/plans"

test("lowercase, uppercase and padded plan names resolve to the same plan", () => {
  for (const plan of ["pro", "PRO", " Pro "]) {
    assert.equal(normalizePlan(plan), "PRO")
    assert.equal(canAddCredential(plan, 50), true)
    assert.equal(canAddAgent(plan, 1), true)
    assert.equal(canAddWebhook(plan, 0), true)
    assert.equal(canSend(plan, 100), true)
  }
})

test("unknown or missing plans fail closed to FREE", () => {
  for (const plan of ["platinum", "", null, undefined, "constructor", "__proto__"]) {
    assert.equal(normalizePlan(plan), "FREE")
  }
  assert.match(String(canAddCredential("platinum", 3)), /limit of 3/)
  assert.match(String(canAddWebhook("platinum", 0)), /require Starter/)
  assert.match(String(canSend("platinum", 100)), /Limit of 100/)
})

test("prototype-property plan strings do not bypass limits", () => {
  for (const plan of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    assert.match(String(canAddCredential(plan, 3)), /limit of 3/)
    assert.match(String(canAddAgent(plan, 1)), /Agent limit of 1/)
    assert.match(String(canAddWebhook(plan, 0)), /require Starter/)
    assert.match(String(canSend(plan, 100)), /Limit of 100/)
  }
})

test("FREE limits still apply to FREE", () => {
  assert.match(String(canAddCredential("FREE", 3)), /limit of 3/)
  assert.equal(canAddCredential("FREE", 2), true)
  assert.match(String(canAddAgent("free", 1)), /Agent limit of 1/)
  assert.match(String(canSend("FREE", 100)), /Limit of 100/)
})

test("PRO credentials are unlimited (Onex token regression)", () => {
  assert.equal(canAddCredential("pro", 3), true)
  assert.equal(canAddCredential("pro", 1000), true)
})
