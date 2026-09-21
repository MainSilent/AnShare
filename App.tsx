import React, { useEffect } from 'react';
import {
  StatusBar,
  useColorScheme,
  StyleSheet,
  TouchableOpacity,
  Text,
  Linking
} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';


function App() {
  const isDarkMode = useColorScheme() === 'dark'

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      <TouchableOpacity
        // onPress={() => connect()}
        style={{
          ...styles.button,
          // backgroundColor: server == 0 ? "green" : server == 1 ? "#bab72e" : "red"
        }}
      >
        <Text style={styles.buttonText}>
          {/* {server == 0 ? "Connect" : server == 1 ? "Wait..." : "Disconnect"} */}
        </Text>
      </TouchableOpacity>

      {/* <Text style={{...styles.ipText, marginTop: 40}}>Port: {PORT}</Text> */}
      {/* <Text style={styles.ipText}>IP: {isWifi ? details.ipAddress : "XXX.XXX.XXX.XXX"}</Text> */}

      {/* {isWifi && server == 2 &&
        <TouchableOpacity onPress={() => Linking.openURL(url)}>
          <Text style={{...styles.urlText}}>{url}</Text>
        </TouchableOpacity>
      } */}
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
