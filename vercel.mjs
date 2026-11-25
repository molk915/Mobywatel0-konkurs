if (!process.env.MOST_BACKEND_URL) throw new Error("Ustaw MOST_BACKEND_URL w zmiennych środowiskowych Vercela.");
const origin = new URL(process.env.MOST_BACKEND_URL);
if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("MOST_BACKEND_URL musi być adresem HTTPS backendu bez ścieżki.");
}

export const config = {
  framework: "vite",
  buildCommand: "npm run build",
  outputDirectory: "dist",
  rewrites: [{ source: "/api/:path*", destination: origin.origin + "/api/:path*" }],
};
