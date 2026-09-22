import RNFS from "react-native-fs"
import TcpSocket from "react-native-tcp-socket"
import { Buffer } from "buffer"


let server:any = null
const WEB_DIR = `${RNFS.DocumentDirectoryPath}/web`


async function copyWebFiles() {
  if (await RNFS.exists(WEB_DIR))
    return
  await RNFS.mkdir(WEB_DIR)

  for(const file of ["index.html", "tailwind.js"]) {
    await RNFS.copyFileAssets(`web/${file}`, `${WEB_DIR}/${file}`)
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



export async function startWebServer(port:number) {
  await copyWebFiles()

  server = TcpSocket.createServer((socket:any) => {
    console.log("CLIENT CONNECTED")
    socket.setKeepAlive(true)
    let request = ""

    socket.on("data", async (chunk:any) => {
        request += chunk.toString()
        if(request.includes("\r\n\r\n")){
          const firstLine = request.split("\r\n")[0]
          const parts = firstLine.split(" ")
          const url = parts[1] || "/"

          console.log("REQUEST:", url)

          await sendFile(socket, url)
        }
      }
    );

    socket.on("error", (err:any) => {
      console.log("SOCKET ERROR:", err)
    })
  });

  server.listen({ port, host:"0.0.0.0" }, () => {
    console.log(`WEB SERVER STARTED ${port}`) 
  })

  return server
}


export async function stopWebServer(){
  if (server) {
    await server.close(() => {
      server = null
    })
  }
}