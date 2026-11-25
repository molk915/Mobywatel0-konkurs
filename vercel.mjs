const backend = process.env.MOST_BACKEND_URL;
const origin = backend ? new URL(backend) : null;
if (origin && (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash)) {
  throw new Error("MOST_BACKEND_URL musi być adresem HTTPS backendu bez ścieżki.");
}

export const config = {
  framework: "vite",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  regions: ["fra1"],
  rewrites: [{ source: "/api/:path*", destination: origin ? origin.origin + "/api/:path*" : "/api/dispatch?mostPath=:path*" }],
};
