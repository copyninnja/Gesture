import { StatusBar } from "expo-status-bar";
import { React, useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Image,
  SafeAreaView,
  LogBox,
} from "react-native";
import { Camera } from "expo-camera";
import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
import * as handpose from "@tensorflow-models/handpose";
import Canvas from "react-native-canvas";
import * as tf from "@tensorflow/tfjs";
import * as fp from "fingerpose";

const TensorCamera = cameraWithTensors(Camera);
// console.disableYellowBox = true;
LogBox.ignoreWarnings = true;
export default function App() {
  let requestAnimationFrameId = 0;
  const [tfReady, setTfReady] = useState(false);
  const [hpmReady, setHpmReady] = useState(false);
  const [startCamera, setStartCamera] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.front);
  const [handposeModel, setHandposeModel] = useState(null);
  useEffect(() => {
    return () => {
      console.log("Cancelling animation frame: ", requestAnimationFrameId);
      cancelAnimationFrame(requestAnimationFrameId);
    };
  }, [requestAnimationFrameId]);

  const tensorcam = useRef(null);
  function handleCameraStream(images, updatePreview, gl) {
    const loop = async () => {
      if (startCamera) {
        const nextImageTensor = images.next().value;
        console.log("imageAsTensors: ", JSON.stringify(nextImageTensor));
        if (nextImageTensor) {
          console.log("Calling estimateHands...");
          handposeModel
            .estimateHands(nextImageTensor)
            .then((prediction) => {
              console.log("prediction: ", JSON.stringify(prediction));
              setEmoji(null);
              if (prediction && prediction.length > 0) {
                const GE = new fp.GestureEstimator([
                  fp.Gestures.ThumbsUpGesture,
                ]);
                const gesture = GE.estimate(prediction[0].landmarks, 7.5);
                console.log("Gesture: ", gesture);
                if (
                  gesture.gestures !== undefined &&
                  gesture.gestures.length > 0
                ) {
                  const confidence = gesture.gestures.map(
                    (prediction) => prediction.confidence
                  );
                  const mxConfidence = confidence.indexOf(
                    Math.max.apply(null, confidence)
                  );
                  const emojiName = gesture.gestures[mxConfidence].name;
                  console.log("emoji name: ", emojiName);
                  setEmoji(emojiName);
                }
              }
              console.log("Looping...");
              requestAnimationFrameId = requestAnimationFrame(loop);
            })
            .catch((e1) => {
              console.error("Prediction error", e1.message, e1.stack);
            });
        }
      }
    };
    loop();
  }
  const runHandpose = async () => {
    console.log("Initializing...");
    tf.ready()
      .then(() => {
        console.log(tf.getBackend());
        setTfReady(true);

        handpose
          .load()
          .then((model) => {
            console.log("hand pose model: ", model);
            setHandposeModel(model);
            setHpmReady(true);

            console.log("Tf and handpose model initialized");
          })
          .catch((e2) => {
            console.error("Hand pose model load error", e2.message, e2.stack);
          });
      })
      .catch((e1) => {
        console.error("TF init error", e1.message, e1.stack);
      });
    //  Loop and detect hands
    // setInterval(() => {
    //   detect(net);
    // }, 100);
  };
  runHandpose();

  const __startCamera = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    console.log(status);
    if (status === "granted") {
      setStartCamera(true);
    } else {
      Alert.alert("Access denied");
    }
  };
  const __switchCamera = () => {
    if (cameraType === "back") {
      setCameraType("front");
    } else {
      setCameraType("back");
    }
  };
  const handleCanvas = (canvas) => {
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "purple";
    ctx.fillRect(0, 0, 100, 100);
  };
  return (
    <SafeAreaView style={styles.container}>
      {startCamera ? (
        <View
          style={{
            width: "100%",
            height: "100%",
            flex: 1,
          }}
        >
          {hpmReady && tfReady ? (
            <TensorCamera
              ref={tensorcam}
              // Standard Camera props
              style={styles.camera}
              type={cameraType}
              onReady={handleCameraStream}
              autorender={true}
              isImageMirror={true}
            ></TensorCamera>
          ) : (
            <Text style={{ top: 200 }}>{"Initializing..."}</Text>
          )}
          <Canvas style={styles.canvas} />
          <View
            style={{
              position: "absolute",
              zIndex: 10,
              left: "5%",
              top: "10%",
            }}
          >
            <TouchableOpacity
              onPress={__switchCamera}
              style={{
                marginTop: 20,
                borderRadius: "50%",
                height: 25,
                width: 25,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                }}
              >
                {cameraType !== "back" ? "📷" : "🤳"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: "#fff",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={__startCamera}
            style={{
              width: 130,
              borderRadius: 4,
              backgroundColor: "#14274e",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              height: 40,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Take picture
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    position: "absolute",
    marginLeft: "auto",
    marginRight: "auto",
    left: 0,
    right: 0,
    textAlign: "center",
    zindex: 9,
    width: 480,
    height: 640,
  },
  canvas: {
    position: "absolute",
    marginLeft: "auto",
    marginRight: "auto",
    left: 0,
    right: 0,
    textAlign: "center",
    zindex: 10,
    width: 480,
    height: 640,
  },
});

const CameraPreview = ({ photo }) => {
  console.log("sdsfds", photo);
  return (
    <View
      style={{
        backgroundColor: "transparent",
        flex: 1,
        width: "100%",
        height: "100%",
      }}
    ></View>
  );
};
