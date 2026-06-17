export function createReadOnlyPlanNotice() {
  return {
    schemaVersion: '0.1',
    mode: 'read-only',
    writeOperationsEnabled: false,
    message: 'DesignPlan write operations are intentionally disabled in v0.1.',
  };
}

