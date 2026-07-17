/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import CustomShareHandler from './src/share/CustomShareHandler';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('ShareMenuReceiver', () => CustomShareHandler);