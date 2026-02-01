import { ref, onMounted, onUnmounted } from 'vue'

export const useAudioInput = () => {
  const isVoiceActive = ref(false)
  const audioLevel = ref(0)
  const isListening = ref(false)
  const isMicrophoneSupported = ref(false)
  const audioContext = ref(null)
  const analyser = ref(null)
  const dataArray = ref(null)
  const animationFrameId = ref(null)


  const initMicrophone = async () => {
    try {
      isMicrophoneSupported.value = !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      )

      if (!isMicrophoneSupported.value) {
        return false
      }

      if (isListening.value && audioContext.value) {
        if (audioContext.value.state === 'suspended') {
          await audioContext.value.resume()
        }
        return true
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      if (audioContext.value.state === 'suspended') {
        await audioContext.value.resume()
      }
      const source = audioContext.value.createMediaStreamSource(stream)
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 256

      source.connect(analyser.value)
      dataArray.value = new Uint8Array(analyser.value.frequencyBinCount)

      isListening.value = true
      detectVoice()
      return true
    } catch (error) {
      isMicrophoneSupported.value = false
      return false
    }
  }

  const ensureMicrophoneActive = async () => {
    return initMicrophone()
  }


  const detectVoice = () => {
    const checkAudio = () => {
      if (analyser.value && dataArray.value) {
        analyser.value.getByteFrequencyData(dataArray.value)


        let sum = 0
        for (let i = 0; i < dataArray.value.length; i++) {
          sum += dataArray.value[i]
        }
        const average = sum / dataArray.value.length

        audioLevel.value = average
        isVoiceActive.value = average > 15

        if (isListening.value) {
          animationFrameId.value = requestAnimationFrame(checkAudio)
        }
      }
    }
    checkAudio()
  }


  const setupFallbackControls = (optionsOrCallback, maybeCallback, targetElement = null) => {
    const defaultOptions = { mode: 'hold', pulseMs: 160, requireVoiceInactive: false }
    const options =
      typeof optionsOrCallback === 'function'
        ? defaultOptions
        : { ...defaultOptions, ...(optionsOrCallback || {}) }
    const callback =
      typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback || (() => {})

    let isActive = false
    let pulseTimer = null
    const target = targetElement || document

    const setActive = (active) => {
      if (active && options.requireVoiceInactive && isVoiceActive.value) {
        return
      }
      
      isActive = active
      if (!options.requireVoiceInactive) {
        isVoiceActive.value = active
      }
      audioLevel.value = active ? 100 : 0
      callback(active)
    }

    const triggerPulse = () => {
      if (pulseTimer) {
        clearTimeout(pulseTimer)
      }
      setActive(true)
      pulseTimer = setTimeout(() => {
        setActive(false)
        pulseTimer = null
      }, options.pulseMs)
    }

    const onMouseDown = () => {
      if (options.mode === 'tap') {
        triggerPulse()
        return
      }
      setActive(true)
    }

    const onMouseUp = () => {
      if (options.mode === 'tap') return
      setActive(false)
    }

    const onTouchStart = () => {
      if (options.mode === 'tap') {
        triggerPulse()
        return
      }
      setActive(true)
    }

    const onTouchEnd = () => {
      if (options.mode === 'tap') return
      setActive(false)
    }


    target.addEventListener('mousedown', onMouseDown)
    target.addEventListener('mouseup', onMouseUp)
    target.addEventListener('touchstart', onTouchStart)
    target.addEventListener('touchend', onTouchEnd)

    return () => {
      target.removeEventListener('mousedown', onMouseDown)
      target.removeEventListener('mouseup', onMouseUp)
      target.removeEventListener('touchstart', onTouchStart)
      target.removeEventListener('touchend', onTouchEnd)
      if (pulseTimer) {
        clearTimeout(pulseTimer)
        pulseTimer = null
      }
    }
  }


  const stop = () => {
    isListening.value = false
    if (animationFrameId.value) {
      cancelAnimationFrame(animationFrameId.value)
    }
    if (audioContext.value && audioContext.value.state !== 'closed') {
      audioContext.value.close()
    }
  }

  return {
    isVoiceActive,
    audioLevel,
    isListening,
    isMicrophoneSupported,
    initMicrophone,
    ensureMicrophoneActive,
    setupFallbackControls,
    stop
  }
}
