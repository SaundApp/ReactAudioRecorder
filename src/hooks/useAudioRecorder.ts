import { useState, useCallback } from "react";

export interface recorderControls {
  startRecording: () => void;
  stopRecording: () => void;
  recordingBlob?: Blob;
  isRecording: boolean;
  recordingTime: number;
}

/**
 * @returns Controls for the recording. Details of returned controls are given below
 *
 * @param `onNotAllowedOrFound`: A method that gets called when the getUserMedia promise is rejected. It receives the DOMException as its input.
 *
 * @details `startRecording`: Calling this method would result in the recording to start. Sets `isRecording` to true
 * @details `stopRecording`: This results in a recording in progress being stopped and the resulting audio being present in `recordingBlob`. Sets `isRecording` to false
 * @details `recordingBlob`: This is the recording blob that is created after `stopRecording` has been called
 * @details `isRecording`: A boolean value that represents whether a recording is currently in progress
 * @details `recordingTime`: Number of seconds that the recording has gone on. This is updated every second
 */
const useAudioRecorder: (
  onNotAllowedOrFound?: (exception: CaptureError) => void
) => recorderControls = (onNotAllowedOrFound) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout>();
  const [recordingBlob, setRecordingBlob] = useState<Blob>();

  const _startTimer: () => void = useCallback(() => {
    const interval = setInterval(() => {
      setRecordingTime((time) => time + 1);
    }, 1000);
    setTimerInterval(interval);
  }, [setRecordingTime, setTimerInterval]);

  const _stopTimer: () => void = useCallback(() => {
    timerInterval != null && clearInterval(timerInterval);
    setTimerInterval(undefined);
  }, [timerInterval, setTimerInterval]);

  /**
   * Calling this method would result in the recording to start. Sets `isRecording` to true
   */
  const startRecording: () => void = useCallback(() => {
    if (timerInterval != null) return;

    navigator.device.capture.captureAudio(
      (files) => {
        const file = files[0];
        const path = file.fullPath;

        const reader = new FileReader();
        reader.onloadend = () => {
          const blob = new Blob(
            [new Uint8Array(reader.result as ArrayBuffer)],
            {
              type: "audio/wav",
            }
          );
          setRecordingBlob(blob);
        };

        fetch(path).then((response) => {
          response.blob().then((blob) => {
            reader.readAsArrayBuffer(blob);
          });
        });

        setIsRecording(false);
        _stopTimer();
        setRecordingTime(0);
        return;
      },
      (err) => {
        console.log(err.message);
        onNotAllowedOrFound?.(err);
      }
    );

    setIsRecording(true);
    _startTimer();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    timerInterval,
    setIsRecording,
    _startTimer,
    setRecordingBlob,
    onNotAllowedOrFound,
  ]);

  /**
   * Calling this method results in a recording in progress being stopped and the resulting audio being present in `recordingBlob`. Sets `isRecording` to false
   */
  const stopRecording: () => void = useCallback(() => {
    _stopTimer();
    setRecordingTime(0);
    setIsRecording(false);
  }, [setRecordingTime, setIsRecording, _stopTimer]);

  return {
    startRecording,
    stopRecording,
    recordingBlob,
    isRecording,
    recordingTime,
  };
};

export default useAudioRecorder;
