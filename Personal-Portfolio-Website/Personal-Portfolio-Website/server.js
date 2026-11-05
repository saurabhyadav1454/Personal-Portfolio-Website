const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname);
const port = Number(process.env.PORT) || 8000;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  let filePath = path.resolve(root, `.${pathname}`);
  const relativePath = path.relative(root, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      response.writeHead(statError.code === "ENOENT" ? 404 : 500);
      response.end(statError.code === "ENOENT" ? "Not Found" : "Internal Server Error");
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.stat(filePath, (indexError, fileStats) => {
      if (indexError || !fileStats.isFile()) {
        response.writeHead(indexError && indexError.code === "ENOENT" ? 404 : 500);
        response.end(indexError && indexError.code === "ENOENT" ? "Not Found" : "Internal Server Error");
        return;
      }

      response.writeHead(200, {
        "Content-Length": fileStats.size,
        "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        if (!response.headersSent) {
          response.writeHead(500);
        }
        response.end("Internal Server Error");
      });
      stream.pipe(response);
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Portfolio available at http://localhost:${port}`);
});
