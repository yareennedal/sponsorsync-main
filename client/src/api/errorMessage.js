/**
 * Turn an Axios rejection into something worth showing a user.
 *
 * The important case is the middle one. When a request never reaches the server
 * — the API is still booting, `node --watch` is restarting it, the browser
 * reused a socket the server just closed — Axios rejects with no `response`.
 * Every call site used to collapse that into its own domain fallback, so a dev
 * server that was not listening yet reported "تعذر تسجيل الدخول. يرجى التحقق من
 * البيانات" and sent people off to re-check credentials that were fine.
 */
export function getErrorMessage(err, fallback) {
  const serverMessage = err?.response?.data?.error?.message;
  if (serverMessage) return serverMessage;

  // No response object at all => the failure was below HTTP.
  if (err?.code === 'ERR_NETWORK' || (err?.request && !err?.response)) {
    return 'تعذّر الاتصال بالخادم. تأكد من أن الخادم يعمل، ثم أعد المحاولة.';
  }

  return fallback;
}
