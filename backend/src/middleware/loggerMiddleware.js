export const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  
  // Clone body to sanitize sensitive info
  const safeBody = { ...req.body };
  if (safeBody.password) safeBody.password = '[HIDDEN]';
  if (safeBody.refreshToken) safeBody.refreshToken = '[HIDDEN]';

  const hasBody = Object.keys(safeBody).length > 0;
  const hasQuery = Object.keys(req.query).length > 0;

  console.log(`\n[${timestamp}] ➡️  ${req.method} ${req.originalUrl}`);
  if (hasQuery) console.log(`  🔍 Query: ${JSON.stringify(req.query)}`);
  if (hasBody) console.log(`  📦 Body: ${JSON.stringify(safeBody)}`);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusColor = status >= 400 ? '❌' : '✅';
    console.log(`[${timestamp}] ${statusColor} ${req.method} ${req.originalUrl} - Status: ${status} (${duration}ms)`);
  });

  next();
};
