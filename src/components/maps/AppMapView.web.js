import React from 'react';
import { View } from 'react-native';

/** react-native-maps is native-only. Web uses the fallback UI in MapPickerScreen. */
function AppMapView({ children, style, ...rest }) {
  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}

function Marker() {
  return null;
}

export { Marker };
export default AppMapView;
