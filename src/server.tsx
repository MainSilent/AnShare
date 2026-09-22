import RNFS from 'react-native-fs';
import { BridgeServer } from 'react-native-http-bridge-refurbished';


let server : any = null
const WEB_DIR = `${RNFS.DocumentDirectoryPath}/web`;


async function copyWebFiles() {
  const exists = await RNFS.exists(WEB_DIR);

  if (exists) {
    return;
  }
  await RNFS.mkdir(WEB_DIR);

  const files = [
    'index.html',
    'tailwind.js',
  ];

  for (const file of files) {
    await RNFS.copyFileAssets(
      `web/${file}`,
      `${WEB_DIR}/${file}`
    );
  }
}


export async function startWebServer(port:number) {
  await copyWebFiles();

  server = new BridgeServer('anshare', true);

  server.get(
    '/',
    async (_req:any,res:any) => {
      const html =
        await RNFS.readFile(
          `${WEB_DIR}/index.html`,
          'utf8'
        )

      res.html(html)
    }
  )

  server.get(
    '/tailwind.js',
    async (_req:any,res:any) => {
      const js =
        await RNFS.readFile(
          `${WEB_DIR}/tailwind.js`,
          'utf8'
        )

      res.send(js)
    }
  )

  server.listen(port);

  return server;
}


export async function stopServer() {
  if (server !== null) {
    try {
      await server.stop()
    } catch (e) {
      console.log(
        "Failed to stop server:",e)
    }
    server = null
  }
}