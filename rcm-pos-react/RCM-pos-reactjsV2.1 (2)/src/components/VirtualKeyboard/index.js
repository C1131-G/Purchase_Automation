import React, { useRef, useState } from "react";
import Keyboard from "react-simple-keyboard";

// Instead of the default import, you can also use this:
// import { KeyboardReact as Keyboard } from "react-simple-keyboard";

import "react-simple-keyboard/build/css/index.css";
import "./styles.css";

export function VirtualKeyboard() {
  const [input, setInput] = useState("");
  const [layout, setLayout] = useState("default");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const keyboard = useRef();

  const onChange = (input) => {
    setInput(input);
    console.log("Input changed", input);
  };

  const toggleKeyboard = () => {
    setIsKeyboardOpen((isKeyboardOpen) => !isKeyboardOpen);
  };

  const handleOpenKeyboard = () => {
    setIsKeyboardOpen(true);
  };

  const handleCloseKeyboard = () => {
    setIsKeyboardOpen(false);
  };

  const handleShift = () => {
    const newLayoutName = layout === "shift" ? "default" : "shift";
    //"default" ? "shift" : "default";
    setLayout(newLayoutName);
  };

  const handleCaps = () => {
    const newLayoutName = layout === "caps" ? "default" : "caps";
    setLayout(newLayoutName);
  };

  const onKeyPress = (button) => {
    console.log("Button pressed", button);
    /**
     * Shift functionality
     */
    if (button === "{shift}") handleShift();

    /**
     * Caps functionality
     */
    if (button === "{lock}") handleCaps();
  };

  const onChangeInput = (event) => {
    const input = event.target.value;
    setInput(input);
    keyboard.current.setInput(input);
  };

  return (
    <>
      <input
        value={input}
        placeholder={"Tap on the virtual keyboard to start"}
        onChange={onChangeInput}
        onFocus={handleOpenKeyboard}
        // onBlur={handleCloseKeyboard}
      />
      <div className="virtualKeyboard">
        <div className={`keyboardContainer ${!isKeyboardOpen ? "hidden" : ""}`}>
          <Keyboard
            keyboardRef={(r) => (keyboard.current = r)}
            layoutName={layout}
            onChange={onChange}
            onKeyPress={onKeyPress}
            layout={{
              default: [
                "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                "{tab} q w e r t y u i o p [ ] \\",
                "{lock} a s d f g h j k l ; ' {enter}",
                "{shift} z x c v b n m , . / {shift}",
                ".com @ {space}",
              ],
              shift: [
                "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
                "{tab} Q W E R T Y U I O P { } |",
                '{lock} A S D F G H J K L : " {enter}',
                "{shift} Z X C V B N M < > ? {shift}",
                ".com @ {space}",
              ],
              caps: [
                "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                "{tab} Q W E R T Y U I O P [ ] \\",
                "{lock} A S D F G H J K L ; ' {enter}",
                "{shift} Z X C V B N M , . / {shift}",
                ".com @ {space}",
              ],
            }}
          />
        </div>
        <button className="closeBtn" onClick={() => handleCloseKeyboard()}>
          Close
        </button>
      </div>
    </>
  );
}
