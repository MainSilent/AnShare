import RNFS from "react-native-fs"
import TcpSocket from "react-native-tcp-socket"
import { Buffer } from "buffer"


let server:any = null
const WEB_DIR = `${RNFS.DocumentDirectoryPath}/web`


async function copyWebFiles() {
    if (!(await RNFS.exists(WEB_DIR))) {
        await RNFS.mkdir(WEB_DIR)
    }

    for (const file of ["index.html", "tailwind.js"]) {
        const dest = `${WEB_DIR}/${file}`

        if (await RNFS.exists(dest)) {
            await RNFS.unlink(dest)
        }

        await RNFS.copyFileAssets(
            `web/${file}`,
            dest
        )
    }
}


function getMime(file:string) {
  if (file.endsWith(".html"))
    return "text/html"
  if (file.endsWith(".js"))
    return "application/javascript"
  if (file.endsWith(".css"))
    return "text/css"
  return "application/octet-stream"
}


async function sendJson(socket: any, data: any, status = 200) {
  const body = Buffer.from(JSON.stringify(data))

  const header =
    `HTTP/1.1 ${status} OK\r\n` +
    "Content-Type: application/json\r\n" +
    `Content-Length: ${body.length}\r\n` +
    "Connection: close\r\n" +
    "\r\n"

  socket.write(header)

  socket.write(body, () => socket.destroy())
}


async function sendFile(socket:any, url:string) {
  if (url === "/")
    url = "/index.html"

  const file = `${WEB_DIR}${url}`
  console.log("FILE:", file)

  const exists = await RNFS.exists(file)

  if (!exists) {
    const body = Buffer.from("404 Not Found")

    socket.write(
      "HTTP/1.1 404 Not Found\r\n" +
      "Content-Type: text/plain\r\n" +
      `Content-Length: ${body.length}\r\n` +
      "Connection: close\r\n" +
      "\r\n"
    )
    socket.write(
      body,
      () => { socket.destroy() }
    )
    return
  }

  const base64 = await RNFS.readFile(file, "base64")
  const body = Buffer.from(base64, "base64")

  const header =
    "HTTP/1.1 200 OK\r\n" +
    `Content-Type: ${getMime(file)}\r\n` +
    `Content-Length: ${body.length}\r\n` +
    "Cache-Control: no-cache\r\n" +
    "Connection: close\r\n" +
    "\r\n"

  console.log("SEND:", file, body.length, "bytes")

  socket.write(header)

  socket.write(body, () => {
      console.log("DONE:", file)
      socket.destroy()
    }
  )
}


async function listDir(dirPath: string) {
  const exists = await RNFS.exists(dirPath)
  if (!exists) {
    return {
      error: "Directory does not exist",
      path: dirPath
    }
  }

  const items = await RNFS.readDir(dirPath)

  return {
    path: dirPath,

    files: items.map(item => ({
      name: item.name,
      path: item.path,
      type: item.isDirectory() ? "directory" : "file",
      size: item.size
    }))
  }
}


async function receiveUpload(socket:any, url:string, body:Buffer) {
  const parsed = new URL(`http://localhost${url}`)
  const path = parsed.searchParams.get("path")

  if (!path) {
    await sendJson(socket, {error:"Missing path"} ,400)
    return
  }

  await RNFS.writeFile(path, body.toString("base64"), "base64")

  await sendJson(socket, {
    ok:true,
    path
  })
}


async function sendDownload(socket: any, url: string) {
  const parsed = new URL(`http://localhost${url}`)
  const path = parsed.searchParams.get("path")

  if (!path) {
    await sendJson(socket, { error: "Missing path parameter" }, 400)
    return
  }

  const exists = await RNFS.exists(path)

  if (!exists) {
    await sendJson(socket, { error: "File not found", path }, 404)
    return
  }

  const stat = await RNFS.stat(path)
  const fileSize = Number(stat.size)

  const fileName = path.split("/").pop() || "download"

  const header =
    "HTTP/1.1 200 OK\r\n" +
    "Content-Type: application/octet-stream\r\n" +
    `Content-Length: ${fileSize}\r\n` +
    `Content-Disposition: attachment; filename="${fileName}"\r\n` +
    "Connection: close\r\n" +
    "\r\n"

  socket.write(header)

  const CHUNK_SIZE = 64 * 1024 // 64KB
  let position = 0

  console.log("STREAM START:", path, fileSize)

  try {
    while (position < fileSize) {
      const length = Math.min(
        CHUNK_SIZE,
        fileSize - position
      )

      const base64 = await RNFS.read(path, length, position, "base64")

      const buffer = Buffer.from(base64, "base64")
      socket.write(buffer)
      position += length
    }

    console.log("STREAM DONE:", path)
  } catch (err) {
    console.log("STREAM ERROR:", err)
  }

  socket.destroy()
}


export async function startWebServer(port:number) {
  await copyWebFiles()

  server = TcpSocket.createServer((socket:any) => {
    console.log("CLIENT CONNECTED")
    socket.setKeepAlive(true)
    let uploadChunks : any[] = []

    socket.on("data", async (chunk:any) => {
      uploadChunks.push(Buffer.from(chunk))
      const raw = Buffer.concat(uploadChunks)
      const headerEnd = raw.indexOf("\r\n\r\n")

      if(headerEnd !== -1){
          const header = raw.slice(0, headerEnd).toString()
          const firstLine = header.split("\r\n")[0]
          const parts = firstLine.split(" ")
          const method = parts[0]
          const url = parts[1] || "/"

          console.log("REQUEST:", url)

          const match = header.match(/Content-Length:\s*(\d+)/i)
          const size = match ? Number(match[1]) : 0
          const body = raw.slice(headerEnd + 4)

          if(method === "POST" && url.startsWith("/api/upload")) {
            if(body.length < size)
              return
            await receiveUpload(socket, url, body)
            return
          }

          if (url.startsWith("/api/list")) {
            const parsed = new URL(`http://localhost${url}`)
            const path = parsed.searchParams.get("path")

            if (!path) {
              await sendJson(socket, { error: "Missing path parameter" }, 400)
              return
            }

            const result = await listDir(path)
            await sendJson(socket, result)

            return
          }

          if (url.startsWith("/api/download")) {
            await sendDownload(socket, url)
            return
          }

          if (url === "/") {
            socket.write(
              "HTTP/1.1 302 Found\r\n" +
              "Location: /?path=%2Fstorage%2Femulated%2F0\r\n" +
              "Content-Length: 0\r\n" +
              "Connection: close\r\n" +
              "\r\n"
            );
            socket.destroy();
            return;
          }

          const pathname = new URL(`http://localhost${url}`).pathname
          await sendFile(socket, pathname)
        }
      }
    )

    socket.on("error", (err:any) => {
      console.log("SOCKET ERROR:", err)
    })
  })

  server.listen({ port, host: "0.0.0.0" }, () => {
    console.log(`WEB SERVER STARTED ${port}`) 
  })

  return server
}


export async function stopWebServer() {
  if (server) {
    await server.close(() => { server = null })
  }
}