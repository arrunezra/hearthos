import React, { forwardRef } from "react";
import { KeyboardChatScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { ScrollViewProps } from "react-native";
import type { KeyboardChatScrollViewProps } from "react-native-keyboard-controller";

type Ref = React.ElementRef<typeof KeyboardChatScrollView>;

const BOTTOM_OFFSET = 8; // distance from safe area to input

const VirtualizedListScrollView = forwardRef<
    Ref,
    ScrollViewProps & KeyboardChatScrollViewProps
>(({ ...props }, ref) => {
    const { bottom } = useSafeAreaInsets();

    return (
        <KeyboardChatScrollView
            ref={ref}
            keyboardLiftBehavior="whenAtEnd"
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            keyboardDismissMode="interactive"
            offset={bottom - BOTTOM_OFFSET}
            inverted
            {...props}
        />
    );
});

export default VirtualizedListScrollView;