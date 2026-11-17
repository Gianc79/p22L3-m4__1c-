import { defineConfig } from "vite";

export default defineConfig({
  server: {
    hmr: false
  },
  plugins: [
    {
      name: "disable-vite-client-ws",
      apply: "serve",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/@vite/client" || req.url?.startsWith("/@vite/client?")) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/javascript");
            res.end(
              "export const createHotContext = () => ({ accept(){}, dispose(){}, prune(){}, decline(){}, invalidate(){}, on(){}, off(){}, send(){} });\n" +
              "export const injectQuery = (id) => id;\n" +
              "export const removeStyle = () => {};\n" +
              "export const updateStyle = () => {};\n" +
              "export class ErrorOverlay {}\n"
            );
            return;
          }
          next();
        });
      }
    }
  ]
});
