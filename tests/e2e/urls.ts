const offset = Number(process.env.PLAYWRIGHT_PORT_OFFSET ?? 0);
export const apiPort = String(4191 + offset);
export const devPort = String(4183 + offset);
export const previewPort = String(4184 + offset);
export const devOrigin = "http://127.0.0.1:" + devPort;
export const passkeyOrigin = "http://localhost:" + devPort;
export const previewOrigin = "http://127.0.0.1:" + previewPort;
