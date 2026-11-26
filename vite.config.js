import { defineConfig } from "vite";
import obfuscatorPlugin from "vite-plugin-javascript-obfuscator";

export default defineConfig({
  base: "./",
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
    },
    obfuscatorPlugin({
      apply: "build",
      include: [/\.(jsx?|tsx?|cjs|mjs)$/],
      exclude: [/node_modules/],
      options: {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ["base64"],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false
      }
    })
  ]
});
