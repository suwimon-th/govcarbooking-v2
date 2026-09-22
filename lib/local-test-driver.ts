export const LOCAL_TEST_DRIVER = { id: 'local-test-driver', full_name: 'ทดสอบ ขับรถ' };
export function localDriverDemoAllowed(req: Request) {
  if (process.env.NODE_ENV !== 'development') return false;
  const url = new URL(req.url);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return false;
  const origin = req.headers.get('origin');
  return !origin || origin === url.origin;
}
