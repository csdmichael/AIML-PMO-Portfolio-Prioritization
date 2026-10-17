msalRedirectBridge.broadcastResponseToMainFrame().catch((error) => {
  console.error('Microsoft sign-in callback failed', error);
  document.getElementById('auth-status').textContent =
    'Microsoft sign-in could not be completed. Close this window and retry sign-in. ' +
    (error instanceof Error ? error.message : String(error));
});
