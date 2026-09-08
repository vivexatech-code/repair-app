function assertSecret(req) {
  const expected = process.env.NOTIFY_SECRET;
  if (!expected) {
    const err = new Error('Server misconfigured: NOTIFY_SECRET missing');
    err.statusCode = 500;
    throw err;
  }
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const fromBody = req.body?.secret;
  const fromQuery = req.query?.secret;
  const got = bearer || fromBody || fromQuery || '';
  if (!got || got !== expected) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}

module.exports = { assertSecret, readJsonBody };
