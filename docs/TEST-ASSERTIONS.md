# Test Quality Standards

## Test Assertion Requirements

This document outlines the test assertion density requirements for Nebula DNS.

### TEST-08: Multiple Assertions Per Test

**Requirement:** All tests should have more than 3 assertions to ensure thorough validation.

**Rationale:**
- Single-assertion tests often miss edge cases
- Multiple assertions verify complete behavior, not just happy path
- Makes tests more maintainable by grouping related assertions

**Implementation:**

For Jest tests, a custom matcher is available to enforce this:

```typescript
// In your test file
import '../test/custom-matchers';

describe('My Service', () => {
  it('should validate user data comprehensively', () => {
    const result = service.validateUser(userData);
    
    expect(result).toBeValid();
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toBeEmpty();
    expect(result.user.id).toBeDefined();
    expect(result.user.email).toMatch(/@/);
    // This test now has 5 assertions - exceeds the 3 minimum
  });
});
```

**Code Review Checklist:**

When reviewing PRs, verify:
- [ ] Each test has at least 4 assertions (exceeds minimum of 3)
- [ ] Assertions cover both positive and negative cases
- [ ] Edge cases are tested with appropriate assertions
- [ ] Error paths are validated with error-specific assertions

**Examples:**

✅ Good (5 assertions):
```typescript
it('should create user with all fields', () => {
  const user = userService.create(validUserData);
  
  expect(user.id).toBeDefined();
  expect(user.email).toBe(validUserData.email);
  expect(user.name).toBe(validUserData.name);
  expect(user.createdAt).toBeInstanceOf(Date);
  expect(user.status).toBe('active');
});
```

❌ Bad (1 assertion):
```typescript
it('should create user', () => {
  const user = userService.create(validUserData);
  expect(user).toBeDefined(); // Only checks existence
});
```

**Legacy Tests:**

Existing tests with fewer than 4 assertions should be enhanced when:
- Test is modified for other reasons
- Bug is discovered that could have been caught by more assertions
- During dedicated test improvement sprints

**Enforcement:**

This is currently enforced through code review. Consider adding automated enforcement:
- ESLint plugin for jest-expect
- Pre-commit hooks to count assertions
- CI check to fail on low-assertion tests
