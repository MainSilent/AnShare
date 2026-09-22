import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  Text,
  Linking,
  Alert
} from 'react-native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NetworkInfo } from 'react-native-network-info';

import checkPermission from './Permission';
import { startServer } from './server';
import { isIPv4 } from './utils';

let host
const PORT = 9630

function App() {
  const [url, setURL] = useState('')
  const [server, setServer] = useState(0)
  const [ipAddress, setIpAddress] = useState("XXX.XXX.XXX.XXX")


  async function connect() {
    if (server != 0)
      return
    setServer(1)

    const ip : any = await NetworkInfo.getIPAddress()
    if (!isIPv4(ip)) {
      Alert.alert(
        'Error',
        'Internet not connected.',
        [{ text: 'OK' } ]
      )
      setIpAddress("XXX.XXX.XXX.XXX")
      setServer(0)
      return false
    }
    setIpAddress(ip)

    const perm = await checkPermission()
    if (perm === false) {
      Alert.alert(
        'File Access Required',
        'Storage permission is required to access files.',
        [{ text: 'OK' } ]
      )
      setServer(0)
      return false
    }

    const host : any = await startServer()
    if (host === false) {
      Alert.alert(
        'Error',
        'Failed to start the server',
        [{ text: 'OK' } ]
      )
      setServer(0)
      return false
    }

    setServer(2)
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle={'dark-content'} />

      <TouchableOpacity
        onPress={() => connect()}
        style={{
          ...styles.button,
          backgroundColor: server == 0 ? "green" : server == 1 ? "#bab72e" : "red"
        }}
      >
        <Text style={styles.buttonText}>
          {server == 0 ? "Connect" : server == 1 ? "Wait..." : "Disconnect"}
        </Text>
      </TouchableOpacity>

      <Text style={{...styles.ipText, marginTop: 40}}>Port: {PORT}</Text>
      <Text style={styles.ipText}>IP: {ipAddress}</Text>

      {ipAddress && server == 2 &&
        <TouchableOpacity onPress={() => Linking.openURL(url)}>
          <Text style={{...styles.urlText}}>{url}</Text>
        </TouchableOpacity>
      }
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12111c',
    alignItems: 'center',
    justifyContent: 'center'
  },
  button: {
    padding: 20,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    color: 'white',
    fontSize: 18
  },
  ipText: {
    marginTop: 15,
    color: 'white',
    fontSize: 18
  },
  urlText: {
    fontSize: 20,
    marginTop: 30,
    color: 'lightblue',
    textDecorationLine: 'underline'
  }
})

export default App
