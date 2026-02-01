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
      console.log('initMicrophone: isMicrophoneSupported:', isMicrophoneSupported.value)

      if (!isMicrophoneSupported.value) {
        console.log('Microphone not supported')
        return false
      }

      if (isListening.value && audioContext.value) {
        console.log('Already listening, resuming audio context')
        if (audioContext.value.state === 'suspended') {
          await audioContext.value.resume()
        }
        return true
      }

      console.log('Requesting microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('Microphone access granted')
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
      console.log('Audio listening started')
      detectVoice()
      return true
    } catch (error) {
      console.log('Microphone error:', error)
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
    const defaultOptions = { mode: 'hold', pulseMs: 160 }
    const options =
      typeof optionsOrCallback === 'function'
        ? defaultOptions
        : { ...defaultOptions, ...(optionsOrCallback || {}) }
    const callback =
      typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback || (() => {})

    let isActive = false
    let pulseTimer = null
    const target = targetElement || document
    
    console.log('setupFallbackControls: target is', target === document ? 'document' : 'canvas')

    const setActive = (active) => {
      console.log('setActive called with:', active)
      isActive = active
      isVoiceActive.value = active
      audioLevel.value = active ? 100 : 0
      callback(active)
    }

    const triggerPulse = () => {
      console.log('triggerPulse called')
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
      console.log('onMouseDown fired')
      if (options.mode === 'tap') {
        triggerPulse()
        return
      }
      setActive(true)
    }

    const onMouseUp = () => {
      console.log('onMouseUp fired')
      if (options.mode === 'tap') return
      setActive(false)
    }

    const onTouchStart = () => {
      console.log('onTouchStart fired')
      if (options.mode === 'tap') {
        triggerPulse()
        return
      }
      setActive(true)
    }

    const onTouchEnd = () => {
      console.log('onTouchEnd fired')
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
